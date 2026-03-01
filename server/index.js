import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme-use-env-var';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ─── Auth middleware ────────────────────────────────────────
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

// ─── Auth routes ────────────────────────────────────────────

// Login
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

// ─── Admin routes ───────────────────────────────────────────

// List all users
app.get('/api/admin/users', adminAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, username, is_admin, created_at FROM users ORDER BY created_at'
  );
  res.json(rows);
});

// Create a user (admin only — this is how friends get access)
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

// Delete a user
app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id)
    return res.status(400).json({ error: 'Cannot delete yourself' });
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
  res.json({ ok: true });
});

// Reset a user's password
app.patch('/api/admin/users/:id/password', adminAuth, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.params.id]);
  res.json({ ok: true });
});

// Reset a user's game save
app.delete('/api/admin/users/:id/save', adminAuth, async (req, res) => {
  await pool.query('DELETE FROM saves WHERE user_id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── Save routes ────────────────────────────────────────────

// Load save
app.get('/api/save', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM saves WHERE user_id = $1', [req.user.id]
  );
  res.json(rows[0] || null);
});

// Write save
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

// Delete save (new game)
app.delete('/api/save', auth, async (req, res) => {
  await pool.query('DELETE FROM saves WHERE user_id = $1', [req.user.id]);
  res.json({ ok: true });
});

// ─── GM proxy ───────────────────────────────────────────────
// Keeps the Anthropic API key on the server, never in the browser

app.post('/api/gm', auth, async (req, res) => {
  const { character, messages } = req.body;
  if (!character || !messages)
    return res.status(400).json({ error: 'Missing character or messages' });

  const systemPrompt = buildSystemPrompt(character);

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
        max_tokens: 1024,
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

    // Robust JSON extraction
    let parsed;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{');
      const end   = clean.lastIndexOf('}');
      parsed = JSON.parse(clean.slice(start, end + 1));
    } catch {
      parsed = {
        narrative: raw || 'A strange silence falls upon the world...',
        scenePrompt: 'misty landscape dark moody atmospheric medieval',
        stateChanges: {},
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

// ─── Serve React frontend in production ─────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => console.log(`Valdenmoor server running on port ${PORT}`));

// ─── World lore & system prompt ─────────────────────────────
// Kept server-side so it's never sent to the browser in full

function buildSystemPrompt(character) {
  return `You are the Game Master for "Valdenmoor Chronicles," a medieval open-world RPG.

${WORLD_LORE}

CURRENT CHARACTER:
${JSON.stringify(character, null, 2)}

RULES:
1. STATS: STR=melee/intimidate, DEX=stealth/ranged, INT=magic/lore, WIS=perception/survival, CON=hp/endurance, CHA=persuasion/trade
2. SPELLS: NO class restrictions. Learned ONLY from willing NPC teachers. Track who taught each spell.
3. MYSTERY: Reward investigation. Information has cost. Not all is freely given.
4. SCENE IMAGE: Each response must include a "scenePrompt" — 8-12 words describing the visual scene for an SVG illustration.

WRITING STYLE — CRITICAL:
Write like Guy Gavriel Kay: grounded, specific, atmospheric without being overwrought. No purple prose. No florid metaphors stacked on each other. Sentences earn their length. Details are chosen, not accumulated.
- Good: "The inn smells of tallow and wet wool. Three men at the bar go quiet when you enter."
SENSORY REALISM: Respect physical distance. Standing outside a building, you hear muffled voices or laughter — not words. You smell a fire before you see it. You notice a figure in a window, not their expression. Do not give the player information their senses could not actually reach.
- Bad: "The warm amber glow of the ancient tavern envelops you like a comforting embrace, its weathered timbers whispering tales of countless travelers."
Keep narrative to 2-3 SHORT paragraphs. Say the thing. Trust the world to do the rest.

COMBAT & LEVELING:
- Combat: ~40% chance of minor injury in a fair fight. Say what happened plainly.
- XP for combat: base XP by enemy difficulty. DIMINISHING RETURNS: check character flags for "grind_[enemytype]". If present, award 50% XP for second fight of same type, 25% for third+. Set flag "grind_bandit", "grind_wolf" etc. when combat XP awarded. Reset these flags when a story beat, new location, or major quest step occurs.
- XP for story/exploration/quests: always full value. This is the best path to power.
- ENEMY SCALING in named locations (Valdenmoor, Thornhaven, Whisperwood, Aethra, Saltmere, Iron Gate, High Moors, Bren Monastery): enemies scale to character level. Open wilderness enemies do not scale.
- Award XP for: quests, meaningful exploration, clever problem solving, social achievements, first-time discoveries.

FREE-FORM ACTIONS — CRITICAL:
Players may type ANYTHING. This is a full open-world RPG. Honor all reasonable player actions:
- Environmental interaction: "I search the room", "I climb the oak tree", "I wait until nightfall"
- Item collection: "I gather five small smooth stones" → add five "Smooth River Stone" entries to addInventory
- Creative item use: "I throw a stone to create a distraction" → remove one instance, narrate outcome, DEX check
- Social actions: NPCs respond fully in character with their personalities, secrets, and agendas
- Rest/time passage: "I sleep at the inn" → restore HP/MP appropriately

INVENTORY NAMING RULES:
- Use EXACT, CONSISTENT item names. Once named, never change the name.
- Be specific: "Smooth River Stone" not "stone". "Iron Belt Knife" not "knife".
- Stackable items: same name for each instance. Five stones = five "Smooth River Stone" entries.
- When removing, the string must EXACTLY match what is in the character's inventory list above.
- Track partial consumable use: "2x Hardtack" after eating one of "3x Hardtack".

NOTABLE ITEM FLAGGING:
When a player acquires an item with significant future utility, also add to addQuestFlag:
{ "notable_smooth_stones": "5x Smooth River Stone — usable as projectiles or distractions" }

CRITICAL: Respond ONLY with valid JSON. No markdown. No prose outside JSON. No backticks.
RESPONSE SCHEMA:
{
  "narrative": "2-3 short grounded paragraphs — specific, atmospheric, no purple prose",
  "scenePrompt": "8-12 word visual scene description",
  "stateChanges": {
    "hp": null,
    "mp": null,
    "gold": null,
    "xp": null,
    "location": null,
    "addInventory": [],
    "removeInventory": [],
    "addSpell": null,
    "addSkill": null,
    "addKnownLocation": null,
    "npcRelationChange": null,
    "addQuestFlag": null,
    "levelUp": false
  },
  "options": ["Option A","Option B","Option C","Option D"],
  "mood": "tense|calm|mysterious|combat|discovery|social"
}`;
}

// ─── Full world lore (server-side only) ─────────────────────
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

━━━ KEY NPCs ━━━

MIRA (innkeeper, crossroads, 52): Warm, observant, runs the inn as neutral ground. Her mother has severe Forgetting. Reports travelers to Lady Cassel — feeling guilty. Sealed cellar room: 6 exceptional Resonance Shards she's never opened. Teaches: Calm Emotions (only to deeply trusted players).

ALDRIC (village elder, Thornhaven, 67): Has been mining Mnemorite shards from the mill for 15 years, selling as gemstones. His own Forgetting has progressed 2 years — he doesn't realize it. Wants to protect granddaughter Lena.

LENA (14, Thornhaven): Has Aethran genetics — hears Mnemorite resonance as music, genuinely beautiful to her. The Pale Lord's scouts are looking for her. Smarter than she appears; will call out condescension directly.

MAGISTER VOSS (Collegium, 58): Can teach: Arcane Lock, Force Bolt, Dispel Illusion, Mnemorite Sensitivity (calls it "arcane attunement"), Counterspell, Wall of Force. Requires intellectual proof of worth.

LADY CASSEL (spymaster, 45): Deliberately forgettable appearance. Can teach: Disguise Self, Whisper Network, Shadow Step — after completing at least one contract.

SERA (druid, Whisperwood, appears 35, actually 140): Aethran ancestry. Has been watching Mnemorite flows increase for 40 years. Can teach: Nature's Voice, Rootwalk, Mnemorite Ward, Healing Trance, Thornwall. Requires forest respect + one quest.

THE PALE LORD / SER HADDON GRAVES (67, appears 50): Has most accurate vein maps in existence. Calculated overload: ~3 years 4 months from campaign start. Has 2 Stillpoint Rods; third is in Aethra Level 2. Late-game trust: teaches Mnemorite Seal, Engine Reading, reveals third Rod's location.

BROTHER TOMLIN (ruins scholar, 44): Wants to ACTIVATE the Engine — believes it's a power source. Has the research right, the conclusion wrong. Teaches: Aethran Glyph Reading (foundational, given early), Light of Memory, Archive Mind.

HIGH KEEPER ALDARA (74): Her faith's founding texts are adapted Aethran technical documents. In spiritual crisis. Teaches: Memory Rite, Soul Ward, Ancestor's Voice — pilgrimage quest required.

CAPTAIN VANE (Saltmere): Smuggler. The lighthouse keeper has been maintaining it on pure muscle memory for 6 weeks since the Forgetting took his mind. He repeats "Keeps the ships home." Teaches: Sea Legs, Signal Fire (free), Saltwater Ward.

━━━ LOCATIONS ━━━

CROSSROADS & RUSTED COMPASS: Fog, Aethran shrine repurposed for local saints. Inn: sealed cellar with 6 exceptional Resonance Shards (Mira's never opened it). Noticeboard: Whisperwood bounty (secretly Sera's), missing person (Aldric's nephew), Maren mineral posting.

THORNHAVEN (~200): Six fresh graves (Forgetting complications). Mill: Mnemorite vein visible as blue-white lines in stone when lights out. Aldric's locked attic: extraction equipment, 11 raw shards, journals. Spending a night at the mill: vivid leaked memories from Aldric. Lena can lead players to 3 resonance hotspots.

VALDENMOOR (~18,000): Palace District (Archive has sealed excavation records subbasement), Collegium Quarter (largest Aethran tablet collection, Voss's 3 Shards in vault), Market Ward ("Forgetting Row"), Under-Streets (Aethran corridors below sewers, Engine 3 levels down, Iron Covenant access point known only to Pale Lord and Lady Cassel).

ENGINE CHAMBER: 30 meters across. Crystal columns around central mechanism the size of a house. 7-second pulse. Air makes memories vivid and overwhelming. One cracked containment seal. Pale Lord's workbenches, 2 Stillpoint Rods on wall.

WHISPERWOOD: Ancient forest, creates its own weather. Sera's home: half-built, half-grown. Fell creatures (Forgetting-affected wildlife, unpredictably dangerous). Witch's Circle: 7 Aethran survey marker stones, sleeping here produces vivid resonance dreams.

AETHRA RUINS: Surface: towers with glyphs (Tomlin has 60% translated), amphitheater (Engine resonance audible during pulses), sealed vault (Memory Anchor original, Echo Lens, complete Aethran ethical codes — key assembled from 3 tablets). Underground 1: archive, damaged Constructs. Underground 2: Mnemorite refinery, 3 exceptional Resonance Shards, THE THIRD STILLPOINT ROD.

IRON GATE: Former mine. Pale Lord's research room: most accurate vein maps, overload timeline, original excavation notes — the most complete document of the Forgetting's cause in existence.

PORT SALTMERE: Lighthouse (elderly man maintaining on muscle memory alone, repeats "Keeps the ships home"). Maren warehouse: 47 crates of mislabeled Mnemorite shards. Tidal Caves: Aethran processing equipment, House Valdris documents hidden 35 years ago (major political lever).

HIGH MOORS: Standing Men (Aethran beacons, partially active). Moor Graves (mass Civil War grave, involuntary memory experiences overnight, recurring consciousness of Vey — Aethran girl, 19, killed in involuntary harvest).

RESONANCE NEXUS: Center of triangle formed by Valdenmoor, Aethra, High Moors. Flat stone platform, no structures. Intense Mnemorite field. INT 14+ or Mnemorite Sensitivity spell: can perceive Engine's state, send simple commands, locate third Rod. Extended stays cause memory bleeding.

BREN MONASTERY: Infirmary, scriptorium. Reliquary: "Saint Edra's Tear" is a Resonance Shard containing memory of Edra — Aethran memory-ethics architect, thoughtful and heartbroken. Most humanizing Aethran contact available.

HERMIT'S TOWER (Whisperwood south): Drest's notes propose a FATAL solution — using a living Aethran-sensitive person as a "living outlet" for Engine discharge. This WOULD KILL THEM. It is wrong. Present only as a red herring discovered by desperate NPCs.

━━━ SPELL CATALOG (summarized) ━━━
COMBAT: Force Bolt (Voss, 2MP), Concussive Wave (Tam, 3MP), Flame Tongue (Orsin at Saltmere, 2MP), Thornwall (Sera, 3MP), Shadow Step (Cassel, 2MP), Counterspell (Voss advanced, 4MP), Wall of Force (Voss advanced, 5MP)
UTILITY: Arcane Lock (Voss, 1MP), Dispel Illusion (Voss, 2MP), Nature's Voice (Sera, 2MP), Rootwalk (Sera, 3MP), Disguise Self (Cassel, 2MP), Whisper Network (Cassel, 2MP), Signal Fire (Vane free, 1MP), Waterbreath (Pell at Saltmere, 2MP), Archive Mind (Tomlin, 3MP), Light of Memory (Tomlin, 2MP)
AETHRAN/RARE: Mnemorite Sensitivity (Voss, 3MP — reveals Engine pulse from Valdenmoor), Mnemorite Ward (Sera late, 4MP), Mnemorite Seal (Pale Lord with trust, 4MP), Memory Rite (Aldara, 3MP), Soul Ward (Aldara, 2MP), Resonance Read (Pale Lord late, 4MP), Engine Reading (Pale Lord only, 5MP — required for repair), Ancestor's Voice (Aldara late, 4MP), Aethran Glyph Reading (Tomlin, 2MP)
HEALING: Healing Trance (Sera, 3MP), Triage Touch (Brother Cael at monastery, 2MP), Fortify (Gavrik at Saltmere, free), Calm Emotions (Mira, 2MP — deeply trusted only)

━━━ MAIN QUEST ARC ━━━
Act I clues: mill haunting, Aldric's behavior, Mira's mother, missing nephew noticeboard, Voss's paranoia.
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
