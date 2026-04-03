import { FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';

export function parseOrReply<T>(
  schema: ZodSchema<T>,
  value: unknown,
  reply: FastifyReply
): T | undefined {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    reply.code(400).send({
      success: false,
      error: {
        message: parsed.error.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`).join('; '),
      },
    });
    return undefined;
  }
  return parsed.data;
}
