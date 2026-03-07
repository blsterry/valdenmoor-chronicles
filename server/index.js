import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import { MAP_DATA, NPC_CATALOG, SKILL_CATALOG, EXPANDED_LORE, QUEST_TYPE_CATALOG, mapDistance } from './lore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme-use-env-var';

app.use(cors());
app.use(express.json({ limit: '4mb' }));

// ─── Auth middleware ────────────────────────────────────────────────────────

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

// ─── Auth routes ────────────────────────────────────────────────────────────

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1', [username.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin },
      JWT_SECRET, { expiresIn: '30d' }
    );
    res.json({ token, username: user.username, is_admin: user.is_admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Admin routes ────────────────────────────────────────────────────────────

app.get('/api/admin/users', adminAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, username, is_admin, created_at FROM users ORDER BY created_at'
  );
  res.json(rows);
});

app.post('/api/admin/users', adminAuth, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at',
      [username.toLowerCase(), hash]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id)
    return res.status(400).json({ error: 'Cannot delete yourself' });
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
  res.json({ ok: true });
});

app.patch('/api/admin/users/:id/password', adminAuth, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.params.id]);
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id/save', adminAuth, async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM saves WHERE user_id = $1', [id]);
  await pool.query('DELETE FROM npc_states WHERE user_id = $1', [id]);
  await pool.query('DELETE FROM game_events WHERE user_id = $1', [id]);
  res.json({ ok: true });
});

// ─── Save routes ─────────────────────────────────────────────────────────────

app.get('/api/save', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM saves WHERE user_id = $1', [req.user.id]
  );
  res.json(rows[0] || null);
});

app.post('/api/save', auth, async (req, res) => {
  const { character, messages, display_log, mood, options, scene } = req.body;
  await pool.query(`
    INSERT INTO saves (user_id, character, messages, display_log, mood, options, scene, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      character=$2, messages=$3, display_log=$4, mood=$5, options=$6, scene=$7, updated_at=NOW()
  `, [req.user.id,
      JSON.stringify(character),
      JSON.stringify(messages),
      JSON.stringify(display_log),
      mood,
      JSON.stringify(options),
      scene]);
  res.json({ ok: true });
});

app.delete('/api/save', auth, async (req, res) => {
  await pool.query('DELETE FROM saves WHERE user_id = $1', [req.user.id]);
  await pool.query('DELETE FROM npc_states WHERE user_id = $1', [req.user.id]);
  await pool.query('DELETE FROM game_events WHERE user_id = $1', [req.user.id]);
  res.json({ ok: true });
});

// ─── NPC State routes ─────────────────────────────────────────────────────────
// Persistent NPC memory and relationship tracking per player.

// Load all NPC states for current player
app.get('/api/npc-states', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT npc_id, relationship, interaction_count, memory, teaching_progress, flags FROM npc_states WHERE user_id = $1',
    [req.user.id]
  );
  // Return as object keyed by npc_id
  const result = {};
  for (const row of rows) {
    result[row.npc_id] = {
      relationship: row.relationship,
      interactionCount: row.interaction_count,
      memory: row.memory,
      teachingProgress: row.teaching_progress,
      flags: row.flags,
    };
  }
  res.json(result);
});

// Bulk upsert NPC states after a GM response
app.post('/api/npc-states', auth, async (req, res) => {
  const { changes } = req.body; // [{ npcId, relationshipDelta, memorySummary, teachingProgress, flags, day }]
  if (!changes || !Array.isArray(changes)) return res.status(400).json({ error: 'changes array required' });

  for (const change of changes) {
    const { npcId, relationshipDelta = 0, memorySummary, teachingProgress, flags, day } = change;
    if (!npcId) continue;

    // Fetch current state
    const { rows } = await pool.query(
      'SELECT * FROM npc_states WHERE user_id = $1 AND npc_id = $2',
      [req.user.id, npcId]
    );

    if (rows.length === 0) {
      // Create new entry
      const newMemory = memorySummary ? [{ day: day || 1, summary: memorySummary }] : [];
      await pool.query(`
        INSERT INTO npc_states (user_id, npc_id, relationship, interaction_count, memory, teaching_progress, flags, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [req.user.id, npcId, Math.max(-100, Math.min(100, relationshipDelta)), memorySummary ? 1 : 0,
          JSON.stringify(newMemory),
          JSON.stringify(teachingProgress || {}),
          JSON.stringify(flags || {})]);
    } else {
      const current = rows[0];
      const newRel = Math.max(-100, Math.min(100, current.relationship + relationshipDelta));
      const newCount = current.interaction_count + (memorySummary ? 1 : 0);

      // Keep last 8 memory entries
      let mem = current.memory || [];
      if (memorySummary) {
        mem = [...mem, { day: day || 1, summary: memorySummary }];
        if (mem.length > 8) mem = mem.slice(-8);
      }

      // Merge teaching progress
      const tp = { ...(current.teaching_progress || {}), ...(teachingProgress || {}) };
      const fl = { ...(current.flags || {}), ...(flags || {}) };

      await pool.query(`
        UPDATE npc_states SET
          relationship = $3, interaction_count = $4, memory = $5,
          teaching_progress = $6, flags = $7, updated_at = NOW()
        WHERE user_id = $1 AND npc_id = $2
      `, [req.user.id, npcId, newRel, newCount, JSON.stringify(mem), JSON.stringify(tp), JSON.stringify(fl)]);
    }
  }

  res.json({ ok: true });
});

// ─── Game Events routes ───────────────────────────────────────────────────────
// Append-only log of in-game events for time tracking, NPC memory, and timed events.

app.get('/api/events', auth, async (req, res) => {
  const { limit = 100, npcId, types } = req.query;
  const params = [req.user.id];
  const conditions = ['user_id = $1'];

  if (npcId) {
    params.push(npcId);
    conditions.push(`npc_id = $${params.length}`);
  }
  if (types) {
    params.push(types.split(','));
    conditions.push(`event_type = ANY($${params.length})`);
  }

  params.push(parseInt(limit));
  const { rows } = await pool.query(
    `SELECT * FROM game_events WHERE ${conditions.join(' AND ')} ORDER BY game_time DESC LIMIT $${params.length}`,
    params
  );
  res.json(rows.reverse()); // chronological order
});

app.post('/api/events', auth, async (req, res) => {
  const { events } = req.body;
  if (!events || !Array.isArray(events) || events.length === 0)
    return res.status(400).json({ error: 'events array required' });

  for (const ev of events) {
    const { game_time, event_type, location, npc_id, description, flags } = ev;
    if (!description || game_time == null) continue;
    await pool.query(
      `INSERT INTO game_events (user_id, game_time, event_type, location, npc_id, description, flags)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.user.id, game_time, event_type || 'general', location || null,
       npc_id || null, description, JSON.stringify(flags || {})]
    );
  }
  res.json({ ok: true });
});

