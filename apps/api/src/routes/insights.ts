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
}
