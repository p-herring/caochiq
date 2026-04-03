import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';

export async function messageRoutes(app: FastifyInstance) {
  // GET /messages?with=userId  — full thread
  app.get('/messages', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).userId;
    const { with: withId } = req.query as { with?: string };

    if (!withId) return reply.code(400).send({ success: false, error: { message: 'with param required' } });

    // Resolve: withId may be an athlete row id — look up their auth user_id
    const { data: athleteRow } = await supabase
      .from('athletes')
      .select('user_id')
      .eq('id', withId)
      .maybeSingle();
    const resolvedWithId = athleteRow?.user_id ?? withId;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${resolvedWithId}),and(sender_id.eq.${resolvedWithId},recipient_id.eq.${userId})`
      )
      .order('created_at');

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });

    // Mark received messages as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', resolvedWithId)
      .eq('recipient_id', userId)
      .eq('read', false);

    return reply.send({ success: true, data: data ?? [] });
  });

  // POST /messages
  app.post('/messages', { preHandler: authenticate }, async (req, reply) => {
    const senderId = (req as any).userId;
    const { recipient_id, body } = req.body as { recipient_id: string; body: string };

    if (!recipient_id || !body?.trim()) {
      return reply.code(400).send({ success: false, error: { message: 'recipient_id and body required' } });
    }

    // Resolve recipient: if athlete, use their user_id; otherwise send directly
    const { data: athlete } = await supabase
      .from('athletes')
      .select('user_id')
      .eq('id', recipient_id)
      .maybeSingle();

    const actualRecipient = athlete?.user_id ?? recipient_id;

    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: senderId, recipient_id: actualRecipient, body: body.trim() })
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.code(201).send({ success: true, data });
  });

  // PATCH /messages/:id/read
  app.patch('/messages/:id/read', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { data, error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', id)
      .eq('recipient_id', userId)
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data });
  });

  // GET /messages/unread-count
  app.get('/messages/unread-count', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).userId;

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read', false);

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    return reply.send({ success: true, data: { count: count ?? 0 } });
  });
}