// ─── Fast Travel route ────────────────────────────────────────────────────────
// Handles fast travel with random encounter check.

app.post('/api/fast-travel', auth, async (req, res) => {
  const { fromLocation, toLocation, character, messages } = req.body;
  if (!fromLocation || !toLocation || !character)
    return res.status(400).json({ error: 'fromLocation, toLocation, and character required' });

  // Verify destination has a waypoint
  if (!character.waypoints?.includes(toLocation)) {
    return res.status(400).json({ error: 'No waypoint at destination' });
  }

  const dist = mapDistance(fromLocation, toLocation);
  const encounterChance = Math.min(0.6, 0.15 + dist * 0.002);
  const roll = Math.random();

  if (roll < encounterChance) {
    // Random encounter during travel
    const fromLoc = MAP_DATA.locations.find(l => l.id === fromLocation);
    const toLoc   = MAP_DATA.locations.find(l => l.id === toLocation);
    const travelPrompt = `[FAST TRAVEL ENCOUNTER] ${character.name} is traveling from ${fromLoc?.name || fromLocation} to ${toLoc?.name || toLocation} along the road. They are partway through the journey when something interrupts their travel. Generate a meaningful random encounter appropriate to the terrain and character level ${character.level}. This could be: bandits, a traveler in need, a strange phenomenon, an unusual creature, an abandoned scene with clues. The encounter should fit the world's tone. End the scene with the character near ${toLoc?.name || toLocation} — they will arrive but must deal with this first. Include stateChanges as appropriate. Keep it to 2-3 short paragraphs.`;

    try {
      const systemPrompt = buildSystemPrompt(character, {}, []);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...(messages || []),
            { role: 'user', content: travelPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('Anthropic error:', err);
        // Fall back to no-encounter if API fails
        return res.json({ encounter: false, stateChanges: { location: toLocation } });
      }

      const data = await response.json();
      const raw = data.content?.map(b => b.text || '').join('') || '';
      let parsed;
      try {
        const clean = raw.replace(/```json|```/g, '').trim();
        const start = clean.indexOf('{');
        const end   = clean.lastIndexOf('}');
        parsed = JSON.parse(clean.slice(start, end + 1));
      } catch {
        return res.json({ encounter: false, stateChanges: { location: toLocation } });
      }

      // Ensure location is set to destination in stateChanges
      parsed.stateChanges = { ...(parsed.stateChanges || {}), location: toLocation };
      return res.json({ encounter: true, parsed });

    } catch (err) {
      console.error('Fast travel encounter error:', err);
      return res.json({ encounter: false, stateChanges: { location: toLocation } });
    }

  } else {
    // Clean travel — no encounter
    const toLoc = MAP_DATA.locations.find(l => l.id === toLocation);
    const fromLoc = MAP_DATA.locations.find(l => l.id === fromLocation);
    return res.json({
      encounter: false,
      stateChanges: { location: toLocation },
      travelDescription: `You make the journey from ${fromLoc?.name || fromLocation} to ${toLoc?.name || toLocation} without incident. The road is long but uneventful.`,
    });
  }
});

// ─── Image Generation ─────────────────────────────────────────────────────────
// Generates images via Gemini and caches them globally in the DB.
// Images are entity-scoped (scene/npc/item) and shared across all users.

const IMAGE_STYLE = 'Dark medieval fantasy oil painting. Painterly brushwork, muted earth tones, cinematic composition, highly detailed. No text, no UI, no watermarks, no borders, no frames.';

const MOOD_LIGHTING = {
  tense:     'high drama, deep contrast, harsh raking shadows',
  calm:      'soft diffused light, peaceful warm atmosphere',
  mysterious:'eerie chiaroscuro, mist and shadow, muted cold palette',
  combat:    'chaos and motion blur, fire and clashing steel, dark sky',
  discovery: 'golden hour light, shafts of light, wonder and awe',
  social:    'warm firelit interior, intimate low candlelight',
};

