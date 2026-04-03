import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';

export async function athleteRoutes(app: FastifyInstance) {
  // GET /athletes
  app.get('/athletes', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;

    const { data: athletes, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('coach_id', coachId)
      .order('full_name');

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    if (!athletes.length) return reply.send({ success: true, data: [] });

    const athleteIds = athletes.map((a: any) => a.id);

    // Fetch related data in parallel via separate queries (avoids schema cache relationship issues)
    const [
      { data: profiles },
      { data: races },
    ] = await Promise.all([
      supabase.from('athlete_profiles').select('*').in('athlete_id', athleteIds),
      supabase.from('races').select('id, athlete_id, name, event_date, distance, priority').in('athlete_id', athleteIds),
    ]);

    // Enrich with compliance + flags
    const enriched = await Promise.all(athletes.map(async (a: any) => {
      const compliance7d = await getCompliance7d(a.id);
      const { count: flagCount } = await supabase
        .from('insights')
        .select('*', { count: 'exact', head: true })
        .eq('athlete_id', a.id)
        .eq('dismissed', false);

      const athleteRaces = (races ?? []).filter((r: any) => r.athlete_id === a.id);
      const upcomingRaces = athleteRaces
        .filter((r: any) => new Date(r.event_date) >= new Date())
        .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

      return {
        ...a,
        profile: (profiles ?? []).find((p: any) => p.athlete_id === a.id) ?? null,
        next_race: upcomingRaces[0] ?? null,
        compliance_7d: compliance7d,
        active_flags: flagCount ?? 0,
      };
    }));

    return reply.send({ success: true, data: enriched });
  });

  // GET /athletes/search — unassigned athletes matching a query (coach_id IS NULL)
  app.get('/athletes/search', { preHandler: authenticate }, async (req, reply) => {
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length < 1) return reply.send({ success: true, data: [] });

    const term = `%${q.trim()}%`;
    const { data, error } = await supabase
      .from('athletes')
      .select('id, full_name, email')
      .is('coach_id', null)
      .or(`full_name.ilike.${term},email.ilike.${term}`)
      .limit(10);

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: data ?? [] });
  });

  // PATCH /athletes/:id/assign — claim an unassigned athlete
  app.patch('/athletes/:id/assign', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    // Only allow claiming athletes with no coach
    const { data: existing } = await supabase
      .from('athletes')
      .select('id, coach_id')
      .eq('id', id)
      .single();

    if (!existing) return reply.code(404).send({ success: false, error: { message: 'Athlete not found' } });
    if (existing.coach_id) return reply.code(409).send({ success: false, error: { message: 'Athlete already has a coach' } });

    const { data, error } = await supabase
      .from('athletes')
      .update({ coach_id: coachId })
      .eq('id', id)
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data });
  });

  // GET /athletes/:id
  app.get('/athletes/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { data: athlete, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', id)
      .eq('coach_id', coachId)
      .single();

    if (error || !athlete) return reply.code(404).send({ success: false, error: { message: 'Not found' } });

    const [{ data: profileRows }, { data: races }, compliance7d, { count: flagCount }] = await Promise.all([
      supabase.from('athlete_profiles').select('*').eq('athlete_id', id),
      supabase.from('races').select('*').eq('athlete_id', id),
      getCompliance7d(id),
      supabase.from('insights').select('*', { count: 'exact', head: true }).eq('athlete_id', id).eq('dismissed', false),
    ]);

    const upcomingRaces = (races || [])
      .filter((r: any) => new Date(r.event_date) >= new Date())
      .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

    return reply.send({
      success: true,
      data: {
        ...athlete,
        profile: profileRows?.[0] ?? null,
        races: races ?? [],
        next_race: upcomingRaces[0] ?? null,
        compliance_7d: compliance7d,
        active_flags: flagCount ?? 0,
      },
    });
  });

  // PATCH /athletes/:id/profile
  app.patch('/athletes/:id/profile', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };
    const body = req.body as any;

    // Verify ownership
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('id', id)
      .eq('coach_id', coachId)
      .single();
    if (!athlete) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const { data, error } = await supabase
      .from('athlete_profiles')
      .upsert({ athlete_id: id, ...body, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data });
  });

  // GET /athletes/:id/sessions
  app.get('/athletes/:id/sessions', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };
    const { week } = req.query as { week?: string };

    let query = supabase
      .from('sessions')
      .select(`*, blocks:workout_blocks(*)`)
      .eq('athlete_id', id)
      .eq('coach_id', coachId)
      .order('date')
      .order('position');

    if (week) {
      const start = new Date(week);
      const end = new Date(week);
      end.setDate(end.getDate() + 6);
      query = query.gte('date', start.toISOString().split('T')[0]!).lte('date', end.toISOString().split('T')[0]!);
    }

    const { data, error } = await query;
    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: data ?? [] });
  });

  // GET /athletes/:id/compliance
  app.get('/athletes/:id/compliance', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { data: athlete } = await supabase.from('athletes').select('id').eq('id', id).eq('coach_id', coachId).single();
    if (!athlete) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const { data: sessions } = await supabase
      .from('sessions')
      .select('date, status')
      .eq('athlete_id', id)
      .order('date');

    const compliance = computeCompliance(sessions ?? []);
    return reply.send({ success: true, data: { athlete_id: id, ...compliance } });
  });

  // GET /athletes/:id/insights
  app.get('/athletes/:id/insights', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .eq('athlete_id', id)
      .eq('coach_id', coachId)
      .eq('dismissed', false)
      .order('created_at', { ascending: false });

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: data ?? [] });
  });

  // GET /athletes/:id/races
  app.get('/athletes/:id/races', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { data: athlete } = await supabase.from('athletes').select('id').eq('id', id).eq('coach_id', coachId).single();
    if (!athlete) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const { data, error } = await supabase
      .from('races')
      .select('*')
      .eq('athlete_id', id)
      .order('event_date');

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: data ?? [] });
  });

  // GET /athletes/:id/logs
  app.get('/athletes/:id/logs', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };
    const { from, to } = req.query as { from?: string; to?: string };

    const { data: athlete } = await supabase.from('athletes').select('id').eq('id', id).eq('coach_id', coachId).single();
    if (!athlete) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    let query = supabase.from('workout_logs').select('*').eq('athlete_id', id).order('date', { ascending: false });
    if (from) query = query.gte('date', from);
    if (to)   query = query.lte('date', to);

    const { data, error } = await query.limit(50);
    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: data ?? [] });
  });

  // POST /athletes — creates athlete record + Supabase auth user (invite email sent)
  app.post('/athletes', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { full_name, email, ...rest } = req.body as any;

    // Create auth user and send invite email
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role: 'athlete', full_name },
    });

    let userId: string | null = null;

    if (authError) {
      // If email already exists in auth, find and link the existing user
      if (authError.code === 'email_exists' || authError.message?.toLowerCase().includes('already')) {
        const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const existing = list?.users.find((u) => u.email === email);
        if (existing) userId = existing.id;
      } else {
        return reply.code(500).send({ success: false, error: { message: authError.message } });
      }
    } else {
      userId = authData.user.id;
    }

    const { data, error } = await supabase
      .from('athletes')
      .insert({ ...rest, full_name, email, coach_id: coachId, user_id: userId })
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.code(201).send({ success: true, data });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCompliance7d(athleteId: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data } = await supabase
    .from('sessions')
    .select('status')
    .eq('athlete_id', athleteId)
    .gte('date', since.toISOString().split('T')[0]!);

  if (!data || data.length === 0) return 0;
  const scheduled = data.length;
  const completed = data.filter((s: any) => s.status === 'completed').length;
  return Math.round((completed / scheduled) * 100);
}

