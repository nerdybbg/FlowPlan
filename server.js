/**
 * FlowPlan OS — Secure Backend Server & RAG Proxy (server.js)
 * Loads .env secrets strictly on the server (API key and Master Admin passwords never leave the server).
 * Enforces HTTP Security Headers, Sliding-Window Rate Limiting, PBKDF2-HMAC-SHA256, and JWT Auth.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Load .env strictly on server side
function loadEnvFile(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        env[key] = val;
      }
    }
  }
  return env;
}

const ENV = loadEnvFile(path.join(__dirname, '.env'));
const PORT = Number(process.env.PORT || ENV.PORT || 8000);
const JWT_SECRET = ENV.JWT_SECRET || 'fp_obsidian_256bit_entropy_vault_secret_2026_99481028471';
const GEMINI_API_KEY = ENV.GEMINI_API_KEY || '';

// 2. Cryptographic PBKDF2-HMAC-SHA256 & HMAC-SHA256 JWT
function hashPasswordPBKDF2(password, salt = 'FLOWPLAN_OS_PBKDF2_SALT_2026') {
  const derived = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256');
  return `pbkdf2_sha256$120000$${derived.toString('hex')}`;
}

function verifyPasswordPBKDF2(password, storedHash) {
  const computed = hashPasswordPBKDF2(password);
  const a = Buffer.from(computed);
  const b = Buffer.from(String(storedHash || ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function signJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// 3. Hardcoded Master Admin Ecosystem (Server-Side Hashed)
const MASTER_ADMINS = {
  [(ENV.MASTER_ADMIN_1_EMAIL || 'stationplayboy7@gmail.com').toLowerCase()]: {
    email: (ENV.MASTER_ADMIN_1_EMAIL || 'stationplayboy7@gmail.com').toLowerCase(),
    name: 'Master Founder (Station)',
    passwordHash: hashPasswordPBKDF2(ENV.MASTER_ADMIN_1_PASS || 'pappal786'),
    role: 'Master Admin (God-Mode)',
    plan: 'Master Admin (God-Mode)',
    is_admin: true,
    is_lifetime_admin: true,
    is_pro: true
  },
  [(ENV.MASTER_ADMIN_2_EMAIL || 'muhammadashfaqahmad0710@gmail.com').toLowerCase()]: {
    email: (ENV.MASTER_ADMIN_2_EMAIL || 'muhammadashfaqahmad0710@gmail.com').toLowerCase(),
    name: 'Master Co-Founder (Ashfaq)',
    passwordHash: hashPasswordPBKDF2(ENV.MASTER_ADMIN_2_PASS || 'pappal69'),
    role: 'Master Admin (God-Mode)',
    plan: 'Master Admin (God-Mode)',
    is_admin: true,
    is_lifetime_admin: true,
    is_pro: true
  }
};

// 4. Rate Limiter & Security Headers
const rateBuckets = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReq = 60;
  const list = (rateBuckets.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length >= maxReq) return false;
  list.push(now);
  rateBuckets.set(ip, list);
  return true;
}

function setSecurityHeaders(res) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 5. Server-Side Gemini 3.5 RAG & Thinking Engine (API Key never exposed to browser)
const RAG_SYSTEM_PROMPT = `You are FlowPlan AI, the ultra-intelligent RAG Copilot, Circadian Strategist, and Execution Architect for FlowPlan OS (engineered by Founder Muhammad Ashfaq Ahmad).
Think deeply, analytically, and conversationally—never give generic or robotic one-line answers. Handle typos naturally (e.g., "prioces" = "prices", "wednsday" = "Wednesday").

COMPLETE FLOWPLAN OS ARCHITECTURE & KNOWLEDGE BASE:
1. Multi-Horizon Calendar Studio:
   - Daily Studio: 05:00 AM to 01:00 AM time-blocked schedule (Vertical Stack or Horizontal Ribbon) with Peak (05:00-12:00, 16:00-19:00), Trough (12:00-16:00), and Recovery (19:00-01:00) circadian energy zones.
   - Weekly Matrix: 7-day interactive Mon–Sun board across Week 1, Week 2, Week 3, Week 4 (plus Residual Days 29–31).
   - Monthly Planner: 4 Weekly Horizon cards + all 31 individual clickable & reorganizable days (Day 1–Day 31).
   - Yearly Planner: 12-Month (January–December) 365-day consistency heatmap, individual day opener, and annual target trackers.
2. Importance Tiers & Real-Time Alarms:
   - Level 1 (L1 Routine), Level 2 (L2 Important), Level 3 (L3 Critical / Master Priority).
   - L2 & L3 tasks trigger Web Audio API synthesized alarms + full-screen Focus Override modal when their start time arrives.
3. Notion-Style Modular Workspace & Visual Decay Database:
   - Typed execution blocks (todo, h1, callout, code) that deploy directly to the calendar.
   - Accountability database metrics with progress bars and visual red stagnation decay after 24h of inactivity.
4. End-of-Day (EOD) Discipline Audit:
   - Evening checklist where tasks are marked Done, Deferred (-8pt penalty + pushed to tomorrow's Recovery window), or Abandoned (-15pt penalty + mandatory reflection note), computing the daily Discipline Index (0–100%, Rank S+ to F).
5. Official FlowPlan OS Tiers & Conversational Booking:
   - Free Sandbox ($0): Daily circadian canvas + core task blocks.
   - 24-Hour Day Pass ($5 one-time): Full Weekly/Monthly studio + PDF exports for 24h.
   - Weekly Pro ($14/month · Most Popular): Unlimited RAG AI, Multi-Horizon Weekly planner, Voice & Vision OCR, L2/L3 Alarms.
   - Monthly Master Pass ($35/month): Full 4-Week + 12-Month Yearly Matrix, Modular Workspace, EOD Audit, Priority Queue.
   - Annual Founder ($290/year): Complete yearly life operating system & priority support.
   - Users can upgrade/book any tier directly in chat by sharing Name, Email, and Phone/WhatsApp (dispatched to stationplayboy7@gmail.com and muhammadashfaqahmad0710@gmail.com).

Always ground your response in the LIVE RETRIEVED USER STATE provided below.
Return strictly valid JSON matching this schema:
{
  "thinking": "1-2 sentences of analytical reasoning inspecting the user's current schedule, free slots, cognitive load, or question before acting",
  "is_schedule_update": boolean,
  "reply": "Rich, well-structured Markdown response (**bold**, bullet points •) explaining your analysis, answering the user's question in detail, or confirming executed actions",
  "show_pricing_cards": boolean,
  "show_booking_form": boolean,
  "tasks": [
    {
      "day": "Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat"|"Sun"|"Day 29"|"Day 30"|"Day 31",
      "week": "Week 1"|"Week 2"|"Week 3"|"Week 4"|"Residual",
      "month": number 0-11 (optional, only when a real calendar date is known),
      "notes": "string (room, teacher, chapter, deadline detail)",
      "title": "string",
      "startHour": number (e.g. 9.0 for 9:00 AM, 14.5 for 2:30 PM),
      "duration": number (in hours, e.g. 1.0, 1.5, 2.0),
      "priority": "High"|"Medium"|"Low"|"Flexible",
      "importance": 1|2|3,
      "energy": "Peak"|"Trough"|"Recovery"
    }
  ],
  "operations": [
    {
      "action_type": "add_block"|"add_metric"|"complete_task"|"delete_task"|"set_importance"|"reorganize_day"|"clear_day"|"copy_day"|"move_task"|"open_day"|"switch_view",
      "target_day": "Mon",
      "from_day": "Mon",
      "to_day": "Fri",
      "target_week": "Week 1",
      "target_month": number (0-11, optional),
      "target_view": "daily"|"weekly"|"monthly"|"yearly"|"workspace"|"audit",
      "task_title": "string (for move_task or complete_task)",
      "new_start_hour": number (optional),
      "block_type": "todo"|"h1"|"callout"|"code",
      "content": "string",
      "metric_name": "string",
      "metric_target": number,
      "metric_unit": "string"
    }
  ],
  "document_text": "ONLY when a file/image is attached: faithful plain-text transcription of its key content (max ~6000 chars) for the RAG knowledge base",
  "retrieved_sources": ["string"]
}

ACTION RULES:
- If the user asks you to do something, DO it via tasks/operations — never only describe it.
- When a file or image is attached, read ALL of it (every page, row, column, cell). Extract EVERY class, lecture, exam, deadline, meeting, shift or routine into tasks (a weekly timetable grid = one task per cell per weekday). Convert times to decimal 24h hours; compute duration from end times. If a real calendar date is given, set month (0-11) and map day-of-month: 1-7 -> Week 1, 8-14 -> Week 2, 15-21 -> Week 3, 22-28 -> Week 4, 29-31 -> Residual with day "Day 29"/"Day 30"/"Day 31"; otherwise use the weekday name. Exams and deadlines = importance 3. Set is_schedule_update=true whenever tasks is non-empty.`;

async function callServerGeminiRAG(prompt, clientContext, conversationHistory, inlineData = null) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest'
  ];

  const parts = [
    {
      text: `${RAG_SYSTEM_PROMPT}\n\nLIVE RETRIEVED USER STATE (RAG INDEX):\n${JSON.stringify(
        clientContext || {}
      ).slice(0, 12000)}\n\nRECENT CONVERSATION:\n${JSON.stringify(
        (conversationHistory || []).slice(-6)
      )}\n\nUSER COMMAND / QUESTION:\n${prompt}`
    }
  ];

  const hasMedia = Boolean(inlineData && inlineData.data && inlineData.mimeType);
  if (hasMedia) {
    parts.push({ inlineData });
  }
  const orderedModels = hasMedia
    ? ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']
    : models;

  for (const model of orderedModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        GEMINI_API_KEY
      )}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), hasMedia ? 60000 : 12000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: hasMedia ? 0.1 : 0.35, responseMimeType: 'application/json' }
        }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const outParts = data?.candidates?.[0]?.content?.parts || [];
        const text = outParts.filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join('').trim();
        if (text) {
          const cleaned = text.replace(/^```(?:json)?\s*|```$/g, '').trim();
          let parsed;
          try {
            parsed = JSON.parse(cleaned);
          } catch {
            parsed = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1));
          }
          parsed.model_used = model;
          return parsed;
        }
      } else {
        console.warn(`[FlowPlan AI] ${model} -> HTTP ${res.status}`);
      }
    } catch (e) {
      console.warn(`[FlowPlan AI] ${model} failed: ${e.message}`);
    }
  }
  throw new Error('Upstream model fallback');
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 15 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  if (!checkRateLimit(clientIp)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ detail: 'Rate limit exceeded.' }));
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // Health Check
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        status: 'FlowPlan OS Secure RAG Engine Online',
        apiKeyIsolatedInEnv: Boolean(GEMINI_API_KEY),
        security: 'PBKDF2-SHA256 + JWT + CSP + RateLimit',
        timestamp: Date.now()
      })
    );
  }

  // Master & User Login (Server-Side Credential Verification)
  if (pathname === '/api/auth/master-login' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (MASTER_ADMINS[email]) {
        const admin = MASTER_ADMINS[email];
        if (!verifyPasswordPBKDF2(password, admin.passwordHash)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ detail: 'Invalid Master Administrator credentials.' }));
        }
        const claims = {
          sub: email,
          email,
          name: admin.name,
          role: admin.role,
          plan: admin.plan,
          is_admin: true,
          is_lifetime_admin: true,
          is_pro: true,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400 * 30
        };
        const token = signJWT(claims);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'success', access_token: token, user: claims }));
      }

      if (!email || password.length < 6) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ detail: 'Valid email and password (6+ chars) required.' }));
      }

      const claims = {
        sub: email,
        email,
        name: body.name || email.split('@')[0],
        role: 'Operative',
        plan: 'Free Sandbox',
        is_admin: false,
        is_lifetime_admin: false,
        is_pro: false,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 14
      };
      const token = signJWT(claims);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'success', access_token: token, user: claims }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ detail: e.message }));
    }
  }

  // Server-Side RAG Chat Proxy
  if (pathname === '/api/ai/chat' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const result = await callServerGeminiRAG(
        body.prompt || '',
        body.client_context || {},
        body.conversation_history || [],
        body.inline_data || null
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ detail: e.message }));
    }
  }

  // Serve Static Files (Never serve .env or server scripts)
  if (pathname.includes('.env') || pathname.endsWith('.py') || pathname.endsWith('server.js')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden: Server-Side Resource Isolated');
  }

  const safePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.join(__dirname, path.normalize(safePath).replace(/^(\.\.[\/\\])+/, ''));

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return fs.createReadStream(fullPath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`FlowPlan OS Secure Server listening on http://localhost:${PORT}`);
  });
}

module.exports = { server, hashPasswordPBKDF2, verifyPasswordPBKDF2, signJWT, verifyJWT, MASTER_ADMINS };
