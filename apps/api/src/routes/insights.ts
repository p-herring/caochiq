import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';

export async function insightRoutes(app: FastifyInstance) {
  // GET /insights?athlete_id=xxx
  app.get('/insights', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { athlete_id } = req.query as { athlete_id?: string };

    let query = supabase
      .from('insights')
      .select('*')
      .eq('coach_id', coachId)
      .eq('dismissed', false)
      .order('created_at', { ascending: false });

    if (athlete_id) query = query.eq('athlete_id', athlete_id);

    const { data, error } = await query.limit(50);
    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: data ?? [] });
  });

  // POST /insights/:id/dismiss
  app.post('/insights/:id/dismiss', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { data, error } = await supabase
      .from('insights')
      .update({ dismissed: true })
      .eq('id', id)
      .eq('coach_id', coachId)
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data });
  });
}
