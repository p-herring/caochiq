import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';

export async function todayRoutes(app: FastifyInstance) {
  app.get('/today', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const today = new Date().toISOString().split('T')[0]!;

    const { data: athletes } = await supabase
      .from('athletes')
      .select('*')
      .eq('coach_id', coachId)
      .order('full_name');

    if (!athletes || !athletes.length) return reply.send({ success: true, data: { date: today, athletes: [], open_flags: 0, unread_messages: 0 } });

    const athleteIds = athletes.map((a: any) => a.id);

    const [
      { count: openFlags },
      { count: unreadMessages },
      { data: allRaces },
    ] = await Promise.all([
      supabase.from('insights').select('*', { count: 'exact', head: true }).eq('coach_id', coachId).eq('dismissed', false),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('recipient_id', coachId).eq('read', false),
      supabase.from('races').select('id, athlete_id, name, event_date').in('athlete_id', athleteIds),
    ]);

    const enrichedAthletes = await Promise.all(athletes.map(async (a: any) => {
      const [
        { data: todaysSession },
        { data: recentLog },
        { data: recentSessions },
        { count: flagCount },
      ] = await Promise.all([
        supabase.from('sessions').select('*').eq('athlete_id', a.id).eq('date', today).order('position').limit(1).maybeSingle(),
        supabase.from('workout_logs').select('*').eq('athlete_id', a.id).order('date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('sessions').select('status').eq('athlete_id', a.id).gte('date', (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]!; })()),
        supabase.from('insights').select('*', { count: 'exact', head: true }).eq('athlete_id', a.id).eq('dismissed', false),
      ]);

      const scheduled = recentSessions?.length ?? 0;
      const completed = recentSessions?.filter((s: any) => s.status === 'completed').length ?? 0;
      const compliance7d = scheduled ? Math.round((completed / scheduled) * 100) : 0;

      const athleteRaces = (allRaces ?? []).filter((r: any) => r.athlete_id === a.id);
      const upcomingRaces = athleteRaces
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
