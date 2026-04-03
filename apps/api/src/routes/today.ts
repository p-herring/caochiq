import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';

function toDateOnly(input: Date) {
  return input.toISOString().split('T')[0]!;
}

export async function todayRoutes(app: FastifyInstance) {
  app.get('/today', { preHandler: authenticate }, async (req, reply) => {
    const coachId = (req as any).userId;
    const today = toDateOnly(new Date());
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: athletes, error: athletesError } = await supabase
      .from('athletes')
      .select('*')
      .eq('coach_id', coachId)
      .order('full_name');

    if (athletesError) {
      return reply.code(500).send({ success: false, error: { message: athletesError.message } });
    }

    if (!athletes?.length) {
      return reply.send({ success: true, data: { date: today, athletes: [], open_flags: 0, unread_messages: 0 } });
    }

    const athleteIds = athletes.map((a: any) => a.id);

    const [
      { count: openFlags, error: openFlagsError },
      { count: unreadMessages, error: unreadError },
      { data: allRaces, error: racesError },
      { data: todaysSessions, error: todaysSessionsError },
      { data: recentLogs, error: recentLogsError },
      { data: recentSessions, error: recentSessionsError },
      { data: allFlags, error: allFlagsError },
    ] = await Promise.all([
      supabase.from('insights').select('*', { count: 'exact', head: true }).eq('coach_id', coachId).eq('dismissed', false),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('recipient_id', coachId).eq('read', false),
      supabase.from('races').select('id, athlete_id, name, event_date').in('athlete_id', athleteIds),
      supabase.from('sessions').select('*').in('athlete_id', athleteIds).eq('date', today).order('position'),
      supabase.from('workout_logs').select('*').in('athlete_id', athleteIds).order('date', { ascending: false }),
      supabase.from('sessions').select('athlete_id, status, date').in('athlete_id', athleteIds).gte('date', toDateOnly(sevenDaysAgo)),
      supabase.from('insights').select('athlete_id').in('athlete_id', athleteIds).eq('dismissed', false),
    ]);

    const firstError =
      openFlagsError || unreadError || racesError || todaysSessionsError || recentLogsError || recentSessionsError || allFlagsError;

    if (firstError) {
      return reply.code(500).send({ success: false, error: { message: firstError.message } });
    }

    const todaysSessionMap = new Map<string, any>();
    for (const session of todaysSessions ?? []) {
      if (!todaysSessionMap.has(session.athlete_id)) todaysSessionMap.set(session.athlete_id, session);
    }

    const recentLogMap = new Map<string, any>();
    for (const log of recentLogs ?? []) {
      if (!recentLogMap.has(log.athlete_id)) recentLogMap.set(log.athlete_id, log);
    }

    const recentSessionsMap = new Map<string, any[]>();
    for (const session of recentSessions ?? []) {
      const arr = recentSessionsMap.get(session.athlete_id) ?? [];
      arr.push(session);
      recentSessionsMap.set(session.athlete_id, arr);
    }

    const flagCountMap = new Map<string, number>();
    for (const flag of allFlags ?? []) {
      flagCountMap.set(flag.athlete_id, (flagCountMap.get(flag.athlete_id) ?? 0) + 1);
    }

    const racesMap = new Map<string, any[]>();
    for (const race of allRaces ?? []) {
      const arr = racesMap.get(race.athlete_id) ?? [];
      arr.push(race);
      racesMap.set(race.athlete_id, arr);
    }

    const now = new Date();

    const enrichedAthletes = athletes.map((a: any) => {
      const recent = recentSessionsMap.get(a.id) ?? [];
      const scheduled = recent.length;
      const completed = recent.filter((s: any) => s.status === 'completed').length;
      const compliance7d = scheduled ? Math.round((completed / scheduled) * 100) : 0;

      const upcomingRaces = (racesMap.get(a.id) ?? [])
        .filter((r: any) => new Date(r.event_date) >= now)
        .sort((x: any, y: any) => new Date(x.event_date).getTime() - new Date(y.event_date).getTime());

      return {
        athlete: {
          ...a,
          next_race: upcomingRaces[0] ?? null,
          compliance_7d: compliance7d,
          active_flags: flagCountMap.get(a.id) ?? 0,
        },
        todays_session: todaysSessionMap.get(a.id) ?? null,
        recent_log: recentLogMap.get(a.id) ?? null,
      };
    });

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
