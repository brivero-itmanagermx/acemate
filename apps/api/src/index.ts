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

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://acemate-web.vercel.app',
  ...(process.env.WEB_URL ? [process.env.WEB_URL] : []),
];

app.use(
  '*',
  cors({
    origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]),
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Railway health probe (must be at /health, no prefix)
app.get('/health',        (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/',              (c) => c.json({ message: 'AceMate API is running', version: 'v1' }));
app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.route('/api/v1/profiles',    profiles);
app.route('/api/v1/matches',     matches);
app.route('/api/v1/venues',      venues);
app.route('/api/v1/friendships', friendships);

const PORT = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`AceMate API running on http://localhost:${PORT}`);
});
