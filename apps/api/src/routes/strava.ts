import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import axios from 'axios';

const STRAVA_CLIENT_ID     = process.env['STRAVA_CLIENT_ID']!;
const STRAVA_CLIENT_SECRET = process.env['STRAVA_CLIENT_SECRET']!;
const STRAVA_REDIRECT_URI  = process.env['STRAVA_REDIRECT_URI']!;
const FRONTEND_URL         = process.env['FRONTEND_URL']!;

export async function stravaRoutes(app: FastifyInstance) {

  // GET /integrations/status  — per-athlete status for all coach's athletes
  app.get('/integrations/status', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;

    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, full_name')
      .eq('coach_id', coachId);

    if (!athletes?.length) return reply.send({ success: true, data: [] });

    const { data: integrations } = await supabase
      .from('strava_integrations')
      .select('athlete_id, strava_athlete_id, updated_at')
      .in('athlete_id', athletes.map((a: any) => a.id));

    const result = athletes.map((a: any) => {
      const integration = integrations?.find((i: any) => i.athlete_id === a.id);
      return {
        athlete_id: a.id,
        athlete_name: a.full_name,
        strava: {
          connected: !!integration,
          strava_athlete_id: integration?.strava_athlete_id ?? null,
          last_sync: integration?.updated_at ?? null,
        },
      };
    });

    return reply.send({ success: true, data: result });
  });

  // GET /integrations/strava/connect?athlete_id=xxx  — generate OAuth URL
  app.get('/integrations/strava/connect', { preHandler: authenticate }, async (req, reply) => {
    const { athlete_id } = req.query as { athlete_id?: string };

    const params = new URLSearchParams({
      client_id:     STRAVA_CLIENT_ID,
      redirect_uri:  STRAVA_REDIRECT_URI,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'read,activity:read_all',
      state: athlete_id ?? '',
    });

    return reply.send({
      success: true,
      data: { url: `https://www.strava.com/oauth/authorize?${params}` },
    });
  });

  // GET /integrations/strava/callback  — OAuth callback from Strava
  app.get('/integrations/strava/callback', async (req, reply) => {
    const { code, state: athleteId, error } = req.query as {
      code?: string; state?: string; error?: string;
    };

    if (error || !code) {
      return reply.redirect(`${FRONTEND_URL}/athletes?strava=error`);
    }

    try {
      const tokenRes = await axios.post('https://www.strava.com/oauth/token', {
        client_id:     STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_at, athlete } = tokenRes.data;

      await supabase.from('strava_integrations').upsert({
        athlete_id:         athleteId,
        strava_athlete_id:  String(athlete.id),
        access_token,
        refresh_token,
        expires_at,
        scope: 'read,activity:read_all',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'athlete_id' });

      return reply.redirect(`${FRONTEND_URL}/athletes/${athleteId}?strava=connected`);
    } catch (e) {
      console.error('Strava OAuth error:', e);
      return reply.redirect(`${FRONTEND_URL}/athletes?strava=error`);
    }
  });

  // DELETE /integrations/strava?athlete_id=xxx
  app.delete('/integrations/strava', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { athlete_id } = req.query as { athlete_id?: string };

    if (!athlete_id) return reply.code(400).send({ success: false, error: { message: 'athlete_id required' } });

    // Verify ownership
    const { data: athlete } = await supabase
      .from('athletes').select('id').eq('id', athlete_id).eq('coach_id', coachId).single();
    if (!athlete) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    await supabase.from('strava_integrations').delete().eq('athlete_id', athlete_id);
    return reply.send({ success: true, data: { disconnected: true } });
  });

  // POST /integrations/strava/sync?athlete_id=xxx
  app.post('/integrations/strava/sync', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { athlete_id } = req.query as { athlete_id?: string };

    if (!athlete_id) return reply.code(400).send({ success: false, error: { message: 'athlete_id required' } });

    const { data: athlete } = await supabase
      .from('athletes').select('id').eq('id', athlete_id).eq('coach_id', coachId).single();
    if (!athlete) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const { data: integration } = await supabase
      .from('strava_integrations')
      .select('*')
      .eq('athlete_id', athlete_id)
      .single();

    if (!integration) return reply.code(404).send({ success: false, error: { message: 'Strava not connected' } });

    const token = await getValidToken(integration);
    const synced = await syncActivities(athlete_id, token);

    // Update last sync time
    await supabase.from('strava_integrations')
      .update({ updated_at: new Date().toISOString() })
      .eq('athlete_id', athlete_id);

    return reply.send({ success: true, data: { synced_count: synced } });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getValidToken(integration: any): Promise<string> {
  if (Date.now() / 1000 < integration.expires_at - 300) {
    return integration.access_token;
  }

  // Refresh token
  const res = await axios.post('https://www.strava.com/oauth/token', {
    client_id:     STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    refresh_token: integration.refresh_token,
    grant_type:    'refresh_token',
  });

  const { access_token, refresh_token, expires_at } = res.data;

  await supabase.from('strava_integrations').update({
    access_token, refresh_token, expires_at,
    updated_at: new Date().toISOString(),
  }).eq('athlete_id', integration.athlete_id);

  return access_token;
}

async function syncActivities(athleteId: string, token: string): Promise<number> {
  // Get last synced activity date
  const { data: lastLog } = await supabase
    .from('workout_logs')
    .select('created_at')
    .eq('athlete_id', athleteId)
    .eq('source', 'strava')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const after = lastLog
    ? Math.floor(new Date(lastLog.created_at).getTime() / 1000)
    : Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 90; // 90 days default

  const res = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
    headers: { Authorization: `Bearer ${token}` },
    params: { after, per_page: 100 },
  });

  const activities: any[] = res.data;
  if (!activities.length) return 0;

  const logs = activities.map((a) => ({
    athlete_id:         athleteId,
    date:               a.start_date_local.split('T')[0],
    type:               mapStravaType(a.type),
    session_name:       a.name,
    duration_min:       Math.round(a.moving_time / 60),
    distance_m:         Math.round(a.distance),
    avg_hr:             a.average_heartrate ? Math.round(a.average_heartrate) : null,
    max_hr:             a.max_heartrate ? Math.round(a.max_heartrate) : null,
    avg_power:          a.average_watts ? Math.round(a.average_watts) : null,
    normalized_power:   a.weighted_average_watts ? Math.round(a.weighted_average_watts) : null,
    status:             'completed',
    source:             'strava',
    strava_activity_id: String(a.id),
  }));

  // Upsert to avoid duplicates
  const { data, error } = await supabase
    .from('workout_logs')
    .upsert(logs, { onConflict: 'strava_activity_id', ignoreDuplicates: true })
    .select();

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

function mapStravaType(type: string): string {
  const map: Record<string, string> = {
    Run: 'run', Ride: 'bike', VirtualRide: 'bike', Swim: 'swim',
    WeightTraining: 'strength', Workout: 'strength', Walk: 'run',
  };
  return map[type] ?? 'other';
}
