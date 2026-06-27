import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import profiles    from './routes/profiles';
import matches     from './routes/matches';
import venues      from './routes/venues';
import friendships from './routes/friendships';

const app = new Hono();

app.use(logger());
app.use(
  '*',
  cors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/', (c) => c.json({ message: 'AceMate API is running', version: 'v1' }));
app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.route('/api/v1/profiles',    profiles);
app.route('/api/v1/matches',     matches);
app.route('/api/v1/venues',      venues);
app.route('/api/v1/friendships', friendships);

const PORT = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`AceMate API running on http://localhost:${PORT}`);
});
