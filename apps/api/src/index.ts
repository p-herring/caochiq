import Fastify from 'fastify';
import cors from '@fastify/cors';
import { athleteRoutes } from './routes/athletes';
import { planRoutes } from './routes/plans';
import { sessionRoutes } from './routes/sessions';
import { messageRoutes } from './routes/messages';
import { insightRoutes } from './routes/insights';
import { todayRoutes } from './routes/today';
import { stravaRoutes } from './routes/strava';
import { templateRoutes } from './routes/templates';

const app = Fastify({ logger: true });

async function start() {
  // CORS — allow frontend origin
  await app.register(cors, {
    origin: [
      process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
      /\.vercel\.app$/,
    ],
    credentials: true,
  });

  // Health check
  app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));

  // All routes under /api/v1
  await app.register(async (api) => {
    await api.register(athleteRoutes);
    await api.register(planRoutes);
    await api.register(sessionRoutes);
    await api.register(messageRoutes);
    await api.register(insightRoutes);
    await api.register(todayRoutes);
    await api.register(stravaRoutes);
    await api.register(templateRoutes);
  }, { prefix: '/api/v1' });

  const port = Number(process.env['PORT'] ?? 3001);
  const host = process.env['HOST'] ?? '0.0.0.0';

  await app.listen({ port, host });
  console.log(`\n🚀  CoachIQ API running on http://${host}:${port}\n`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
