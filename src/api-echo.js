#!/usr/bin/env node
/**
 * api-echo.js
 * Mock API server — records and replays HTTP requests for testing.
 *
 * Usage:
 *   node src/api-echo.js --mode replay --port 3000
 *   node src/api-echo.js --mode record --target https://api.example.com --port 3000
 *   node src/api-echo.js --list
 *   node src/api-echo.js --clear
 */

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ── Argument parsing ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, defaultVal = null) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : defaultVal;
}
function hasFlag(name) { return args.includes(name); }

const MODE        = getArg('--mode', 'replay');       // record | replay | passthrough
const TARGET      = getArg('--target', '');
const PORT        = parseInt(getArg('--port', '3000'), 10);
const RECORD_DIR  = getArg('--dir', './recordings');
const DELAY       = parseInt(getArg('--delay', '0'), 10);

// ── Helpers ─────────────────────────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function recordingKey(method, urlPath) {
  const safe = urlPath.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 80);
  return `${method.toUpperCase()}_${safe}`;
}

function recordingPath(method, urlPath) {
  return path.join(RECORD_DIR, `${recordingKey(method, urlPath)}.json`);
}

function saveRecording(method, urlPath, reqHeaders, reqBody, status, resHeaders, resBody) {
  ensureDir(RECORD_DIR);
  const filePath = recordingPath(method, urlPath);
  const data = {
    request:  { method, path: urlPath, headers: reqHeaders, body: reqBody, timestamp: new Date().toISOString() },
    response: { status, headers: resHeaders, body: resBody },
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

function loadRecording(method, urlPath) {
  const filePath = recordingPath(method, urlPath);
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

function collectBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function proxyRequest(method, targetUrl, headers, body, callback) {
  const parsed = new url.URL(targetUrl);
  const lib = parsed.protocol === 'https:' ? https : http;
  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method,
    headers: { ...headers, host: parsed.hostname },
  };
  delete options.headers['content-length'];
  const req = lib.request(options, (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let parsedBody = rawBody;
      try { parsedBody = JSON.parse(rawBody); } catch {}
      callback(null, res.statusCode, res.headers, parsedBody);
    });
  });
  req.on('error', (err) => callback(err));
  if (body) req.write(body);
  req.end();
}

// ── Commands ─────────────────────────────────────────────────────────────────
if (hasFlag('--list')) {
  ensureDir(RECORD_DIR);
  const files = fs.readdirSync(RECORD_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No recordings found in', RECORD_DIR);
  } else {
    console.log(`\nRecordings in ${RECORD_DIR}:\n`);
    files.forEach(f => {
      const data = JSON.parse(fs.readFileSync(path.join(RECORD_DIR, f), 'utf8'));
      console.log(`  ${data.request.method.padEnd(6)} ${data.request.path.padEnd(50)} → ${data.response.status}`);
    });
    console.log(`\n${files.length} recording(s) total.`);
  }
  process.exit(0);
}

if (hasFlag('--clear')) {
  if (fs.existsSync(RECORD_DIR)) {
    const files = fs.readdirSync(RECORD_DIR).filter(f => f.endsWith('.json'));
    files.forEach(f => fs.unlinkSync(path.join(RECORD_DIR, f)));
    console.log(`Cleared ${files.length} recording(s) from ${RECORD_DIR}`);
  } else {
    console.log('No recordings directory found.');
  }
  process.exit(0);
}

// ── Server ────────────────────────────────────────────────────────────────────
if (!['record', 'replay', 'passthrough'].includes(MODE)) {
  console.error(`ERROR: Invalid mode "${MODE}". Use: record | replay | passthrough`);
  process.exit(1);
}

if (MODE === 'record' && !TARGET) {
  console.error('ERROR: --target is required in record mode.');
  process.exit(1);
}

ensureDir(RECORD_DIR);

const server = http.createServer(async (req, res) => {
  const body = await collectBody(req);
  const method = req.method;
  const urlPath = req.url;

  const sendResponse = (status, headers, body) => {
    if (DELAY > 0) {
      setTimeout(() => send(status, headers, body), DELAY);
    } else {
      send(status, headers, body);
    }
  };

  function send(status, headers, body) {
    const safeHeaders = { ...headers };
    delete safeHeaders['transfer-encoding'];
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    safeHeaders['content-length'] = Buffer.byteLength(bodyStr);
    res.writeHead(status, safeHeaders);
    res.end(bodyStr);
  }

  if (MODE === 'replay') {
    const rec = loadRecording(method, urlPath);
    if (rec) {
      console.log(`[REPLAY] ${method} ${urlPath} → ${rec.response.status}`);
      sendResponse(rec.response.status, rec.response.headers || { 'content-type': 'application/json' }, rec.response.body);
    } else {
      console.log(`[REPLAY] ${method} ${urlPath} → 404 (no recording)`);
      sendResponse(404, { 'content-type': 'application/json' }, { error: 'No recording found', method, path: urlPath });
    }
    return;
  }

  // record or passthrough
  const targetUrl = `${TARGET}${urlPath}`;
  proxyRequest(method, targetUrl, req.headers, body, (err, status, headers, resBody) => {
    if (err) {
      console.error(`[PROXY ERROR] ${err.message}`);
      sendResponse(502, { 'content-type': 'application/json' }, { error: err.message });
      return;
    }
    if (MODE === 'record') {
      const file = saveRecording(method, urlPath, req.headers, body || null, status, headers, resBody);
      console.log(`[RECORD] ${method} ${urlPath} → ${status} (saved: ${path.basename(file)})`);
    } else {
      console.log(`[PASS]   ${method} ${urlPath} → ${status}`);
    }
    sendResponse(status, headers, resBody);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎙  api-echo v1.0.0`);
  console.log(`   Mode:    ${MODE.toUpperCase()}`);
  if (TARGET) console.log(`   Target:  ${TARGET}`);
  console.log(`   Port:    ${PORT}`);
  console.log(`   Storage: ${RECORD_DIR}`);
  if (DELAY) console.log(`   Delay:   ${DELAY}ms`);
  console.log(`\n   Listening at http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`ERROR: Port ${PORT} is already in use. Try --port ${PORT + 1}`);
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});
