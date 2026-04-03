import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';

export async function sessionRoutes(app: FastifyInstance) {
  // GET /sessions/:id
  app.get('/sessions/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { data, error } = await supabase
      .from('sessions')
      .select('*, blocks:workout_blocks(*)')
      .eq('id', id)
      .eq('coach_id', coachId)
      .single();

    if (error || !data) return reply.code(404).send({ success: false, error: { message: 'Not found' } });

    const sorted = { ...data, blocks: (data.blocks ?? []).sort((a: any, b: any) => a.position - b.position) };
    return reply.send({ success: true, data: sorted });
  });

  // POST /sessions
  app.post('/sessions', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const body = req.body as any;

    // Determine next position for this date
    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', body.athlete_id)
      .eq('date', body.date);

    const { data, error } = await supabase
      .from('sessions')
      .insert({ ...body, coach_id: coachId, position: count ?? 0 })
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.code(201).send({ success: true, data: { ...data, blocks: [] } });
  });

  // PATCH /sessions/:id
  app.patch('/sessions/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };
    const body = req.body as any;

    const { data, error } = await supabase
      .from('sessions')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('coach_id', coachId)
      .select('*, blocks:workout_blocks(*)')
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data });
  });

  // DELETE /sessions/:id
  app.delete('/sessions/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
      .eq('coach_id', coachId);

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: { deleted: true } });
  });

  // POST /sessions/:id/blocks/reorder
  app.post('/sessions/:sessionId/blocks/reorder', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { sessionId } = req.params as { sessionId: string };
    const { block_ids } = req.body as { block_ids: string[] };

    // Verify ownership
    const { data: session } = await supabase
      .from('sessions').select('id').eq('id', sessionId).eq('coach_id', coachId).single();
    if (!session) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    await Promise.all(
      block_ids.map((blockId, index) =>
        supabase.from('workout_blocks').update({ position: index }).eq('id', blockId).eq('session_id', sessionId)
      )
    );

    return reply.send({ success: true, data: { reordered: true } });
  });

  // POST /sessions/:id/blocks
  app.post('/sessions/:sessionId/blocks', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { sessionId } = req.params as { sessionId: string };
    const body = req.body as any;

    const { data: session } = await supabase
      .from('sessions').select('id').eq('id', sessionId).eq('coach_id', coachId).single();
    if (!session) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const { count } = await supabase
      .from('workout_blocks').select('*', { count: 'exact', head: true }).eq('session_id', sessionId);

    const { data, error } = await supabase
      .from('workout_blocks')
      .insert({ ...body, session_id: sessionId, position: count ?? 0 })
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.code(201).send({ success: true, data });
  });

  // PATCH /sessions/:id/blocks/:blockId
  app.patch('/sessions/:sessionId/blocks/:blockId', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { sessionId, blockId } = req.params as { sessionId: string; blockId: string };
    const body = req.body as any;

    const { data: session } = await supabase
      .from('sessions').select('id').eq('id', sessionId).eq('coach_id', coachId).single();
    if (!session) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const { data, error } = await supabase
      .from('workout_blocks').update(body).eq('id', blockId).eq('session_id', sessionId).select().single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data });
  });

  // DELETE /sessions/:id/blocks/:blockId
  app.delete('/sessions/:sessionId/blocks/:blockId', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { sessionId, blockId } = req.params as { sessionId: string; blockId: string };

    const { data: session } = await supabase
      .from('sessions').select('id').eq('id', sessionId).eq('coach_id', coachId).single();
    if (!session) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const { error } = await supabase
      .from('workout_blocks').delete().eq('id', blockId).eq('session_id', sessionId);

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: { deleted: true } });
  });
}
