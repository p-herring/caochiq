import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';

const sortBlocks = (t: any) => ({
  ...t,
  blocks: (t.blocks ?? []).sort((a: any, b: any) => a.position - b.position),
});

export async function templateRoutes(app: FastifyInstance) {
  // GET /templates — own templates + shared from other coaches
  app.get('/templates', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;

    const [{ data: own, error: e1 }, { data: shared, error: e2 }] = await Promise.all([
      supabase
        .from('workout_templates')
        .select('*, blocks:template_blocks(*)')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false }),
      supabase
        .from('workout_templates')
        .select('*, blocks:template_blocks(*)')
        .eq('is_shared', true)
        .neq('coach_id', coachId)
        .order('created_at', { ascending: false }),
    ]);

    if (e1 || e2) return reply.code(500).send({ success: false, error: { message: (e1 ?? e2)!.message } });

    return reply.send({
      success: true,
      data: {
        own: (own ?? []).map(sortBlocks),
        shared: (shared ?? []).map(sortBlocks),
      },
    });
  });

  // POST /templates — create a new template with blocks
  app.post('/templates', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { blocks = [], ...rest } = req.body as any;

    const { data: tmpl, error } = await supabase
      .from('workout_templates')
      .insert({ ...rest, coach_id: coachId })
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });

    if (blocks.length) {
      const rows = blocks.map((b: any, i: number) => ({ ...b, template_id: tmpl.id, position: i }));
      await supabase.from('template_blocks').insert(rows);
    }

    const { data: full } = await supabase
      .from('workout_templates')
      .select('*, blocks:template_blocks(*)')
      .eq('id', tmpl.id)
      .single();

    return reply.code(201).send({ success: true, data: sortBlocks(full) });
  });

  // PATCH /templates/:id — update template and optionally replace blocks
  app.patch('/templates/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };
    const { blocks, ...rest } = req.body as any;

    const { data: existing } = await supabase
      .from('workout_templates')
      .select('id')
      .eq('id', id)
      .eq('coach_id', coachId)
      .single();
    if (!existing) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    const { error } = await supabase
      .from('workout_templates')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });

    if (blocks !== undefined) {
      await supabase.from('template_blocks').delete().eq('template_id', id);
      if (blocks.length) {
        const rows = blocks.map((b: any, i: number) => ({ ...b, template_id: id, position: i }));
        await supabase.from('template_blocks').insert(rows);
      }
    }

    const { data: full } = await supabase
      .from('workout_templates')
      .select('*, blocks:template_blocks(*)')
      .eq('id', id)
      .single();

    return reply.send({ success: true, data: sortBlocks(full) });
  });

  // DELETE /templates/:id
  app.delete('/templates/:id', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { data: existing } = await supabase
      .from('workout_templates')
      .select('id')
      .eq('id', id)
      .eq('coach_id', coachId)
      .single();
    if (!existing) return reply.code(403).send({ success: false, error: { message: 'Forbidden' } });

    await supabase.from('workout_templates').delete().eq('id', id);
    return reply.send({ success: true, data: { deleted: true } });
  });

  // POST /templates/:id/copy — copy a shared template into your own
  app.post('/templates/:id/copy', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const { id } = req.params as { id: string };

    const { data: source } = await supabase
      .from('workout_templates')
      .select('*, blocks:template_blocks(*)')
      .eq('id', id)
      .eq('is_shared', true)
      .single();

    if (!source) return reply.code(404).send({ success: false, error: { message: 'Template not found or not shared' } });

    const { data: copy, error } = await supabase
      .from('workout_templates')
      .insert({
        coach_id: coachId,
        name: `${source.name} (copy)`,
        description: source.description,
        type: source.type,
        duration_min: source.duration_min,
        tss: source.tss,
        is_shared: false,
      })
      .select()
      .single();

    if (error) return reply.code(500).send({ success: false, error: { message: error.message } });

    if (source.blocks?.length) {
      const rows = source.blocks.map((b: any, i: number) => ({
        template_id: copy.id,
        position: i,
        type: b.type,
        description: b.description,
        duration_min: b.duration_min,
        distance_m: b.distance_m,
        intensity: b.intensity,
        reps: b.reps,
      }));
      await supabase.from('template_blocks').insert(rows);
    }

    const { data: full } = await supabase
      .from('workout_templates')
      .select('*, blocks:template_blocks(*)')
      .eq('id', copy.id)
      .single();

    return reply.code(201).send({ success: true, data: sortBlocks(full) });
  });
}
