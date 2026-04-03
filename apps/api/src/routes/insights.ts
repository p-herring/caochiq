import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { parseOrReply } from '../lib/validation';

const querySchema = z.object({
  athlete_id: z.string().uuid().optional(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function insightRoutes(app: FastifyInstance) {
  // GET /insights
  app.get('/insights', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedQuery = parseOrReply(querySchema, req.query, reply);
    if (!parsedQuery) return;

    let query = supabase
      .from('insights')
      .select('*')
      .eq('coach_id', coachId)
      .eq('dismissed', false)
      .order('created_at', { ascending: false });

    if (parsedQuery.athlete_id) query = query.eq('athlete_id', parsedQuery.athlete_id);

    const { data, error } = await query.limit(50);
    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });

    return reply.send({ success: true, data: data ?? [] });
  });

  // POST /insights/:id/dismiss
  app.post('/insights/:id/dismiss', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(paramsSchema, req.params, reply);
    if (!parsedParams) return;

    const { data, error } = await supabase
      .from('insights')
      .update({ dismissed: true })
      .eq('id', parsedParams.id)
      .eq('coach_id', coachId)
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    if (!data) return reply.code(404).send({ success: false, error: { message: 'Insight not found' } });

    return reply.send({ success: true, data });
  });

  // POST /insights/generate — rule-based engine, safe to call on demand
  app.post('/insights/generate', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;

    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, full_name')
      .eq('coach_id', coachId);

    if (!athletes?.length) return reply.send({ success: true, data: { generated: 0 } });

    const athleteIds = athletes.map((a: any) => a.id);
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = since.toISOString().split('T')[0]!;

    const [{ data: sessions }, { data: logs }, { data: existing }] = await Promise.all([
      supabase
        .from('sessions')
        .select('athlete_id, status, date')
        .in('athlete_id', athleteIds)
        .gte('date', sinceStr),
      supabase
        .from('workout_logs')
        .select('athlete_id, created_at')
        .in('athlete_id', athleteIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('insights')
        .select('athlete_id, type')
        .in('athlete_id', athleteIds)
        .eq('coach_id', coachId)
        .eq('dismissed', false),
    ]);

    const newInsights: any[] = [];

    for (const athlete of athletes as any[]) {
      const athleteSessions = (sessions ?? []).filter((s: any) => s.athlete_id === athlete.id);
      const athleteLogs = (logs ?? []).filter((l: any) => l.athlete_id === athlete.id);
      const existingTypes = new Set(
        (existing ?? []).filter((e: any) => e.athlete_id === athlete.id).map((e: any) => e.type)
      );

      // Rule 1: Low compliance in last 7 days
      if (athleteSessions.length >= 3 && !existingTypes.has('compliance')) {
        const completed = athleteSessions.filter((s: any) => s.status === 'completed').length;
        const pct = Math.round((completed / athleteSessions.length) * 100);
        if (pct < 60) {
          newInsights.push({
            athlete_id: athlete.id,
            coach_id: coachId,
            type: 'compliance',
            severity: pct < 33 ? 'critical' : 'warning',
            message: `${athlete.full_name} completed ${pct}% of sessions in the last 7 days (${completed}/${athleteSessions.length}).`,
            dismissed: false,
          });
        }
      }

      // Rule 2: Multiple missed sessions
      const missed = athleteSessions.filter((s: any) => s.status === 'missed').length;
      if (missed >= 2 && !existingTypes.has('missed_sessions')) {
        newInsights.push({
          athlete_id: athlete.id,
          coach_id: coachId,
          type: 'missed_sessions',
          severity: missed >= 4 ? 'critical' : 'warning',
          message: `${athlete.full_name} has missed ${missed} sessions this week.`,
          dismissed: false,
        });
      }

      // Rule 3: Long gap since last logged workout
      const lastLog = athleteLogs[0] as any;
      if (!existingTypes.has('fatigue') && lastLog) {
        const daysSince = Math.floor(
          (Date.now() - new Date(lastLog.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince >= 10) {
          newInsights.push({
            athlete_id: athlete.id,
            coach_id: coachId,
            type: 'fatigue',
            severity: 'info',
            message: `${athlete.full_name} has not logged a workout in ${daysSince} days.`,
            dismissed: false,
          });
        }
      }
    }

    if (newInsights.length > 0) {
      await supabase.from('insights').insert(newInsights);
    }

    return reply.send({ success: true, data: { generated: newInsights.length } });
  });
}
