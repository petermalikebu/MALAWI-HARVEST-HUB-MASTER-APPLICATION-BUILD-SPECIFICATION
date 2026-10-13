import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './src/server/api.ts';
import { setupRealtimeServer } from './src/server/realtime.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Realtime WebSocket server on /ws
  setupRealtimeServer(server);

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Error handling middleware for API routes to guarantee JSON error output (preventing HTML error pages)
  app.use('/api', (err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      console.error('API Error:', err);
      if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Payload too large. Please choose an image under 10MB.' });
      }
      return res.status(err.status || 500).json({ error: err.message || 'Server request failed' });
    }
    next();
  });

  // Catch unmatched /api routes and return JSON 404, preventing HTML SPA fallback
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const port = parseInt(process.env.PORT || '3000', 10);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Malawi Harvest Hub server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
