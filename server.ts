import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import routes from './server/routes.ts';
import { pool, getSafeDatabaseDiagnostics } from './src/db/index.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security Headers Middleware (Allow iframe embedding in AI Studio preview)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Ensure uploads directory exists (served via authenticated route /api/files/:filename)
  const uploadsPath = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    const dbDiag = getSafeDatabaseDiagnostics();
    try {
      const dbCheck = await pool.query('SELECT NOW() as time');
      res.json({
        status: 'ok',
        database: 'PostgreSQL (Connected)',
        databaseHost: dbDiag.host,
        databaseName: dbDiag.database,
        dbTime: dbCheck.rows[0].time,
        system: 'SITEPOINT Construction Control Center',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'degraded',
        database: 'Error connecting: ' + err.message,
        databaseHost: dbDiag.host,
        databaseName: dbDiag.database,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Mount API routes FIRST
  app.use('/api', routes);

  // Vite middleware for development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`SITEPOINT Server running on http://0.0.0.0:${PORT}`);
    const dbDiag = getSafeDatabaseDiagnostics();
    console.log(`Database configuration detected: ${dbDiag.detected ? 'yes' : 'no'}`);
    console.log(`DATABASE HOST: ${dbDiag.host}`);
    console.log(`DATABASE NAME: ${dbDiag.database}`);

    try {
      await pool.query('SELECT NOW()');
      console.log('Database connection: connected');
    } catch (err: any) {
      console.error(`Database connection: failed (${err.message})`);
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down SITEPOINT gracefully...');
    server.close(async () => {
      try {
        await pool.end();
        console.log('Database pool closed.');
      } catch (err) {
        console.error('Error closing database pool:', err);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
