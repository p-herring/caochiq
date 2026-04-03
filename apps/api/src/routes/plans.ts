import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';

export async function planRoutes(app: FastifyInstance) {
  // POST /plans
  app.post('/plans', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const body = req.body as any;

    // If is_active, deactivate other plans for this athlete
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

  // GET /plans?athlete_id=xxx  (returns active plan)
  app.get('/plans', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { athlete_id } = req.query as { athlete_id?: string };

    let query = supabase
      .from('training_plans')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (athlete_id) query = query.eq('athlete_id', athlete_id);

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: data ?? null });
  });

  // GET /plans/:id
  app.get('/plans/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { data: plan, error } = await supabase
      .from('training_plans')
      .select('*')
      .eq('id', id)
      .eq('coach_id', coachId)
      .single();

    if (error || !plan) return reply.code(404).send({ success: false, error: { message: 'Not found' } });

    const { data: sessions } = await supabase
      .from('sessions')
      .select('*, blocks:workout_blocks(*)')
      .eq('plan_id', id)
      .order('date')
      .order('position');

    return reply.send({ success: true, data: { ...plan, sessions: sessions ?? [] } });
  });

  // PATCH /plans/:id
  app.patch('/plans/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };
    const body = req.body as any;

    const { data, error } = await supabase
      .from('training_plans')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('coach_id', coachId)
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data });
  });

  // DELETE /plans/:id
  app.delete('/plans/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { error } = await supabase
      .from('training_plans')
      .delete()
      .eq('id', id)
      .eq('coach_id', coachId);

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: { deleted: true } });
  });
}
