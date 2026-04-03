import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { parseOrReply } from '../lib/validation';

const idParamsSchema = z.object({ id: z.string().uuid() });
const weekParamsSchema = z.object({ id: z.string().uuid(), weekNumber: z.string().regex(/^\d+$/) });

const planQuerySchema = z.object({
  athlete_id: z.string().uuid().optional(),
});

const createPlanSchema = z.object({
  athlete_id: z.string().uuid(),
  name: z.string().trim().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

const updatePlanSchema = z.object({
  name: z.string().trim().min(1).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  is_active: z.boolean().optional(),
});

const weekBodySchema = z.object({
  phase: z.enum(['base', 'build', 'peak', 'taper', 'race', 'recovery']).nullable().optional(),
  tss_target: z.number().nullable().optional(),
  hours_target: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function planRoutes(app: FastifyInstance) {
  // POST /plans
  app.post('/plans', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const body = parseOrReply(createPlanSchema, req.body, reply);
    if (!body) return;

    if (body.is_active) {
      await supabase
        .from('training_plans')
        .update({ is_active: false })
        .eq('athlete_id', body.athlete_id)
        .eq('coach_id', coachId);
    }

    const { data, error } = await supabase
      .from('training_plans')
      .insert({ ...body, coach_id: coachId })
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.code(201).send({ success: true, data });
  });

  // GET /plans?athlete_id=xxx
  app.get('/plans', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedQuery = parseOrReply(planQuerySchema, req.query, reply);
    if (!parsedQuery) return;

    let query = supabase
      .from('training_plans')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (parsedQuery.athlete_id) query = query.eq('athlete_id', parsedQuery.athlete_id);

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: data ?? null });
  });

  // GET /plans/:id
  app.get('/plans/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(idParamsSchema, req.params, reply);
    if (!parsedParams) return;

    const { data: plan, error } = await supabase
      .from('training_plans')
      .select('*')
      .eq('id', parsedParams.id)
      .eq('coach_id', coachId)
      .single();

    if (error || !plan) return reply.code(404).send({ success: false, error: { message: 'Not found' } });

    const { data: sessions } = await supabase
      .from('sessions')
      .select('*, blocks:workout_blocks(*)')
      .eq('plan_id', parsedParams.id)
      .order('date')
      .order('position');

    return reply.send({ success: true, data: { ...plan, sessions: sessions ?? [] } });
  });

  // PATCH /plans/:id
  app.patch('/plans/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(idParamsSchema, req.params, reply);
    const parsedBody = parseOrReply(updatePlanSchema, req.body, reply);
    if (!parsedParams || !parsedBody) return;

    const { data, error } = await supabase
      .from('training_plans')
      .update({ ...parsedBody, updated_at: new Date().toISOString() })
      .eq('id', parsedParams.id)
      .eq('coach_id', coachId)
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    if (!data) return reply.code(404).send({ success: false, error: { message: 'Not found' } });
    return reply.send({ success: true, data });
  });

  // GET /plans/:id/weeks
  app.get('/plans/:id/weeks', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(idParamsSchema, req.params, reply);
    if (!parsedParams) return;

    const { data: plan } = await supabase
      .from('training_plans')
      .select('*')
      .eq('id', parsedParams.id)
      .eq('coach_id', coachId)
      .single();
    if (!plan) return reply.code(404).send({ success: false, error: { message: 'Not found' } });

    const [{ data: sessions }, { data: weekMeta }] = await Promise.all([
      supabase.from('sessions').select('date, type, duration_min, tss, status').eq('plan_id', parsedParams.id).order('date'),
      supabase.from('plan_weeks').select('*').eq('plan_id', parsedParams.id),
    ]);

    const planStart = getMondayOf(new Date(plan.start_date));
    const planEnd = plan.end_date
      ? new Date(plan.end_date)
      : (() => { const d = new Date(); d.setDate(d.getDate() + 52 * 7); return d; })();

    const weeks: any[] = [];
    const cursor = new Date(planStart);
    let weekNumber = 1;

    while (cursor <= planEnd) {
      const weekStartStr = cursor.toISOString().split('T')[0]!;
      const endCursor = new Date(cursor);
      endCursor.setDate(endCursor.getDate() + 6);
      const weekEndStr = endCursor.toISOString().split('T')[0]!;

      const ws = (sessions ?? []).filter((s: any) => s.date >= weekStartStr && s.date <= weekEndStr);
      const meta = (weekMeta ?? []).find((m: any) => m.week_number === weekNumber);
      const typeMap: Record<string, number> = {};
      let actualTss = 0, actualMins = 0;
      for (const s of ws) {
        typeMap[s.type] = (typeMap[s.type] ?? 0) + 1;
        actualTss += s.tss ?? 0;
        actualMins += s.duration_min ?? 0;
      }

      weeks.push({
        id: meta?.id ?? null,
        plan_id: parsedParams.id,
        week_number: weekNumber,
        week_start: weekStartStr,
        week_end: weekEndStr,
        phase: meta?.phase ?? null,
        tss_target: meta?.tss_target ?? null,
        hours_target: meta?.hours_target ?? null,
        notes: meta?.notes ?? null,
        session_count: ws.length,
        session_types: Object.entries(typeMap).map(([type, count]) => ({ type, count })),
        actual_tss: actualTss,
        actual_hours: Math.round((actualMins / 60) * 10) / 10,
      });

      cursor.setDate(cursor.getDate() + 7);
      weekNumber++;
    }

    return reply.send({ success: true, data: weeks });
  });

  // PUT /plans/:id/weeks/:weekNumber
  app.put('/plans/:id/weeks/:weekNumber', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(weekParamsSchema, req.params, reply);
    const parsedBody = parseOrReply(weekBodySchema, req.body, reply);
    if (!parsedParams || !parsedBody) return;

    const { data: plan } = await supabase
      .from('training_plans')
      .select('id, start_date')
      .eq('id', parsedParams.id)
      .eq('coach_id', coachId)
      .single();
    if (!plan) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const planStart = getMondayOf(new Date(plan.start_date));
    planStart.setDate(planStart.getDate() + (Number(parsedParams.weekNumber) - 1) * 7);
    const weekStartStr = planStart.toISOString().split('T')[0]!;

    const { data, error } = await supabase
      .from('plan_weeks')
      .upsert(
        { plan_id: parsedParams.id, week_number: Number(parsedParams.weekNumber), week_start: weekStartStr, ...parsedBody },
        { onConflict: 'plan_id,week_number' }
      )
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data });
  });

  // DELETE /plans/:id
  app.delete('/plans/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(idParamsSchema, req.params, reply);
    if (!parsedParams) return;

    const { error } = await supabase
      .from('training_plans')
      .delete()
      .eq('id', parsedParams.id)
      .eq('coach_id', coachId);

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: { deleted: true } });
  });
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
