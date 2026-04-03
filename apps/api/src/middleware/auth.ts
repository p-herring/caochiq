import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase';

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return reply.code(401).send({ success: false, error: { message: 'Missing token' } });
  }
  const token = auth.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return reply.code(401).send({ success: false, error: { message: 'Invalid token' } });
  }
  (req as any).userId = data.user.id;
  (req as any).userEmail = data.user.email;
}
