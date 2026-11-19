// PERFECT HOMES & DEVELOPERS — HOSTINGER PRODUCTION SERVER
// High-Performance Universal Node.js Web Server (Zero external server dependencies)
// Supports Phusion Passenger, Reverse Proxy, Hostinger CloudLinux, and standalone node.

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. AUTO-LOAD .env FILE (IF PRESENT)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      console.log('[Hostinger Server] Loaded environment variables from .env');
    } catch (err) {
      console.warn('[Hostinger Server] Could not parse .env file:', err.message);
    }
  }
}
loadEnv();

// Import API Handlers
import loginHandler from './api/login.js';
import registerHandler from './api/register.js';
import sessionHandler from './api/session.js';
import usersHandler from './api/users.js';
import propertyHandler from './api/property.js';
import mediaHandler from './api/media.js';
import enquiriesHandler from './api/enquiries.js';
import changePasswordHandler from './api/change-password.js';
import resetPasswordHandler from './api/reset-password.js';
import updateProfileHandler from './api/update-profile.js';
import { getDatabaseStatus } from './api/_db.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.join(__dirname, 'dist');
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types lookup
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

// Response Enhancement Helper (Standardized Express-like res.status and res.json)
function enhanceResponse(res) {
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (data) {
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    this.end(JSON.stringify(data));
    return this;
  };
}

// Parse Request Body (JSON or text)
function parseRequestBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // 20MB payload limit guard
      if (body.length > 20 * 1024 * 1024) {
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({ raw: body });
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Serve Static File with HTTP Range (for Videos) and Proper Caching
function serveStaticFile(filePath, req, res) {
  try {
    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Standard Cache Control
    if (filePath.includes(path.sep + 'assets' + path.sep)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    // Video Streaming: Support 206 Partial Content (HTTP Range Requests)
    const range = req.headers.range;
    if (range && (ext === '.mp4' || ext === '.webm' || ext === '.ogg')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
      return;
    }

    // Standard File Streaming
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error serving static asset: ' + err.message);
  }
}

// Friendly Build-Pending Fallback Page
function servePendingBuildPage(res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Perfect Homes & Developers — Hostinger Deployment</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #064E49; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #fff; color: #17313D; max-width: 620px; width: 100%; border-radius: 12px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); text-align: center; }
        h1 { color: #008F83; margin-top: 0; }
        p { font-size: 16px; line-height: 1.6; color: #4B5563; }
        .code { background: #F3F4F6; padding: 12px 18px; border-radius: 8px; font-family: monospace; font-size: 15px; margin: 20px 0; color: #008F83; font-weight: bold; }
        .btn { display: inline-block; background: #008F83; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Perfect Homes & Developers</h1>
        <h3>Hostinger Business Node.js Server Active</h3>
        <p>The Node.js backend server is running and ready. To serve the React frontend, run the production build:</p>
        <div class="code">npm run build</div>
        <p>Once built, reload this page to access the complete website.</p>
        <p><small>Backend API Health Check: <a href="/api/health" style="color:#008F83;">/api/health</a></small></p>
      </div>
    </body>
    </html>
  `);
}

// ------------------------------------------
// MAIN HTTP REQUEST DISPATCHER
// ------------------------------------------
const server = http.createServer(async (req, res) => {
  enhanceResponse(res);

  // Security & CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // Parse URL & Query
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const query = Object.fromEntries(parsedUrl.searchParams.entries());
  req.query = query;

  // ----------------------------------------
  // A. API ROUTES
  // ----------------------------------------
  if (pathname.startsWith('/api/')) {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      req.body = await parseRequestBody(req);
    } else {
      req.body = {};
    }

    try {
      if (pathname === '/api/login') {
        return await loginHandler(req, res);
      }
      if (pathname === '/api/register') {
        return await registerHandler(req, res);
      }
      if (pathname === '/api/session') {
        return await sessionHandler(req, res);
      }
      if (pathname === '/api/users') {
        return await usersHandler(req, res);
      }
      if (pathname === '/api/property') {
        return await propertyHandler(req, res);
      }
      if (pathname === '/api/media') {
        return await mediaHandler(req, res);
      }
      if (pathname === '/api/enquiries') {
        return await enquiriesHandler(req, res);
      }
      if (pathname === '/api/change-password') {
        return await changePasswordHandler(req, res);
      }
      if (pathname === '/api/reset-password') {
        return await resetPasswordHandler(req, res);
      }
      if (pathname === '/api/update-profile') {
        return await updateProfileHandler(req, res);
      }
      if (pathname === '/api/health') {
        const dbStatus = await getDatabaseStatus();
        return res.status(200).json({
          status: 'ok',
          environment: 'Hostinger Business Node.js',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          database: dbStatus
        });
      }

      return res.status(404).json({ success: false, error: `API endpoint ${pathname} not found` });
    } catch (err) {
      console.error(`[API Error] ${pathname}:`, err);
      if (!res.headersSent) {
        return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Internal Server Error' });
      }
    }
    return;
  }

  // ----------------------------------------
  // B. STATIC ASSET SERVING
  // ----------------------------------------

  // 1. Check in dist/ directory (built assets)
  const distPath = path.join(DIST_DIR, pathname.replace(/^\//, ''));
  if (fs.existsSync(distPath) && fs.statSync(distPath).isFile()) {
    return serveStaticFile(distPath, req, res);
  }

  // 2. Check in public/ directory (media, images, videos)
  const publicPath = path.join(PUBLIC_DIR, pathname.replace(/^\//, ''));
  if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
    return serveStaticFile(publicPath, req, res);
  }

  // ----------------------------------------
  // C. SPA HTML5 HISTORY FALLBACK
  // ----------------------------------------
  if (req.method === 'GET') {
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      return serveStaticFile(indexPath, req, res);
    }

    // Also check root index.html if dist doesn't exist
    const rootIndex = path.join(__dirname, 'index.html');
    if (fs.existsSync(rootIndex) && !fs.existsSync(DIST_DIR)) {
      return servePendingBuildPage(res);
    }
  }

  // 404 for any unmatched non-GET
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Resource not found');
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log('================================================================');
  console.log(' PERFECT HOMES & DEVELOPERS — HOSTINGER PRODUCTION SERVER');
  console.log('================================================================');
  console.log(` Server active on port: ${PORT}`);
  console.log(` Web URL: http://localhost:${PORT}`);
  try {
    const status = await getDatabaseStatus();
    console.log(` Database Engine: ${status.engine} (${status.connected ? 'Connected' : 'Offline'})`);
    if (status.engine === 'MySQL') {
      console.log(` Hostinger MySQL Database: ${status.database} @ ${status.host}`);
    } else {
      console.log(` Local Storage: ${status.storagePath}`);
    }
  } catch {
    console.log(' Database: Ready');
  }
  console.log(' Hostinger Business Deployment Ready: YES');
  console.log('================================================================\n');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[Hostinger Server] SIGTERM received. Gracefully closing...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[Hostinger Server] SIGINT received. Closing server...');
  server.close(() => process.exit(0));
});

export default server;