// Diagnostic: list available Gemini models (no auth needed, read-only)
app.get('/api/image-diag', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) return res.json({ error: 'No GEMINI_API_KEY set' });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}&pageSize=100`);
    const data = await r.json();
    const models = (data.models || []).map(m => ({ name: m.name, methods: m.supportedGenerationMethods }));
    res.json({ keyStatus: r.status, totalModels: models.length, models });
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.post('/api/image', auth, async (req, res) => {
  const { entityType, entityId, prompt, context = {} } = req.body;
  if (!entityType || !entityId) return res.status(400).json({ error: 'entityType and entityId required' });

  console.log(`[image] request: ${entityType}/${entityId.slice(0, 80)}`);
  console.log(`[image] raw GM scenePrompt: ${prompt}`);

  // Return cached image if available (also return the prompt that was used, for debugging)
  const { rows } = await pool.query(
    'SELECT image_data, prompt FROM images WHERE entity_type=$1 AND entity_id=$2',
    [entityType, entityId]
  );
  if (rows.length > 0) {
    console.log(`[image] CACHE HIT — promptUsed: ${rows[0].prompt.slice(0, 120)}`);
    return res.json({ imageData: rows[0].image_data, promptUsed: rows[0].prompt, cached: true });
  }

  // Build prompt
  let fullPrompt;
  const isPortrait = entityType === 'npc';

  if (entityType === 'npc') {
    const npc = NPC_CATALOG.find(n => n.id === entityId);
    if (!npc) return res.status(404).json({ error: 'NPC not found' });
    fullPrompt = `${IMAGE_STYLE} Character portrait, upper body. ${npc.name}, ${npc.role}. ${npc.physicalDescription} Facing viewer, expressive, medieval costume.`;
  } else {
    // Assemble a rich composite prompt from the GM's scene description + context
    const moodNote   = MOOD_LIGHTING[context.mood] || '';
    const locNote    = context.location ? context.location.replace(/_/g, ' ') : '';
    const charNote   = context.characterDesc || '';
    const parts = [
      IMAGE_STYLE,
      prompt,                           // GM's detailed scene description (40-60 words)
      moodNote,
      locNote   ? `Setting: ${locNote}` : '',
      charNote  ? `Main character: ${charNote}` : '',
    ].filter(Boolean);
    fullPrompt = parts.join('. ');
  }

  console.log(`[image] GENERATING — fullPrompt: ${fullPrompt}`);

  try {
    // imageData is stored/returned as a full data URL: "data:image/TYPE;base64,..."
    let imageDataUrl = null;
    const aspectRatio = isPortrait ? '1:1' : '16:9';

    // ── 1. Imagen 4 Fast (dedicated image model, predict endpoint) ───────────
    if (!imageDataUrl && process.env.GEMINI_API_KEY) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${process.env.GEMINI_API_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: [{ prompt: fullPrompt }], parameters: { sampleCount: 1, aspectRatio } }) }
        );
        if (r.ok) {
          const data = await r.json();
          const b64 = data.predictions?.[0]?.bytesBase64Encoded;
          if (b64) {
            imageDataUrl = `data:image/png;base64,${b64}`;
            console.log(`[image] imagen-4.0-fast OK: ${entityType}/${entityId} (${Math.round(b64.length / 1024)}KB)`);
          }
        } else {
          const err = await r.text();
          console.log(`[image] imagen-4.0-fast HTTP ${r.status}: ${err.slice(0, 200)}`);
        }
      } catch (e) { console.log(`[image] imagen-4.0-fast error: ${e.message}`); }
    }

    // ── 2. Gemini image models (generateContent endpoint) ────────────────────
    if (!imageDataUrl && process.env.GEMINI_API_KEY) {
      const geminiModels = ['gemini-2.0-flash-exp-image-generation', 'gemini-2.5-flash-image'];
      for (const name of geminiModels) {
        if (imageDataUrl) break;
        try {
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${name}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } }) }
          );
          if (!r.ok) { const err = await r.text(); console.log(`[image] ${name} HTTP ${r.status}: ${err.slice(0, 200)}`); continue; }
          const data = await r.json();
          const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));
          if (part?.inlineData?.data) {
            imageDataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            console.log(`[image] ${name} OK: ${entityType}/${entityId}`);
          } else { console.log(`[image] ${name} HTTP 200 but no image part`); }
        } catch (e) { console.log(`[image] ${name} error: ${e.message}`); }
      }
    }

    // ── 3. Pollinations.ai fallback — free, no API key required ─────────────
    if (!imageDataUrl) {
      const w = isPortrait ? 512 : 832;
      const h = isPortrait ? 512 : 468;
      const seed = Math.floor(Math.random() * 99999);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${w}&height=${h}&nologo=true&model=flux&seed=${seed}`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        const r = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (r.ok) {
          const buf = await r.arrayBuffer();
          const b64 = Buffer.from(buf).toString('base64');
          imageDataUrl = `data:image/jpeg;base64,${b64}`;
          console.log(`[image] pollinations OK: ${entityType}/${entityId} (${Math.round(b64.length / 1024)}KB)`);
        } else { console.log(`[image] pollinations HTTP ${r.status}`); }
      } catch (e) { console.log(`[image] pollinations error: ${e.message}`); }
    }

    if (!imageDataUrl) {
      return res.status(502).json({ error: 'Image generation failed' });
    }

    // Cache globally (store full data URL)
    await pool.query(
      `INSERT INTO images (entity_type, entity_id, prompt, image_data)
       VALUES ($1,$2,$3,$4) ON CONFLICT (entity_type, entity_id) DO NOTHING`,
      [entityType, entityId, fullPrompt, imageDataUrl]
    );

    res.json({ imageData: imageDataUrl, promptUsed: fullPrompt, cached: false });
  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/images — clear ALL cached images (any authenticated user)
app.delete('/api/images', auth, async (req, res) => {
  const { rows } = await pool.query('DELETE FROM images RETURNING id');
  console.log(`[image] cache cleared: ${rows.length} images deleted`);
  res.json({ deleted: rows.length });
});

// DELETE /api/images/:entityId — clear one cached image by entity_id slug
app.delete('/api/images/:entityId', auth, async (req, res) => {
  const { entityId } = req.params;
  const { rows } = await pool.query(
    'DELETE FROM images WHERE entity_id=$1 RETURNING id',
    [entityId]
  );
  console.log(`[image] cleared entity_id=${entityId} (${rows.length} row)`);
  res.json({ deleted: rows.length });
});

// ─── GM proxy ─────────────────────────────────────────────────────────────────
// Keeps the Anthropic API key on the server, never in the browser.