function computeCompliance(sessions: { date: string; status: string }[]) {
  const weeks: Map<string, { scheduled: number; completed: number }> = new Map();

  for (const s of sessions) {
    const d = new Date(s.date);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const key = monday.toISOString().split('T')[0]!;

    if (!weeks.has(key)) weeks.set(key, { scheduled: 0, completed: 0 });
    const w = weeks.get(key)!;
    w.scheduled++;
    if (s.status === 'completed') w.completed++;
  }

  const weekArray = Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week_start, w]) => {
      const d = new Date(week_start);
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return { week_start, label, ...w, pct: w.scheduled ? Math.round((w.completed / w.scheduled) * 100) : 0 };
    });

  const total = sessions.length;
  const totalCompleted = sessions.filter(s => s.status === 'completed').length;

  const last7 = sessions.filter(s => {
    const d = new Date(s.date);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    return d >= cutoff;
  });
  const last30 = sessions.filter(s => {
    const d = new Date(s.date);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    return d >= cutoff;
  });

  const pct = (arr: typeof sessions) => arr.length
    ? Math.round((arr.filter(s => s.status === 'completed').length / arr.length) * 100)
    : 0;

  return {
    last_7d_pct: pct(last7),
    last_30d_pct: pct(last30),
    all_time_pct: total ? Math.round((totalCompleted / total) * 100) : 0,
    weeks: weekArray,
  };
}
