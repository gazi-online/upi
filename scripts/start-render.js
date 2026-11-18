import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../packages/db/src/migrate.js';
import { startControlCenter } from '../apps/control-center/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Render sets PORT automatically (defaulting to 10000)
const PORT = Number(process.env.PORT || 10000);
const HOST = process.env.YOUPI_BIND_HOST || '0.0.0.0';

process.env.YOUPI_MODE = 'localhost';
process.env.YOUPI_ALLOW_LOCALHOST_MODE = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.USE_SQLITE_FALLBACK = 'true';

// Try loading local .env if present
try {
  const rootEnv = path.resolve(rootDir, '.env');
  if (fs.existsSync(rootEnv) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(rootEnv);
  }
} catch {}

console.log('====================================================');
console.log(`🚀 Starting YOUPI PG V2 — Render Cloud Gateway on port ${PORT}`);
console.log('====================================================');

// 1. Run migrations & ensure database
console.log('[1/3] Running database migrations & seeds...');
const migrationResult = runMigrations();
console.log(`[✓] Database initialized for ${migrationResult.defaultMerchant.businessName}`);

// 2. Start Process Supervisor and all background services
console.log('[2/3] Launching Process Supervisor & Gateway services...');
const cc = await startControlCenter();
await cc.processManager.startAll();

console.log('====================================================');
console.log('🟢 ALL MICROSERVICES ONLINE (INTERNAL)');
console.log('====================================================');
console.log('• Payment Core REST API:   http://127.0.0.1:6100');
console.log('• Customer Checkout:       http://127.0.0.1:7000');
console.log('• Merchant Admin Panel:    http://127.0.0.1:6001');
console.log('• Showcase Demo Store:     http://127.0.0.1:5000');
console.log('• Gmail Payment Observer:  http://127.0.0.1:6003');
console.log('• Android SMS Observer:    http://127.0.0.1:6002');
console.log('• Process Supervisor:      http://127.0.0.1:8090');
console.log('====================================================');

// 3. Service Port Mapping for the Unified Reverse Proxy
const PORTS = {
  CHECKOUT: 7000,
  API: 6100,
  ADMIN: 6001,
  STORE: 5000,
  GMAIL: 6003,
  SMS: 6002,
  SUPERVISOR: 8090
};

function resolveTargetPort(pathname) {
  if (pathname.startsWith('/api/services') || pathname === '/api/logs/stream') {
    return PORTS.SUPERVISOR;
  }
  if (pathname.startsWith('/api/')) {
    return PORTS.API;
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return PORTS.ADMIN;
  }
  if (pathname === '/store' || pathname.startsWith('/store/') || pathname.startsWith('/wallet') || pathname.startsWith('/order-')) {
    return PORTS.STORE;
  }
  if (pathname.startsWith('/internal/gmail/')) {
    return PORTS.GMAIL;
  }
  if (pathname.startsWith('/internal/sms/')) {
    return PORTS.SMS;
  }
  // Default: Checkout portal handles /, /checkout/*, /stand/*, /youpi.js, /icons/*, assets
  return PORTS.CHECKOUT;
}

// 4. Create Unified Gateway Reverse Proxy
const gateway = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Direct Healthcheck for Render and Uptime monitors
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'UP',
      service: 'youpi-render-gateway',
      port: PORT,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  const targetPort = resolveTargetPort(pathname);
  const forwardHeaders = {
    ...req.headers,
    host: `127.0.0.1:${targetPort}`,
    'x-forwarded-host': req.headers.host || '',
    'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'https',
    'x-forwarded-for': req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
  };

  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: targetPort,
    path: `${url.pathname}${url.search}`,
    method: req.method,
    headers: forwardHeaders
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Bad Gateway: Microservice temporarily unreachable',
        targetPort,
        details: err.message
      }));
    }
  });

  req.pipe(proxyReq);
});

// Support WebSocket / SSE upgrades
gateway.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const targetPort = resolveTargetPort(url.pathname);

  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: targetPort,
    path: `${url.pathname}${url.search}`,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${targetPort}`
    }
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
      Object.keys(proxyRes.headers).map(k => `${k}: ${proxyRes.headers[k]}`).join('\r\n') +
      '\r\n\r\n'
    );
    if (proxyHead && proxyHead.length) socket.write(proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on('error', () => {
    socket.destroy();
  });

  proxyReq.end();
});

// Start Gateway
gateway.listen(PORT, HOST, () => {
  console.log(`[3/3] 🌐 Render Public Gateway listening on http://${HOST}:${PORT}`);
  console.log('Ready to process live payments and checkout sessions.');
});

// Graceful termination
const shutdown = async () => {
  console.log('\nShutting down Render Gateway cleanly...');
  gateway.close();
  await cc.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