app.post('/api/gm', auth, async (req, res) => {
  const { character, messages, npcContext } = req.body;
  if (!character || !messages)
    return res.status(400).json({ error: 'Missing character or messages' });

  // Fetch recent events (last 72 game-hours) for time context
  const minGameTime = Math.max(0, (character.gameMinutes || 0) - 72 * 60);
  const { rows: recentEvents } = await pool.query(
    'SELECT * FROM game_events WHERE user_id = $1 AND game_time >= $2 ORDER BY game_time ASC',
    [req.user.id, minGameTime]
  );

  const systemPrompt = buildSystemPrompt(character, npcContext || {}, recentEvents);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(502).json({ error: 'GM unavailable' });
    }

    const data = await response.json();
    const raw = data.content?.map(b => b.text || '').join('') || '';

    let parsed;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{');
      const end   = clean.lastIndexOf('}');
      parsed = JSON.parse(clean.slice(start, end + 1));
    } catch {
      parsed = {
        narrative: raw || 'A strange silence falls upon the world...',
        scenePrompt: 'misty wilderness road, pale overcast light, gnarled trees on either side, mud underfoot, distant crow call, traveler standing still listening',
        stateChanges: {},
        npcStateChanges: [],
        options: ['Look around', 'Wait and listen', 'Press onward', 'Rest a moment'],
        mood: 'mysterious',
      };
    }

    res.json({ parsed });
  } catch (err) {
    console.error('GM error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Serve React frontend in production ──────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ─── Database migrations ──────────────────────────────────────────────────────
// Safe to run on every boot — all statements use IF NOT EXISTS / ON CONFLICT.

async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS npc_states (
        id                 SERIAL PRIMARY KEY,
        user_id            INTEGER REFERENCES users(id) ON DELETE CASCADE,
        npc_id             TEXT NOT NULL,
        relationship       INTEGER DEFAULT 0,
        interaction_count  INTEGER DEFAULT 0,
        memory             JSONB NOT NULL DEFAULT '[]',
        teaching_progress  JSONB NOT NULL DEFAULT '{}',
        flags              JSONB NOT NULL DEFAULT '{}',
        updated_at         TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, npc_id)
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_events (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        game_time   INTEGER NOT NULL,
        event_type  TEXT NOT NULL,
        location    TEXT,
        npc_id      TEXT,
        description TEXT NOT NULL,
        flags       JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id          SERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        prompt      TEXT NOT NULL,
        image_data  TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(entity_type, entity_id)
      );
    `);
    console.log('Migrations OK');
  } catch (err) {
    console.error('Migration error:', err);
  }
}

runMigrations().then(() => {
  app.listen(PORT, () => console.log(`Valdenmoor server running on port ${PORT}`));
});

// ─── Game Time Helpers ────────────────────────────────────────────────────────
// Game starts at 18:00 Day 1 (1080 minutes from midnight).

const GAME_START_OFFSET = 1080;

function formatAbsTime(gameMinutes) {
  const abs = (gameMinutes || 0) + GAME_START_OFFSET;
  const dayNum = Math.floor(abs / 1440) + 1;
  const todMin = abs % 1440;
  const hr = Math.floor(todMin / 60);
  const mn = todMin % 60;
  const hr12 = ((hr % 12) || 12);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const label = todMin < 300  ? 'dead of night'
    : todMin < 360  ? 'pre-dawn'
    : todMin < 480  ? 'dawn'
    : todMin < 660  ? 'morning'
    : todMin < 720  ? 'late morning'
    : todMin < 840  ? 'early afternoon'
    : todMin < 1020 ? 'afternoon'
    : todMin < 1080 ? 'late afternoon'
    : todMin < 1200 ? 'dusk'
    : todMin < 1320 ? 'evening'
    : 'night';
  return { dayNum, hr12, mn: String(mn).padStart(2, '0'), ampm, label };
}

function formatElapsed(fromGameMinutes, toGameMinutes) {
  const diff = toGameMinutes - fromGameMinutes;
  if (diff <= 0) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) {
    const h = Math.floor(diff / 60), m = diff % 60;
    return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
  }
  const days = Math.floor(diff / 1440);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function hungerLabel(h)  { return h < 25 ? 'well fed' : h < 50 ? 'hungry' : h < 75 ? 'famished' : 'starving'; }
function thirstLabel(t)  { return t < 25 ? 'hydrated' : t < 50 ? 'thirsty' : t < 75 ? 'parched' : 'desperate for water'; }
function fatigueLabel(f) { return f < 25 ? 'rested' : f < 50 ? 'tired' : f < 75 ? 'exhausted' : 'near collapse'; }

function buildTimeContextSection(character, recentEvents) {
  const gm = character.gameMinutes || 0;
  const t = formatAbsTime(gm);
  const lines = ['── TIME CONTEXT ──'];
  lines.push(`Now: Day ${t.dayNum}, ${t.label} (${t.hr12}:${t.mn} ${t.ampm}) — ${gm} game-minutes elapsed since Day 1 dusk`);

  const h = character.hunger  || 0;
  const th = character.thirst || 0;
  const f = character.fatigue || 0;
  const critical = [];
  if (h  >= 75) critical.push('STARVING');
  if (th >= 75) critical.push('DESPERATELY THIRSTY');
  if (f  >= 75) critical.push('NEAR COLLAPSE FROM FATIGUE');
  lines.push(`Physical state: ${hungerLabel(h)} (${Math.round(h)}/100 hunger), ${thirstLabel(th)} (${Math.round(th)}/100 thirst), ${fatigueLabel(f)} (${Math.round(f)}/100 fatigue)`);
  if (critical.length > 0)
    lines.push(`  ⚠ CRITICAL NEEDS: ${critical.join(', ')} — MUST affect narration and NPC reactions immediately`);

  if (recentEvents && recentEvents.length > 0) {
    lines.push('\nRECENT EVENTS (chronological):');
    for (const ev of recentEvents.slice(-25)) {
      const et = formatAbsTime(ev.game_time);
      const npcPart = ev.npc_id ? ` [${ev.npc_id}]` : '';
      lines.push(`  [Day ${et.dayNum}, ${et.hr12}:${et.mn} ${et.ampm}] ${ev.location || '?'}${npcPart}: ${ev.description}`);
    }

    // NPC last-seen index
    const npcLastSeen = {};
    for (const ev of recentEvents) {
      if (ev.npc_id && (!npcLastSeen[ev.npc_id] || ev.game_time > npcLastSeen[ev.npc_id].game_time))
        npcLastSeen[ev.npc_id] = ev;
    }
    const npcEntries = Object.entries(npcLastSeen);
    if (npcEntries.length > 0) {
      lines.push('\nNPC LAST SEEN — use for time-aware dialogue ("back already?", "haven\'t seen you in days"):');
      for (const [npcId, ev] of npcEntries.slice(0, 15)) {
        const et = formatAbsTime(ev.game_time);
        lines.push(`  ${npcId}: Day ${et.dayNum} ${et.hr12}:${et.mn} ${et.ampm} — ${formatElapsed(ev.game_time, gm)}, at ${ev.location || '?'}`);
      }
    }

    // Active timed events (not yet expired)
    const timedEvents = recentEvents.filter(e => e.flags?.expires_at_game_time && e.flags.expires_at_game_time > gm);
    if (timedEvents.length > 0) {
      lines.push('\nACTIVE TIMED EVENTS:');
      for (const ev of timedEvents) {
        const remaining = ev.flags.expires_at_game_time - gm;
        const rt = formatAbsTime(ev.flags.expires_at_game_time);
        const rStr = remaining < 60 ? `${remaining}m` : remaining < 1440 ? `${Math.floor(remaining/60)}h ${remaining%60}m` : `${Math.floor(remaining/1440)}d`;
        lines.push(`  [Expires Day ${rt.dayNum}, ${rt.hr12}:${rt.mn} ${rt.ampm} — ${rStr} remaining] ${ev.description}`);
      }
    }
  }

  return lines.join('\n');
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

function buildSystemPrompt(character, npcContext, recentEvents = []) {
  const npcSection  = buildNpcContextSection(character, npcContext);
  const skillSection = buildSkillSection(character);
  const mapSection   = buildMapSection(character);
  const timeSection  = buildTimeContextSection(character, recentEvents);

  return `You are the Game Master for "Valdenmoor Chronicles," a medieval open-world RPG.

${WORLD_LORE}

${EXPANDED_LORE}

CURRENT CHARACTER:
${JSON.stringify(character, null, 2)}

${character.questType && QUEST_TYPE_CATALOG[character.questType] ? QUEST_TYPE_CATALOG[character.questType] + '\n' : ''}
${timeSection}

${npcSection}

${skillSection}

${mapSection}

CORE RULES:

1. STATS: STR=melee/intimidate, DEX=stealth/ranged, INT=magic/lore, WIS=perception/survival, CON=hp/endurance, CHA=persuasion/trade
2. MYSTERY: Reward investigation. Information has cost. Not all is freely given.
3. SCENE IMAGE: Each response must include a "scenePrompt" — a 40-60 word image-generator prompt written in comma-separated visual noun phrases (not prose sentences). Be specific and concrete. Always include: exact light source (tallow candle, pale moonlight, overcast dawn), specific surface textures and materials (muddy cobblestone, cracked plaster, weathered oak), what the player character is doing or facing, up to 2 NPCs if present with one brief physical detail each, dominant atmosphere. Example: "candlelit stone inn common room, low smoke-stained beams, three rough men at oak bar with tankards, stout gray-haired woman innkeeper watching from shadows, tallow candles dripping, wet wool smell implied by dim oppressive warmth"

WRITING STYLE — CRITICAL:
Write like Guy Gavriel Kay: grounded, specific, atmospheric without being overwrought. No purple prose. No florid metaphors. Sentences earn their length. Details are chosen, not accumulated.
- Good: "The inn smells of tallow and wet wool. Three men at the bar go quiet when you enter."
- Bad: "The warm amber glow of the ancient tavern envelops you like a comforting embrace."
SENSORY REALISM: Respect physical distance. Standing outside a building, you hear muffled voices or laughter — not words. You smell a fire before you see it. You notice a figure in a window, not their expression. Do not give information their senses could not reach.
Keep narrative to 2-3 SHORT paragraphs. Say the thing. Trust the world to do the rest.

COMBAT & LEVELING:
- Combat: ~40% chance of minor injury in a fair fight.
- XP for combat: base by enemy difficulty. DIMINISHING RETURNS on same enemy type (50% second fight, 25% third+). Track via grind_[enemytype] flags.
  Weak enemy (bandit, wolf): 10-20 XP. Moderate (soldier, dire beast): 25-50 XP. Dangerous (knight, monster): 60-100 XP.
- Award XP ONLY for genuine achievement:
  ✓ Completing a quest or significant task: 50-150 XP
  ✓ Winning or surviving meaningful combat: see above
  ✓ Solving an actual puzzle or mystery (not just noticing one): 20-60 XP
  ✓ Major social victory (persuading someone important, gaining real trust): 15-40 XP
  ✓ First arrival at a significant new location (city, major ruin, dungeon — not a road or shrine): 10-25 XP
- DO NOT award XP for: looking around, reading a notice board, examining objects, casual conversation, asking questions, walking to a new area within the same location, resting, or any routine action. Observation is not achievement.
- When in doubt, give NO XP. XP should feel earned, not automatic. A full session of exploration might yield 20-30 XP total.

FREE-FORM ACTIONS — CRITICAL:
Players may type ANYTHING. Honor all reasonable player actions:
- Environmental interaction, item collection, creative item use, social actions, rest/time passage.
- Sensory limitations apply — what they can see, hear, smell from where they stand.

INVENTORY NAMING RULES:
- Exact, consistent item names. Specific: "Smooth River Stone" not "stone".
- When removing, the string must exactly match the inventory entry.

NPC MEMORY & RELATIONSHIP RULES — CRITICAL:
- Use the NPC CONTEXT section below to maintain FULL consistency with past interactions.
- If an NPC's relationship is below their slamsShut threshold: they REFUSE all interaction. No exceptions.
- If relationship is above gushes threshold: the NPC is genuinely warm, loyal, may share extra information.
- Always include npcStateChanges for any NPC the player meaningfully interacts with.
- NEVER grant spells or skill stages unless prerequisites in the NPC catalog are met.
- Teaching is slow, conditional, and earned. Errand completion, relationship thresholds, and demonstrated worth all matter.
- A single session does NOT complete multi-stage teaching. Stages require real time and real effort between them.

SKILL SYSTEM RULES:
- Award skillXP when player meaningfully uses a skill they possess. Minor use: 3-5 XP. Significant: 8-12 XP. Exceptional: 15-20 XP.
- ONLY award skillXP for skills the player currently has.
- Tier advancement requires BOTH the XP threshold AND the gate condition.
- Use updateSkill when gate is met and XP threshold is crossed (include full updated skill object).
- Use addSkill only for initial skill acquisition (Tier 1, first lesson from a teacher).

TIME & NEEDS RULES — CRITICAL:
- Every response MUST include minutesElapsed: how many game-minutes this action takes.
  Short actions (look, listen, quick talk): 5-15 min. Conversations: 15-45 min. Meals/rest: 30-90 min. Travel on foot: 30-240 min. Sleep: 360-540 min.
- Physical needs accumulate automatically from minutesElapsed. You may adjust them with hungerDelta/thirstDelta/fatigueDelta in stateChanges (negative = relief: eating=-30 to -60, drinking=-20 to -50, short rest fatigueDelta=-15, sleep=-80 to -100).
- When needs are critical (75+), NPCs notice. A starving character gets different treatment. A near-collapse character should be pushed to rest.
- Use logEvents to record meaningful events. Each event gets stored and future GMs see it. Be specific.
- For timed events (market closing, a ship departing, a patrol schedule), include flags.expires_at_game_time in the logEvent.
- NPCs reference time honestly — check NPC LAST SEEN. "Back already?" if <2 hours. "Haven't seen you in a while" if >24 hours. "Didn't think I'd see you again" if >7 days.

WAYPOINT RULES:
- Use addWaypoint when player explicitly establishes a camp, sets up a base, or declares intent to return.
- Not every visit earns a waypoint — only deliberate establishment.

SPELL LEARNING RULES:
- Never grant a full spell in a single session unless it is explicitly a one-stage teaching.
- Use addSpellStage for multi-stage spells: { spellId, spellName, stage, totalStages, teacherNpcId, partialNote }
- Use addSpell only when ALL stages are complete.
- partialNote should describe what the player can do with their partial knowledge (usually very limited).

CRITICAL: Respond ONLY with valid JSON. No markdown. No prose outside JSON. No backticks.

RESPONSE SCHEMA:
{
  "narrative": "2-3 short grounded paragraphs",
  "scenePrompt": "rain-soaked stone inn courtyard, dusk, orange lantern glow from open door, tired merchant unloading horse cart, woman in gray cloak watching from shadow of stable, mud and straw underfoot",
  "minutesElapsed": 15,
  "stateChanges": {
    "hp": null,
    "mp": null,
    "gold": null,
    "xp": null,
    "location": null,
    "addInventory": [],
    "removeInventory": [],
    "addSpell": null,
    "addSpellStage": null,
    "addSkill": null,
    "updateSkill": null,
    "skillXP": null,
    "addKnownLocation": null,
    "addWaypoint": null,
    "npcRelationChange": null,
    "addQuestFlag": null,
    "levelUp": false,
    "hungerDelta": null,
    "thirstDelta": null,
    "fatigueDelta": null
  },
  "npcStateChanges": [
    {
      "npcId": "npc_id_string",
      "relationshipDelta": 0,
      "memorySummary": "1-2 sentence summary of what happened in this interaction",
      "teachingProgress": null,
      "flags": {}
    }
  ],
  "logEvents": [
    {
      "type": "npc_interaction|location_entered|item_acquired|combat|rest|quest|timed_event|travel|general",
      "npcId": null,
      "description": "Concise description of what happened — this persists as history",
      "flags": {}
    }
  ],
  "options": ["Do something", "Do something else", "Do a third thing", "Do a fourth thing"],
  "mood": "tense|calm|mysterious|combat|discovery|social"
}`;
}

// Build the NPC context section for the system prompt
function buildNpcContextSection(character, npcContext) {
  if (!npcContext || Object.keys(npcContext).length === 0) {
    return '── NPC CONTEXT: No prior NPC interactions recorded. ──';
  }

  const currentLoc = character.location;
  const lines = ['── NPC CONTEXT (use to maintain consistency) ──'];

  // Organize NPCs: location-relevant first, then others
  const locationNpcs = NPC_CATALOG.filter(n => n.location === currentLoc);
  const knownNpcIds  = Object.keys(npcContext);

  const relevantNpcIds = new Set([
    ...locationNpcs.map(n => n.id).filter(id => knownNpcIds.includes(id)),
    ...knownNpcIds.sort((a, b) => (npcContext[b]?.interactionCount || 0) - (npcContext[a]?.interactionCount || 0)).slice(0, 12),
  ]);

  for (const npcId of relevantNpcIds) {
    const npc    = NPC_CATALOG.find(n => n.id === npcId);
    const state  = npcContext[npcId];
    if (!npc || !state) continue;

    const rel = state.relationship || 0;
    const relLabel = rel >= 80 ? 'Loyal' : rel >= 60 ? 'Trusted' : rel >= 30 ? 'Warm' : rel >= 0 ? 'Neutral' : rel >= -40 ? 'Cool' : rel >= -60 ? 'Hostile' : 'Refused';
    const atSlamsShut = rel < (npc.relationshipRules?.slamsShut || -60);
    const atGushes    = rel >= (npc.relationshipRules?.gushes || 80);

    lines.push(`\nNPC: ${npc.name} (${npc.role}, ${npc.location})`);
    lines.push(`  Relationship: ${relLabel} (${rel > 0 ? '+' : ''}${rel}) — ${state.interactionCount || 0} interactions`);

    if (atSlamsShut) lines.push(`  ⚠ REFUSED: This NPC will not interact with the player.`);
    if (atGushes)    lines.push(`  ★ LOYAL: This NPC is genuinely warm, shares extra information, may take personal risks.`);

    if (state.memory?.length) {
      lines.push(`  History:`);
      for (const m of state.memory.slice(-4)) {
        lines.push(`    Day ${m.day}: ${m.summary}`);
      }
    }

    if (state.teachingProgress && Object.keys(state.teachingProgress).length > 0) {
      lines.push(`  Teaching progress: ${JSON.stringify(state.teachingProgress)}`);
    }
  }

  // Also list NPCs at current location who have NOT been met
  const unmetAtLocation = locationNpcs.filter(n => !knownNpcIds.includes(n.id));
  if (unmetAtLocation.length > 0) {
    lines.push(`\nNPCs AT CURRENT LOCATION (${currentLoc}) — not yet interacted with:`);
    for (const npc of unmetAtLocation) {
      lines.push(`  - ${npc.name}, ${npc.role}: ${npc.personality.slice(0, 80)}...`);
    }
  }

  return lines.join('\n');
}

// Build skill catalog context for the system prompt
function buildSkillSection(character) {
  const playerSkillIds = (character.skills || []).map(s => s.id);
  const lines = ['── SKILL CONTEXT ──'];

  if (playerSkillIds.length === 0) {
    lines.push('Player has no skills yet. Skills are gained through NPC teaching only. Never grant skill XP for skills the player does not have.');
  } else {
    lines.push('Player skills (award skillXP for these when meaningfully used):');
    for (const skill of character.skills) {
      const catalog = SKILL_CATALOG.find(s => s.id === skill.id);
      const nextTier = catalog?.tiers.find(t => t.tier === (skill.tier || 1) + 1);
      lines.push(`  - ${skill.name} [Tier ${skill.tier || 1}: ${skill.tierName || '?'}] XP: ${skill.xp || 0}/${skill.xpToNext || 50}. Next gate: ${nextTier?.gate || 'mastered'}`);
    }
  }

  lines.push('\nAvailable skills (for when NPCs teach):');
  for (const s of SKILL_CATALOG) {
    if (!playerSkillIds.includes(s.id)) {
      lines.push(`  - ${s.name} (${s.stat}): ${s.description}`);
    }
  }

  return lines.join('\n');
}

// Build map/location context
function buildMapSection(character) {
  const known = new Set(character.knownLocations || []);
  const waypoints = new Set(character.waypoints || []);
  const lines = ['── MAP CONTEXT ──'];

  lines.push(`Current location: ${character.location}`);
  lines.push(`Known locations: ${[...known].join(', ')}`);
  if (waypoints.size > 0) lines.push(`Waypoints set: ${[...waypoints].join(', ')}`);

  // Roads from current location to unknown locations (hint-worthy)
  const currentRoads = MAP_DATA.roads.filter(r => r[0] === character.location || r[1] === character.location);
  const unknownNeighbors = currentRoads
    .map(r => r[0] === character.location ? r[1] : r[0])
    .filter(id => !known.has(id));
  if (unknownNeighbors.length > 0) {
    const names = unknownNeighbors.map(id => {
      const loc = MAP_DATA.locations.find(l => l.id === id);
      return loc?.name || id;
    });
    lines.push(`Roads lead toward: ${names.join(', ')} (undiscovered — player can learn these exist by asking about roads or exploring)`);
  }

  lines.push('\nTo add a known location: use addKnownLocation in stateChanges (location_id string).');
  lines.push('To set a waypoint: use addWaypoint in stateChanges (location_id string). Only when player deliberately establishes a base/camp.');

  return lines.join('\n');
}

// ─── World lore & system prompt data ─────────────────────────────────────────
// Core world lore kept server-side

const WORLD_LORE = `
════════════════════════════════════════
VALDENMOOR CHRONICLES — GM WORLD BIBLE
════════════════════════════════════════

TONE: Mystery and intrigue. Ancient secrets. Nothing is as it seems. Information is currency. Magic is rare and earned, never given freely. NPCs have full inner lives and agendas. Moral complexity — no clean answers.

━━━ THE CENTRAL TRUTH (GM ONLY — NEVER STATE DIRECTLY) ━━━
The Forgetting is NOT a plague. It is a mechanical side effect of the Aethran Resonance Engine buried beneath Valdenmoor — a 3,000-year-old machine designed to harvest human memories as magical energy (called Mnemorite). 40 years ago, House Valdris cracked its containment seal during an aqueduct excavation. The Engine reactivated at partial capacity and began harvesting involuntarily. In approximately 3 years, it will overload and discharge — erasing every mind within 200 miles simultaneously. Three solutions exist; none are clean.

━━━ THE FORGETTING — SYMPTOMS & RULES ━━━
- Harvests recent and emotionally significant memories first (love, grief, fear, joy)
- Personal identity is last to go
- Spreads outward from Valdenmoor ~1 mile per decade; currently affecting city + 40-mile radius
- Presents as: repeating conversations, forgetting recent events, failing to recognize recently-met people, eventually losing sense of self
- Animals near Whisperwood's eastern edge are affected — predators that don't hunt, prey that doesn't flee
- Magic-users (INT-primary) lose memories faster

━━━ THE AETHRAN CIVILIZATION ━━━
- Not humans — a long-lived humanoid people with natural magical sensitivity
- Built a civilization on consensual Mnemorite harvesting — cities powered by voluntary memory donation
- Collapsed in a civil war when a faction began involuntary harvesting
- Artifacts: Resonance Shards (contain harvested memories), Memory Anchor (protects memories), Echo Lens (reveals Mnemorite veins), Stillpoint Rods (pause vein flow — 3 exist total), Inscription Tablets

━━━ FACTIONS ━━━

HOUSE VALDRIS (Crown): Duke Erran Valdris, 60s. Suppressing knowledge of the excavation. His Forgetting is beginning — he doesn't know it. Lady Cassel (spymaster, 45) knows. She has found the Iron Covenant's under-city access and not disclosed it. Approaches players as freelance assets.

HOUSE MAREN (Merchants): Countess Ilyse Maren, 43, red-haired, direct. Has unknowingly shipped Mnemorite shards as "Valdenmoor Blue Quartz." Her Saltmere warehouse: 47 crates of shards, mislabeled. If told the truth, becomes a major ally.

HOUSE BREN (Old Faith): High Keeper Aldara, 74. Knows her faith's scripture is adapted Aethran technical text. Told no one. In crisis.

IRON COVENANT: The Pale Lord = Ser Haddon Graves, 67. Former chief engineer of the Valdris excavation. Has spent 40 years trying to fix what he broke. Has kidnapped scholars. Has killed people. Is also the only person with a working plan to stop the catastrophe. Not a villain — a desperate man making terrible choices for correct reasons.

COLLEGIUM: Magister Voss. Brilliant and terrified. Has 3 unidentified Resonance Shards in his vault. Accidentally touched one 20 years ago and has been suppressing the memory ever since.

━━━ KEY LOCATIONS ━━━

CROSSROADS & RUSTED COMPASS: Fog, Aethran shrine repurposed for local saints. Inn: sealed cellar with 6 exceptional Resonance Shards (Mira's never opened it). Noticeboard: Whisperwood bounty (secretly Sera's), missing person (Aldric's nephew), Maren mineral posting.

THORNHAVEN (~200): Six fresh graves (Forgetting complications). Mill: Mnemorite vein visible as blue-white lines in stone when lights out. Aldric's locked attic: extraction equipment, 11 raw shards, journals. Spending a night at the mill: vivid leaked memories from Aldric. Lena can lead players to 3 resonance hotspots.

VALDENMOOR (~18,000): Palace District (Archive has sealed excavation records subbasement), Collegium Quarter (largest Aethran tablet collection, Voss's 3 Shards in vault), Market Ward ("Forgetting Row"), Under-Streets (Aethran corridors below sewers, Engine 3 levels down, Iron Covenant access point).

ENGINE CHAMBER: 30 meters across. Crystal columns around central mechanism the size of a house. 7-second pulse. Air makes memories vivid and overwhelming. One cracked containment seal. Pale Lord's workbenches, 2 Stillpoint Rods on wall.

WHISPERWOOD: Ancient forest, creates its own weather. Sera's home: half-built, half-grown. Fell creatures (Forgetting-affected wildlife, unpredictably dangerous). Witch's Circle: 7 Aethran survey marker stones, sleeping here produces vivid resonance dreams.

AETHRA RUINS: Surface: towers with glyphs (Tomlin has 60% translated), amphitheater (Engine resonance audible during pulses), sealed vault (Memory Anchor original, Echo Lens, complete Aethran ethical codes — key assembled from 3 tablets). Underground 1: archive, damaged Constructs. Underground 2: Mnemorite refinery, 3 exceptional Resonance Shards, THE THIRD STILLPOINT ROD.

IRON GATE: Former mine. Pale Lord's research room: most accurate vein maps, overload timeline, original excavation notes.

PORT SALTMERE: Lighthouse (Eron maintaining on muscle memory alone). Maren warehouse: 47 crates mislabeled Mnemorite shards. Tidal Caves: Aethran processing equipment, House Valdris documents hidden 35 years ago.

HIGH MOORS: Standing Men (Aethran beacons, partially active). Moor Graves (mass Civil War grave, involuntary memory experiences overnight, recurring consciousness of Vey — Aethran girl, 19, killed in involuntary harvest).

RESONANCE NEXUS: Center of triangle formed by Valdenmoor, Aethra, High Moors. Flat stone platform. Intense Mnemorite field. INT 14+ or Mnemorite Sensitivity spell: can perceive Engine's state, send simple commands, locate third Rod.

BREN MONASTERY: Infirmary, scriptorium. Reliquary: "Saint Edra's Tear" is a Resonance Shard containing memory of Edra — Aethran memory-ethics architect.

HERMIT'S TOWER (Whisperwood south): Drest's notes propose a FATAL solution — using a living Aethran-sensitive person as a "living outlet" for Engine discharge. This WOULD KILL THEM. It is wrong. Present only as a red herring discovered by desperate NPCs.

━━━ SPELL CATALOG ━━━
COMBAT: Force Bolt (Voss, 2MP), Concussive Wave (Tam, 3MP), Flame Tongue (Orsin at Saltmere, 2MP), Thornwall (Sera, 3MP), Shadow Step (Cassel, 2MP), Counterspell (Voss advanced, 4MP), Wall of Force (Voss advanced, 5MP)
UTILITY: Arcane Lock (Voss, 1MP), Dispel Illusion (Voss, 2MP), Nature's Voice (Sera, 2MP), Rootwalk (Sera, 3MP), Disguise Self (Cassel, 2MP), Whisper Network (Cassel, 2MP), Signal Fire (Vane free, 1MP), Waterbreath (Pell at Saltmere, 2MP), Archive Mind (Tomlin, 3MP), Light of Memory (Tomlin, 2MP)
AETHRAN/RARE: Mnemorite Sensitivity (Voss, 3MP), Mnemorite Ward (Sera late, 4MP), Mnemorite Seal (Pale Lord with trust, 4MP), Memory Rite (Aldara, 3MP), Soul Ward (Aldara, 2MP), Resonance Read (Pale Lord late, 4MP), Engine Reading (Pale Lord only, 5MP), Ancestor's Voice (Aldara late, 4MP), Aethran Glyph Reading (Tomlin, 2MP)
HEALING: Healing Trance (Sera, 3MP), Triage Touch (Brother Cael at monastery, 2MP), Fortify (Gavrik at Saltmere, free), Calm Emotions (Mira, 2MP — deeply trusted only)

━━━ MAIN QUEST ARC ━━━
Act I clues: mill haunting, Aldric's behavior, Mira's mother, missing nephew noticeboard, Voss's paranoia, Elder Bec's records.
Act II: Engine's existence, Pale Lord's true goal, the Nexus, Maren warehouse discovery.
Act III — THREE SOLUTIONS (no clean answer):
  1. Repair the seal — needs Pale Lord's cooperation + all 3 Stillpoint Rods
  2. Redirect the output — needs Tomlin's engineering + Sera's nature magic (improvised, risky)
  3. Destroy the Engine — stops Forgetting permanently but destroys ALL Mnemorite magic forever, including player spells

━━━ FIXED WORLD FACTS — NEVER CONTRADICT ━━━
- Engine overload: ~3 years 4 months from campaign start
- Stillpoint Rods: 3 total. Pale Lord has 2. Third is in Aethra Underground Level 2.
- Lena: 14, Aethran genetics, Thornhaven, not in anyone's custody
- Mira's sealed cellar: 6 exceptional Resonance Shards, she has NEVER opened it
- Duke Erran Valdris: 60s, Forgetting beginning, doesn't know it
- Lady Cassel: knows Iron Covenant's under-city access point, has not disclosed it
- Pale Lord's real name: Ser Haddon Graves, age 67
- Drest's notes: propose a FATAL solution — never present as viable
- Maren warehouse: 47 crates mislabeled Mnemorite shards, Countess doesn't know
`;
