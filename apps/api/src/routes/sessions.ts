import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { parseOrReply } from '../lib/validation';

const idParamsSchema = z.object({ id: z.string().uuid() });
const sessionBlockParamsSchema = z.object({ sessionId: z.string().uuid() });
const blockParamsSchema = z.object({ sessionId: z.string().uuid(), blockId: z.string().uuid() });

const createSessionSchema = z.object({
  plan_id: z.string().uuid(),
  athlete_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  type: z.enum(['swim', 'bike', 'run', 'strength', 'rest', 'other']),
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  duration_min: z.number().int().positive().nullable().optional(),
  tss: z.number().nullable().optional(),
  status: z.enum(['scheduled', 'completed', 'missed', 'skipped']).optional().default('scheduled'),
});

const updateSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['swim', 'bike', 'run', 'strength', 'rest', 'other']).optional(),
  title: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  duration_min: z.number().int().positive().nullable().optional(),
  tss: z.number().nullable().optional(),
  status: z.enum(['scheduled', 'completed', 'missed', 'skipped']).optional(),
  position: z.number().int().min(0).optional(),
});

const reorderSchema = z.object({
  block_ids: z.array(z.string().uuid()).min(1),
});

const addBlockSchema = z.object({
  type: z.enum(['warmup', 'interval', 'steady', 'cooldown', 'rest', 'note']),
  description: z.string().trim().min(1),
  duration_min: z.number().int().positive().nullable().optional(),
  distance_m: z.number().int().positive().nullable().optional(),
  intensity: z.string().nullable().optional(),
  reps: z.number().int().positive().nullable().optional(),
});

const updateBlockSchema = addBlockSchema.partial();

export async function sessionRoutes(app: FastifyInstance) {
  // GET /sessions/:id
  app.get('/sessions/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(idParamsSchema, req.params, reply);
    if (!parsedParams) return;

    const { data, error } = await supabase
      .from('sessions')
      .select('*, blocks:workout_blocks(*)')
      .eq('id', parsedParams.id)
      .eq('coach_id', coachId)
      .single();

    if (error || !data) return reply.code(404).send({ success: false, error: { message: 'Not found' } });

    const sorted = { ...data, blocks: (data.blocks ?? []).sort((a: any, b: any) => a.position - b.position) };
    return reply.send({ success: true, data: sorted });
  });

  // POST /sessions
  app.post('/sessions', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedBody = parseOrReply(createSessionSchema, req.body, reply);
    if (!parsedBody) return;

    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', parsedBody.athlete_id)
      .eq('date', parsedBody.date);

    const { data, error } = await supabase
      .from('sessions')
      .insert({ ...parsedBody, coach_id: coachId, position: count ?? 0 })
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.code(201).send({ success: true, data: { ...data, blocks: [] } });
  });

  // PATCH /sessions/:id
  app.patch('/sessions/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(idParamsSchema, req.params, reply);
    const parsedBody = parseOrReply(updateSessionSchema, req.body, reply);
    if (!parsedParams || !parsedBody) return;

    const { data, error } = await supabase
      .from('sessions')
      .update({ ...parsedBody, updated_at: new Date().toISOString() })
      .eq('id', parsedParams.id)
      .eq('coach_id', coachId)
      .select('*, blocks:workout_blocks(*)')
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    if (!data) return reply.code(404).send({ success: false, error: { message: 'Not found' } });
    return reply.send({ success: true, data });
  });

  // DELETE /sessions/:id
  app.delete('/sessions/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(idParamsSchema, req.params, reply);
    if (!parsedParams) return;

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', parsedParams.id)
      .eq('coach_id', coachId);

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: { deleted: true } });
  });

  // POST /sessions/:sessionId/blocks/reorder
  app.post('/sessions/:sessionId/blocks/reorder', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(sessionBlockParamsSchema, req.params, reply);
    const parsedBody = parseOrReply(reorderSchema, req.body, reply);
    if (!parsedParams || !parsedBody) return;

    const { data: session } = await supabase
      .from('sessions').select('id').eq('id', parsedParams.sessionId).eq('coach_id', coachId).single();
    if (!session) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    await Promise.all(
      parsedBody.block_ids.map((blockId, index) =>
        supabase.from('workout_blocks').update({ position: index }).eq('id', blockId).eq('session_id', parsedParams.sessionId)
      )
    );

    return reply.send({ success: true, data: { reordered: true } });
  });

  // POST /sessions/:sessionId/blocks
  app.post('/sessions/:sessionId/blocks', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(sessionBlockParamsSchema, req.params, reply);
    const parsedBody = parseOrReply(addBlockSchema, req.body, reply);
    if (!parsedParams || !parsedBody) return;

    const { data: session } = await supabase
      .from('sessions').select('id').eq('id', parsedParams.sessionId).eq('coach_id', coachId).single();
    if (!session) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const { count } = await supabase
      .from('workout_blocks').select('*', { count: 'exact', head: true }).eq('session_id', parsedParams.sessionId);

    const { data, error } = await supabase
      .from('workout_blocks')
      .insert({ ...parsedBody, session_id: parsedParams.sessionId, position: count ?? 0 })
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.code(201).send({ success: true, data });
  });

  // PATCH /sessions/:sessionId/blocks/:blockId
  app.patch('/sessions/:sessionId/blocks/:blockId', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(blockParamsSchema, req.params, reply);
    const parsedBody = parseOrReply(updateBlockSchema, req.body, reply);
    if (!parsedParams || !parsedBody) return;

    const { data: session } = await supabase
      .from('sessions').select('id').eq('id', parsedParams.sessionId).eq('coach_id', coachId).single();
    if (!session) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const { data, error } = await supabase
      .from('workout_blocks')
      .update(parsedBody)
      .eq('id', parsedParams.blockId)
      .eq('session_id', parsedParams.sessionId)
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    if (!data) return reply.code(404).send({ success: false, error: { message: 'Block not found' } });
    return reply.send({ success: true, data });
  });

  // DELETE /sessions/:sessionId/blocks/:blockId
  app.delete('/sessions/:sessionId/blocks/:blockId', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const parsedParams = parseOrReply(blockParamsSchema, req.params, reply);
    if (!parsedParams) return;

    const { data: session } = await supabase
      .from('sessions').select('id').eq('id', parsedParams.sessionId).eq('coach_id', coachId).single();
    if (!session) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const { error } = await supabase
      .from('workout_blocks').delete().eq('id', parsedParams.blockId).eq('session_id', parsedParams.sessionId);

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: { deleted: true } });
  });
}
