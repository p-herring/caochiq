import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';

export async function todayRoutes(app: FastifyInstance) {
  app.get('/today', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const today = new Date().toISOString().split('T')[0]!;

    const { data: athletes } = await supabase
      .from('athletes')
      .select('*, profile:athlete_profiles(*), races(*)')
      .eq('coach_id', coachId)
      .order('full_name');

    if (!athletes) return reply.send({ success: true, data: { date: today, athletes: [], open_flags: 0, unread_messages: 0 } });

    const { count: openFlags } = await supabase
      .from('insights')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .eq('dismissed', false);

    const { count: unreadMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', coachId)
      .eq('read', false);

    const enrichedAthletes = await Promise.all(athletes.map(async (a: any) => {
      const { data: todaysSession } = await supabase
        .from('sessions')
        .select('*')
        .eq('athlete_id', a.id)
        .eq('date', today)
        .order('position')
        .limit(1)
        .maybeSingle();

      const { data: recentLog } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('athlete_id', a.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const since7 = new Date(); since7.setDate(since7.getDate() - 7);
      const { data: recentSessions } = await supabase
        .from('sessions')
        .select('status')
        .eq('athlete_id', a.id)
        .gte('date', since7.toISOString().split('T')[0]!);

      const scheduled = recentSessions?.length ?? 0;
      const completed = recentSessions?.filter((s: any) => s.status === 'completed').length ?? 0;
      const compliance7d = scheduled ? Math.round((completed / scheduled) * 100) : 0;

      const { count: flagCount } = await supabase
        .from('insights')
        .select('*', { count: 'exact', head: true })
        .eq('athlete_id', a.id)
        .eq('dismissed', false);

      const upcomingRaces = (a.races ?? [])
        .filter((r: any) => new Date(r.event_date) >= new Date())
        .sort((x: any, y: any) => new Date(x.event_date).getTime() - new Date(y.event_date).getTime());

      return {
        athlete: { ...a, next_race: upcomingRaces[0] ?? null, compliance_7d: compliance7d, active_flags: flagCount ?? 0 },
        todays_session: todaysSession ?? null,
        recent_log: recentLog ?? null,
      };
    }));

    return reply.send({
      success: true,
      data: {
        date: today,
        athletes: enrichedAthletes,
        open_flags: openFlags ?? 0,
        unread_messages: unreadMessages ?? 0,
      },
    });
  });
}
