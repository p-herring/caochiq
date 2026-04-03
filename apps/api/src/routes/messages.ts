import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { parseOrReply } from '../lib/validation';

const querySchema = z.object({
  with: z.string().uuid(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const createMessageSchema = z.object({
  recipient_id: z.string().uuid(),
  body: z.string().min(1),
});

export async function messageRoutes(app: FastifyInstance) {
  // GET /messages?with=userId  — full thread
  app.get('/messages', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).userId;
    const parsedQuery = parseOrReply(querySchema, req.query, reply);
    if (!parsedQuery) return;
    const withId = parsedQuery.with;

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
    const parsedBody = parseOrReply(createMessageSchema, req.body, reply);
    if (!parsedBody) return;
    const { recipient_id, body } = parsedBody;

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
    const parsedParams = parseOrReply(paramsSchema, req.params, reply);
    if (!parsedParams) return;

    const { data, error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', parsedParams.id)
      .eq('recipient_id', userId)
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });
    if (!data) return reply.code(404).send({ success: false, error: { message: 'Message not found' } });
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
