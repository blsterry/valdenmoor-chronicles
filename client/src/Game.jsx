import { useState, useEffect, useRef, useCallback } from 'react';
import { sendToGM, loadSave, writeSave, deleteSave, logout,
         loadNpcStates, updateNpcStates, fastTravel, logEvents, getImage,
         clearAllImages, clearSceneImage } from './api.js';
import WorldMap from './WorldMap.jsx';

// ─── Constants ───────────────────────────────────────────────────────────────

const QUEST_TYPE_OPTIONS = [
  {
    id: 'missing',
    title: 'Someone Is Missing',
    description: "A person you care about passed through this region and never came back. You have a name and a last known location.",
    gmHint: 'The player is searching for a specific missing person (let them name the person in play or let it emerge). NPCs should have conflicting information about what happened. The mystery deepens before it resolves — and the answer may be uncomfortable.',
  },
  {
    id: 'debt',
    title: 'Unfinished Business',
    description: "Someone wronged you badly enough that you followed them here. Whether you want justice, coin, or something else is still unclear.",
    gmHint: 'The player carries a specific grudge or unresolved wrong. The target may be someone in or near Valdenmoor. Introduce moral complexity — the target may not be purely villainous, and revenge may cost more than expected.',
  },
  {
    id: 'scholar',
    title: 'The Old World',
    description: "You study the Aethran age — the lost civilization whose ruins still mark this land. Something here called you specifically.",
    gmHint: 'The player is drawn to Aethran lore and ruins. Lean into Resonance mechanics, ancient inscriptions, and artifacts. Archivist Nessa, Historian Brek, and the Hermit have more to offer this player. The Engine Chamber and Aethra Ruins are primary draws.',
  },
  {
    id: 'survival',
    title: 'Making Do',
    description: "No grand purpose. You needed coin and this road looked better than the last one. The work finds you.",
    gmHint: 'The player is pragmatic and survival-focused, drawn into events by circumstance. Lean into economic pressure, mercenary work, and moral grey areas. The world has weight and consequence rather than heroic destiny. Money matters more here.',
  },
  {
    id: 'hunted',
    title: 'Running From Something',
    description: "You are not here entirely by choice. Something behind you made the road ahead feel safer — for now.",
    gmHint: 'Something pursues the player — a faction, a person, a secret, or something stranger. Introduce signs slowly: a stranger asking questions, a letter left at an inn, someone who looks twice. The threat should feel real but not constant.',
  },
  {
    id: 'wrong',
    title: 'Something Is Wrong Here',
    description: "The Forgetting. The failing harvests. The things locals won't speak of. You noticed, and you stayed.",
    gmHint: 'The player is an investigator drawn to the central mystery of the Forgetting — the illness erasing memory and the strange resonance events. Reward careful observation and lateral thinking. NPCs with the Forgetting are more prominent, and clues accumulate slowly.',
  },
  {
    id: 'faithful',
    title: 'A Calling',
    description: "Faith, duty, or something harder to name drew you here. A vision. An obligation. A pull you have not been able to explain.",
    gmHint: 'The player has a spiritual or duty-driven purpose. Lean into the Church of the Still Flame, omens, and moral questions. The Bren Monastery and roadside shrines resonate more. Sister Veil and High Keeper Aldara have things to tell this player.',
  },
];

const BACKSTORY_OPTIONS = [
  "Years in service — soldier, guard, hired sword. The work dried up.",
  "You grew up in a city like Valdenmoor once was. You know what it looks like when things start to slip.",
  "No fixed home. The road has been your address longer than anywhere else.",
  "There was somewhere you belonged. Not anymore.",
];

// Game starts at 18:00 (dusk) on Day 1. Offset = 1080 min from midnight.
const GAME_START_OFFSET = 1080;

function formatGameTime(gameMinutes) {
  const abs = (gameMinutes || 0) + GAME_START_OFFSET;
  const dayNum = Math.floor(abs / 1440) + 1;
  const todMin = abs % 1440;
  const hr = Math.floor(todMin / 60);
  const mn = todMin % 60;
  const hr12 = ((hr % 12) || 12);
  const ampm = hr >= 12 ? 'pm' : 'am';
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

function needsLabel(hunger, thirst, fatigue) {
  const h = hunger  || 0;
  const t = thirst  || 0;
  const f = fatigue || 0;
  const parts = [];
  if (h >= 25) parts.push(h < 50 ? 'hungry' : h < 75 ? 'famished' : '⚠ starving');
  if (t >= 25) parts.push(t < 50 ? 'thirsty' : t < 75 ? 'parched'  : '⚠ desperate for water');
  if (f >= 25) parts.push(f < 50 ? 'tired'   : f < 75 ? 'exhausted': '⚠ near collapse');
  return parts.join(' · ') || null;
}

function slugifyPrompt(p) {
  // No length limit — longer prompts need the full slug to avoid cache collisions.
  // Old 60-char slugs in the DB become orphaned (never matched again), forcing fresh generation.
  return (p || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const INITIAL_CHARACTER = {
  name: '', gender: 'they', backstory: '', race: 'Human', level: 1, xp: 0, xpToNext: 100,
  stats: { STR: 8, DEX: 8, INT: 8, WIS: 8, CON: 8, CHA: 8 },
  hp: 20, maxHp: 20, mp: 10, maxMp: 10, gold: 15,
  inventory: ["Worn Traveler's Cloak", 'Flint & Steel', 'Waterskin', '3x Hardtack'],
  spells: [],
  spellLearning: [],   // [{ spellId, spellName, stage, totalStages, teacherNpcId, partialNote }]
  skills: [],          // [{ id, name, tier, tierName, xp, xpToNext, description, taughtBy }]
  statPoints: 10,
  location: 'crossroads',
  knownLocations: ['crossroads'],
  waypoints: [],
  npcRelations: {},
  flags: {},
  dayCount: 1,
  questType: '',    // id from QUEST_TYPE_OPTIONS
  gameMinutes: 0,   // total elapsed game minutes (0 = Day 1, 18:00)
  hunger: 0,        // 0-100; natural rate +2/hr
  thirst: 0,        // 0-100; natural rate +4/hr
  fatigue: 0,       // 0-100; natural rate +2.5/hr; sleep resets
};

const STAT_LABELS = {
  STR: 'Strength', DEX: 'Dexterity', INT: 'Intellect',
  WIS: 'Wisdom', CON: 'Constitution', CHA: 'Charisma',
};

const MOOD_THEMES = {
  tense:      { bg: 'radial-gradient(ellipse at top, #2a0a0a 0%, #0d0505 100%)', accent: '#c94a4a', fog: '#8B1A1A' },
  calm:       { bg: 'radial-gradient(ellipse at top, #0a1a12 0%, #050d08 100%)', accent: '#4caf7a', fog: '#2C4A3E' },
  mysterious: { bg: 'radial-gradient(ellipse at top, #12082a 0%, #08050f 100%)', accent: '#9b72cf', fog: '#2D1B4E' },
  combat:     { bg: 'radial-gradient(ellipse at top, #250808 0%, #0d0303 100%)', accent: '#e05a5a', fog: '#5B1010' },
  discovery:  { bg: 'radial-gradient(ellipse at top, #081525 0%, #030810 100%)', accent: '#5a9fd4', fog: '#1A3A5C' },
  social:     { bg: 'radial-gradient(ellipse at top, #0f1a08 0%, #060a04 100%)', accent: '#8fc47a', fog: '#2A3520' },
};

const INPUT_PLACEHOLDERS = [
  'I search the room carefully for anything hidden...',
  'I pick up five smooth stones from the riverbank and pocket them',
  'I ask Mira what she knows about the old mill',
  'I wait in the shadows and watch to see who comes and goes',
  'I pull out a stone and toss it into the bushes to my left',
  'I examine the inscription on the shrine more closely',
  'I try to pick the lock on the old door',
  'I tear a strip from my cloak and use it to bind the wound',
  'I climb the oak tree to get a better view of the road',
  'I sit at the bar and listen to the conversations around me',
];

// ─── Game Engine ─────────────────────────────────────────────────────────────

const GameEngine = {
  applyStateChanges(character, sc) {
    if (!sc) return { character, leveledUp: false, skillNotices: [] };
    let c = { ...character };
    const skillNotices = [];

    // ── Time & physical needs ──────────────────────────────────────────────
    if (sc.minutesElapsed && sc.minutesElapsed > 0) {
      const mins = sc.minutesElapsed;
      c.gameMinutes = (c.gameMinutes || 0) + mins;
      // Natural accumulation per hour
      c.hunger  = Math.min(100, (c.hunger  || 0) + (mins / 60) * 2);
      c.thirst  = Math.min(100, (c.thirst  || 0) + (mins / 60) * 4);
      c.fatigue = Math.min(100, (c.fatigue || 0) + (mins / 60) * 2.5);
      // Sync dayCount from gameMinutes
      c.dayCount = Math.floor((c.gameMinutes + GAME_START_OFFSET) / 1440) + 1;
    }
    // GM-driven adjustments (eating, drinking, resting)
    if (sc.hungerDelta  != null) c.hunger  = Math.max(0, Math.min(100, (c.hunger  || 0) + sc.hungerDelta));
    if (sc.thirstDelta  != null) c.thirst  = Math.max(0, Math.min(100, (c.thirst  || 0) + sc.thirstDelta));
    if (sc.fatigueDelta != null) c.fatigue = Math.max(0, Math.min(100, (c.fatigue || 0) + sc.fatigueDelta));

    if (sc.hp != null)   c.hp   = Math.max(0, Math.min(sc.hp, c.maxHp));
    if (sc.mp != null)   c.mp   = Math.max(0, Math.min(sc.mp, c.maxMp));
    if (sc.gold != null) c.gold = Math.max(0, sc.gold);
    if (sc.location)     c.location = sc.location;

    if (sc.addInventory?.length)    c.inventory = [...c.inventory, ...sc.addInventory];
    if (sc.removeInventory?.length) {
      let inv = [...c.inventory];
      sc.removeInventory.forEach(item => {
        const idx = inv.indexOf(item);
        if (idx !== -1) inv.splice(idx, 1);
      });
      c.inventory = inv;
    }

    // Full spell added (learning complete or single-stage)
    if (sc.addSpell) {
      c.spells = [...c.spells, sc.addSpell];
      // Remove from spellLearning if it was there
      c.spellLearning = (c.spellLearning || []).filter(sl => sl.spellId !== sc.addSpell.id);
    }

    // Partial spell stage added
    if (sc.addSpellStage) {
      const { spellId, spellName, stage, totalStages, teacherNpcId, partialNote } = sc.addSpellStage;
      const existing = (c.spellLearning || []).findIndex(sl => sl.spellId === spellId);
      if (existing >= 0) {
        const updated = [...c.spellLearning];
        updated[existing] = { ...updated[existing], stage, partialNote };
        c.spellLearning = updated;
      } else {
        c.spellLearning = [...(c.spellLearning || []), { spellId, spellName, stage, totalStages, teacherNpcId, partialNote }];
      }
    }

    // Initial skill addition (Tier 1, first lesson)
    if (sc.addSkill) {
      const newSkill = {
        id: sc.addSkill.id || sc.addSkill.name?.toLowerCase().replace(/\s+/g, '_'),
        name: sc.addSkill.name,
        tier: sc.addSkill.tier || 1,
        tierName: sc.addSkill.tierName || 'Novice',
        xp: 0,
        xpToNext: sc.addSkill.xpToNext || 50,
        description: sc.addSkill.description || '',
        taughtBy: sc.addSkill.taughtBy || '',
      };
      // Only add if not already present
      if (!c.skills.some(s => s.id === newSkill.id)) {
        c.skills = [...c.skills, newSkill];
      }
    }

    // Skill XP award
    if (sc.skillXP) {
      const { skillId, amount } = sc.skillXP;
      const idx = c.skills.findIndex(s => s.id === skillId);
      if (idx >= 0) {
        const skills = [...c.skills];
        const sk = { ...skills[idx] };
        sk.xp = (sk.xp || 0) + (amount || 0);
        if (sk.xpToNext && sk.xp >= sk.xpToNext) {
          skillNotices.push({ type: 'skillready', msg: `⚔ ${sk.name} is ready to advance — seek a teacher or prove your mastery!` });
        }
        skills[idx] = sk;
        c.skills = skills;
      }
    }

    // Skill tier update (advancement)
    if (sc.updateSkill) {
      const updated = sc.updateSkill;
      const idx = c.skills.findIndex(s => s.id === updated.id);
      if (idx >= 0) {
        const skills = [...c.skills];
        skills[idx] = {
          ...skills[idx],
          tier: updated.tier,
          tierName: updated.tierName,
          xp: updated.xp ?? 0,
          xpToNext: updated.xpToNext,
          description: updated.description || skills[idx].description,
        };
        c.skills = skills;
      }
    }

    if (sc.addKnownLocation) c.knownLocations = [...new Set([...c.knownLocations, sc.addKnownLocation])];

    // Waypoint addition
    if (sc.addWaypoint) {
      const wp = sc.addWaypoint;
      if (!c.waypoints.includes(wp)) {
        c.waypoints = [...c.waypoints, wp];
      }
    }

    if (sc.npcRelationChange) {
      c.npcRelations = { ...c.npcRelations };
      for (const [npc, delta] of Object.entries(sc.npcRelationChange))
        c.npcRelations[npc] = (c.npcRelations[npc] || 0) + delta;
    }

    if (sc.addQuestFlag) c.flags = { ...c.flags, ...sc.addQuestFlag };

    if (sc.xp) {
      c.xp += sc.xp;
      if (c.xp >= c.xpToNext || sc.levelUp) {
        c.level += 1;
        c.xp = Math.max(0, c.xp - c.xpToNext);
        c.xpToNext = Math.floor(c.xpToNext * 1.5);
        c.statPoints = (c.statPoints || 0) + 2;
        const conMod = Math.floor((c.stats.CON - 10) / 2);
        c.maxHp += conMod + 3;
        c.hp = Math.min(c.hp + conMod + 3, c.maxHp);
        return { character: c, leveledUp: true, skillNotices };
      }
    }

    return { character: c, leveledUp: false, skillNotices };
  },

  computeDerivedStats(stats) {
    return {
      maxHp: 10 + Math.floor((stats.CON - 10) / 2) * 2 + 10,
      maxMp: 5  + Math.floor((stats.INT - 10) / 2) * 2 + 5,
    };
  },
};

// ─── Scene Illustration (SVG) ─────────────────────────────────────────────────

function SceneIllustration({ prompt, mood }) {
  const theme = MOOD_THEMES[mood] || MOOD_THEMES.mysterious;
  const p = (prompt || '').toLowerCase();
  const hasMoon   = p.includes('moon') || p.includes('night');
  const hasFire   = p.includes('fire') || p.includes('torch') || p.includes('flame') || p.includes('candle') || p.includes('amber');
  const hasWater  = p.includes('sea') || p.includes('ocean') || p.includes('river') || p.includes('port') || p.includes('coast');
  const hasForest = p.includes('forest') || p.includes('tree') || p.includes('wood') || p.includes('druid');
  const hasRuins  = p.includes('ruin') || p.includes('stone') || p.includes('arch') || p.includes('ancient') || p.includes('dungeon');
  const hasCity   = p.includes('city') || p.includes('market') || p.includes('court') || p.includes('tower') || p.includes('spire');
  const hasFog    = p.includes('fog') || p.includes('mist') || p.includes('shadow');
  const hasRunes  = p.includes('rune') || p.includes('glow') || p.includes('magic') || p.includes('arcane') || p.includes('resonan');
  const hasMoor   = p.includes('moor') || p.includes('heath') || p.includes('standing stone');

  const skyColors = {
    tense: ['#1a0505','#2d0808'], calm: ['#050d10','#0a1a20'],
    mysterious: ['#08050f','#160d2a'], combat: ['#1a0303','#2d0505'],
    discovery: ['#030812','#071525'], social: ['#060a03','#0d1508'],
  };
  const [skyDark, skyLight] = skyColors[mood] || skyColors.mysterious;
  const accent = theme.accent;

  const stars   = (hasMoon || !hasFire) ? Array.from({length:40},(_,i)=>({x:(i*37+13)%400,y:(i*23+7)%80,r:i%3===0?1.2:0.7,o:0.3+(i%5)*0.12})) : [];
  const trees   = hasForest ? Array.from({length:8},(_,i)=>({x:20+i*52,h:40+(i*17)%30,w:18+(i*7)%12})) : [];
  const pillars = hasRuins  ? Array.from({length:5},(_,i)=>({x:40+i*75,h:50+(i*23)%50,broken:i%2===0})) : [];
  const spires  = hasCity   ? Array.from({length:6},(_,i)=>({x:30+i*60,h:30+(i*19)%60,w:12+(i*5)%15})) : [];
  const stones  = hasMoor   ? Array.from({length:4},(_,i)=>({x:60+i*80,h:20+(i*11)%25})) : [];

  return (
    <svg width="100%" viewBox="0 0 400 140" style={{display:'block',borderBottom:`1px solid ${accent}33`}} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={skyDark}/><stop offset="100%" stopColor={skyLight}/></linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={skyLight}/><stop offset="100%" stopColor="#050305"/></linearGradient>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fffff0" stopOpacity="0.9"/><stop offset="40%" stopColor="#e8e0c0" stopOpacity="0.6"/><stop offset="100%" stopColor="transparent" stopOpacity="0"/></radialGradient>
        <radialGradient id="fireGlow" cx="50%" cy="80%" r="60%"><stop offset="0%" stopColor="#e8b060" stopOpacity="0.5"/><stop offset="100%" stopColor="transparent" stopOpacity="0"/></radialGradient>
        <filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
        <filter id="blur4"><feGaussianBlur stdDeviation="4"/></filter>
      </defs>
      <rect width="400" height="140" fill="url(#sky)"/>
      {stars.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o}/>)}
      {hasMoon&&<g><circle cx="320" cy="28" r="18" fill="url(#moonGlow)" filter="url(#blur4)"/><circle cx="320" cy="28" r="12" fill="#fffff8" opacity="0.9"/><circle cx="325" cy="24" r="9" fill={skyDark} opacity="0.85"/></g>}
      {hasFire&&<rect width="400" height="140" fill="url(#fireGlow)"/>}
      {hasWater&&<g><rect x="0" y="100" width="400" height="40" fill="#0a1525" opacity="0.8"/>{Array.from({length:6},(_,i)=><path key={i} d={`M ${i*70} 108 Q ${i*70+20} 103 ${i*70+40} 108`} stroke="#1a3a5a" strokeWidth="1.5" fill="none" opacity="0.5"/>)}{hasMoon&&<ellipse cx="320" cy="118" rx="8" ry="20" fill="#fffff0" opacity="0.1" filter="url(#blur2)"/>}</g>}
      <rect x="0" y="105" width="400" height="35" fill="url(#ground)" opacity={hasWater?0.3:1}/>
      <path d="M0,105 Q80,75 160,90 Q240,70 320,85 Q370,78 400,90 L400,105 Z" fill="#0a0a0f" opacity="0.8"/>
      {trees.map((t,i)=><g key={i}><polygon points={`${t.x},${105-t.h} ${t.x-t.w/2},105 ${t.x+t.w/2},105`} fill="#0d1a0d" opacity="0.9"/><polygon points={`${t.x},${105-t.h-8} ${t.x-t.w/2+2},${105-t.h+12} ${t.x+t.w/2-2},${105-t.h+12}`} fill="#0f200f" opacity="0.85"/></g>)}
      {pillars.map((p2,i)=><g key={i}><rect x={p2.x-5} y={105-p2.h} width={10} height={p2.h} fill="#1a1510" opacity="0.9"/>{!p2.broken&&<rect x={p2.x-8} y={105-p2.h-5} width={16} height={6} fill="#221c14" opacity="0.9"/>}{hasRunes&&<rect x={p2.x-3} y={105-p2.h/2} width={6} height={8} fill={accent} opacity="0.4" filter="url(#blur2)"/>}</g>)}
      {spires.map((sp,i)=><g key={i}><rect x={sp.x} y={105-sp.h} width={sp.w} height={sp.h} fill="#0f0d12" opacity="0.95"/><polygon points={`${sp.x},${105-sp.h} ${sp.x+sp.w/2},${105-sp.h-20} ${sp.x+sp.w},${105-sp.h}`} fill="#0a080e" opacity="0.95"/>{hasFire&&i%2===0&&<circle cx={sp.x+sp.w/2} cy={105-sp.h-22} r="2" fill="#e8b060" opacity="0.7" filter="url(#blur2)"/>}</g>)}
      {stones.map((st,i)=><g key={i}><rect x={st.x-3} y={105-st.h} width={7} height={st.h} fill="#1a1508" opacity="0.9"/><rect x={st.x-5} y={105-st.h-4} width={11} height={5} fill="#221c08" opacity="0.9"/>{hasRunes&&<rect x={st.x-1} y={105-st.h+5} width={3} height={4} fill={accent} opacity="0.3" filter="url(#blur2)"/>}</g>)}
      {!hasForest&&!hasRuins&&!hasCity&&!hasWater&&!hasMoor&&<g><path d="M180,140 Q195,115 200,105 Q205,115 220,140" fill="#141008" opacity="0.8"/><path d="M0,120 Q100,108 200,105 Q300,108 400,120" stroke="#1a1508" strokeWidth="6" fill="none" opacity="0.6"/></g>}
      {hasFog&&<rect x="0" y="85" width="400" height="55" fill={theme.fog} opacity="0.12" filter="url(#blur4)"/>}
      {hasFire&&<><circle cx="200" cy="100" r="20" fill="#e8b060" opacity="0.12" filter="url(#blur4)"/><circle cx="200" cy="98" r="3" fill="#fff0a0" opacity="0.8"/><path d="M198,98 Q200,90 202,98" fill="#ff9a20" opacity="0.7"/></>}
      {hasRunes&&Array.from({length:4},(_,i)=><circle key={i} cx={60+i*90} cy={90-(i%2)*15} r="6" fill={accent} opacity="0.25" filter="url(#blur4)"/>)}
      <rect x="0" y="0" width="400" height="140" fill="url(#sky)" opacity="0.15"/>
      <rect x="0" y="100" width="400" height="40" fill="#000000" opacity="0.4"/>
    </svg>
  );
}

// ─── UI Components ────────────────────────────────────────────────────────────

function StatBar({ label, value, max, color }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
      <span style={{fontSize:'0.8rem',color:'#6a5a4a',width:'22px',textAlign:'right'}}>{label}</span>
      <div style={{width:'90px',height:'7px',background:'rgba(255,255,255,0.08)',borderRadius:'3px',overflow:'hidden'}}>
        <div style={{width:`${Math.max(0,Math.min(100,(value/max)*100))}%`,height:'100%',background:color,transition:'width 0.5s',borderRadius:'3px'}}/>
      </div>
      <span style={{fontSize:'0.8rem',color:'#6a5a4a',minWidth:'50px'}}>{value}/{max}</span>
    </div>
  );
}

function XPBar({ value, max, color }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
      <span style={{fontSize:'0.8rem',color:'#6a5a4a',width:'22px',textAlign:'right'}}>XP</span>
      <div style={{width:'90px',height:'7px',background:'rgba(255,255,255,0.08)',borderRadius:'3px',overflow:'hidden'}}>
        <div style={{width:`${Math.max(0,Math.min(100,(value/max)*100))}%`,height:'100%',background:color,transition:'width 0.5s',borderRadius:'3px'}}/>
      </div>
      <span style={{fontSize:'0.8rem',color:'#6a5a4a',minWidth:'66px'}}>{value}/{max} xp</span>
    </div>
  );
}

function Notification({ notification }) {
  if (!notification) return null;
  const colors = {
    levelup:    { bg: '#c9a96e', color: '#0a0a0f' },
    spell:      { bg: '#6a4ea8', color: '#fff' },
    spellstage: { bg: '#4a3a7a', color: '#d0b8ff' },
    skill:      { bg: '#3a6a5a', color: '#fff' },
    skillready: { bg: '#2a4a3a', color: '#8fc47a' },
    waypoint:   { bg: '#2a3a5a', color: '#7aafd4' },
    travel:     { bg: '#1a2a3a', color: '#5a8aaa' },
    info:       { bg: '#2a3a5a', color: '#fff' },
  };
  const c = colors[notification.type] || colors.info;
  return (
    <div style={{position:'fixed',top:'1rem',left:'50%',transform:'translateX(-50%)',background:c.bg,color:c.color,padding:'0.6rem 1.5rem',zIndex:999,fontFamily:'Georgia, serif',fontSize:'0.85rem',letterSpacing:'0.05em',boxShadow:'0 4px 20px rgba(0,0,0,0.6)',border:'1px solid rgba(255,255,255,0.2)',whiteSpace:'nowrap',maxWidth:'90vw',textAlign:'center'}}>
      {notification.msg}
    </div>
  );
}

function PanelButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{background:active?'rgba(201,169,110,0.25)':'transparent',border:`1px solid ${active?'rgba(201,169,110,0.7)':'rgba(201,169,110,0.3)'}`,color:active?'#e8c87a':'#8a7a5a',padding:'0.3rem 0.7rem',cursor:'pointer',fontSize:'0.82rem',fontFamily:'Georgia, serif',transition:'all 0.15s'}}>
      {icon} {label}
    </button>
  );
}

function SkillProgressBar({ skill }) {
  const pct = skill.xpToNext ? Math.min(100, ((skill.xp || 0) / skill.xpToNext) * 100) : 100;
  const isReady = skill.xpToNext && (skill.xp || 0) >= skill.xpToNext;
  return (
    <div style={{marginBottom:'0.55rem',paddingBottom:'0.5rem',borderBottom:'1px solid rgba(201,169,110,0.08)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'0.2rem'}}>
        <span style={{color:'#c9a96e',fontSize:'0.82rem'}}>⚔ {skill.name}</span>
        <span style={{color:isReady?'#8fc47a':'#4a5a3a',fontSize:'0.65rem'}}>{isReady ? '★ Ready to advance' : `Tier ${skill.tier || 1}`}</span>
      </div>
      <div style={{color:'#7a6a5a',fontSize:'0.72rem',marginBottom:'0.2rem',fontStyle:'italic'}}>{skill.tierName || '—'}</div>
      <div style={{color:'#5a4a3a',fontSize:'0.68rem',marginBottom:'0.3rem'}}>{skill.description}</div>
      <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
        <div style={{flex:1,height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',overflow:'hidden'}}>
          <div style={{width:`${pct}%`,height:'100%',background:isReady?'#8fc47a':'#4a6a5a',transition:'width 0.5s',borderRadius:'2px'}}/>
        </div>
        <span style={{fontSize:'0.62rem',color:'#4a3a2a'}}>{skill.xp || 0}/{skill.xpToNext || '—'}</span>
      </div>
      {skill.taughtBy && <div style={{color:'#3a2a1a',fontSize:'0.62rem',marginTop:'0.15rem',fontStyle:'italic'}}>Taught by {skill.taughtBy}</div>}
    </div>
  );
}

// ─── Main Game Component ──────────────────────────────────────────────────────

export default function Game({ user, onLogout, onAdmin }) {
  const [screen, setScreen]           = useState('loading');
  const [character, setCharacter]     = useState(null);
  const [messages, setMessages]       = useState([]);
  const [displayLog, setDisplayLog]   = useState([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [mood, setMood]               = useState('mysterious');
  const [options, setOptions]         = useState([]);
  const [currentScene, setCurrentScene] = useState(null);
  const [notification, setNotification] = useState(null);
  const [panel, setPanel]             = useState(null);
  const [tempName, setTempName]       = useState('');
  const [statAlloc, setStatAlloc]     = useState(null);
  const [npcStates, setNpcStates]     = useState({});   // { npcId: { relationship, memory, ... } }
  const [showMap, setShowMap]         = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [lightMode, setLightMode]         = useState(() => localStorage.getItem('vrc-theme') === 'light');
  const [tempGender, setTempGender]       = useState('they');
  const [tempBackstory, setTempBackstory] = useState('');
  const [tempQuestType, setTempQuestType] = useState('');
  const [sceneImages, setSceneImages]   = useState({});   // { sceneKey: base64png }
  const [npcPortraits, setNpcPortraits] = useState({});   // { npcId: base64png }
  const [imgConfirm, setImgConfirm]     = useState(null); // { type: 'all'|'current' } or null
  const imageGenerating                 = useRef(new Set());
  const logEndRef = useRef(null);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [displayLog, loading]);

  const showNotif = useCallback((msg, type = 'info', duration = 4000) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), duration);
  }, []);

  const fetchSceneImage = useCallback((scenePrompt, sceneKey, ctx = {}) => {
    if (!scenePrompt || !sceneKey) return;
    const tag = `scene:${sceneKey}`;
    if (imageGenerating.current.has(tag)) return;
    imageGenerating.current.add(tag);
    console.log('[image] requesting scene:', sceneKey.slice(0, 80));
    console.log('[image] GM scenePrompt:', scenePrompt);
    console.log('[image] context:', ctx);
    getImage('scene', sceneKey, scenePrompt, ctx)
      .then(data => {
        if (data) {
          console.log('[image] received OK for:', sceneKey.slice(0, 60));
          setSceneImages(prev => ({ ...prev, [sceneKey]: data }));
        } else {
          console.warn('[image] null response for:', sceneKey.slice(0, 60));
        }
      })
      .finally(() => imageGenerating.current.delete(tag));
  }, []);

  const fetchNpcPortrait = useCallback((npcId) => {
    if (!npcId) return;
    const tag = `npc:${npcId}`;
    if (imageGenerating.current.has(tag)) return;
    imageGenerating.current.add(tag);
    getImage('npc', npcId, '')
      .then(data => { if (data) setNpcPortraits(prev => ({ ...prev, [npcId]: data })); })
      .finally(() => imageGenerating.current.delete(tag));
  }, []);

  // Load save and NPC states from server on mount
  useEffect(() => {
    Promise.all([loadSave(), loadNpcStates()]).then(([saved, npcData]) => {
      setNpcStates(npcData || {});
      if (saved) {
        setCharacter(saved.character);
        setMessages(saved.messages || []);
        setDisplayLog(saved.display_log || []);
        setMood(saved.mood || 'mysterious');
        setOptions(saved.options || []);
        setCurrentScene(saved.scene || null);
        setScreen('game');
        // Pre-fetch images for every unique scenePrompt in the log (cached on server, so fast on repeat)
        const logScenes = [...new Set(
          (saved.display_log || []).filter(e => e.scenePrompt).map(e => e.scenePrompt)
        )];
        if (saved.scene && !logScenes.includes(saved.scene)) logScenes.push(saved.scene);
        logScenes.forEach(sp => fetchSceneImage(sp, slugifyPrompt(sp)));
        // Pre-fetch portraits for all known NPCs
        Object.keys(npcData || {}).forEach(npcId => fetchNpcPortrait(npcId));
      } else {
        setScreen('intro');
      }
    }).catch(err => {
      console.error(err);
      onLogout();
    });
  }, [onLogout, fetchSceneImage, fetchNpcPortrait]);

  const persistSave = useCallback(async (char, msgs, dlog, m, opts, scene) => {
    try {
      await writeSave({ character: char, messages: msgs, display_log: dlog, mood: m, options: opts, scene });
    } catch (err) {
      console.error('Save failed:', err);
    }
  }, []);

  const callGM = useCallback(async (char, apiHistory, userText, isGameStart = false) => {
    setLoading(true);
    setOptions([]);
    const playerEntry = { type: 'player', text: userText, hidden: isGameStart };

    try {
      const parsed = await sendToGM(char, [
        ...apiHistory,
        { role: 'user', content: userText },
      ], npcStates);

      const newApiHistory = [
        ...apiHistory,
        { role: 'user', content: userText },
        { role: 'assistant', content: JSON.stringify(parsed) },
      ];

      const { character: newChar, leveledUp, skillNotices } = GameEngine.applyStateChanges(char, parsed.stateChanges);

      // Persist game events (fire-and-forget)
      if (parsed.logEvents?.length > 0) {
        logEvents(parsed.logEvents, newChar.gameMinutes, newChar.location).catch(() => {});
      }

      // Handle NPC state changes
      if (parsed.npcStateChanges?.length > 0) {
        const day = char.dayCount || 1;
        await updateNpcStates(parsed.npcStateChanges, day);
        // Update local state
        setNpcStates(prev => {
          const next = { ...prev };
          for (const change of parsed.npcStateChanges) {
            const { npcId, relationshipDelta = 0, memorySummary, teachingProgress, flags } = change;
            const cur = next[npcId] || { relationship: 0, interactionCount: 0, memory: [], teachingProgress: {}, flags: {} };
            const newRel = Math.max(-100, Math.min(100, cur.relationship + relationshipDelta));
            const newMem = memorySummary
              ? [...(cur.memory || []).slice(-7), { day, summary: memorySummary }]
              : cur.memory;
            next[npcId] = {
              relationship: newRel,
              interactionCount: (cur.interactionCount || 0) + (memorySummary ? 1 : 0),
              memory: newMem,
              teachingProgress: { ...(cur.teachingProgress || {}), ...(teachingProgress || {}) },
              flags: { ...(cur.flags || {}), ...(flags || {}) },
            };
          }
          return next;
        });
      }

      // Notifications
      if (parsed.stateChanges?.addSpell)
        showNotif(`✨ Learned: ${parsed.stateChanges.addSpell.name}`, 'spell');
      if (parsed.stateChanges?.addSpellStage)
        showNotif(`📖 Spell progress: ${parsed.stateChanges.addSpellStage.spellName} Stage ${parsed.stateChanges.addSpellStage.stage}/${parsed.stateChanges.addSpellStage.totalStages}`, 'spellstage');
      if (parsed.stateChanges?.addSkill)
        showNotif(`⚔ New skill: ${parsed.stateChanges.addSkill.name} — ${parsed.stateChanges.addSkill.tierName || 'Tier 1'}`, 'skill');
      if (parsed.stateChanges?.updateSkill)
        showNotif(`⚔ ${parsed.stateChanges.updateSkill.name} advanced to ${parsed.stateChanges.updateSkill.tierName}!`, 'skill');
      if (parsed.stateChanges?.addWaypoint)
        showNotif(`⬡ Waypoint set: ${parsed.stateChanges.addWaypoint.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}`, 'waypoint');
      if (leveledUp)
        showNotif(`⬆️ Level Up! You are now Level ${newChar.level}!`, 'levelup', 5000);
      for (const notice of skillNotices)
        showNotif(notice.msg, notice.type, 5000);

      const newMood    = parsed.mood || 'mysterious';
      const newOptions = parsed.options || [];
      const newScene   = parsed.scenePrompt || null;
      const npcIds     = (parsed.npcStateChanges || []).map(c => c.npcId).filter(Boolean);
      const gmEntry    = { type: 'gm', text: parsed.narrative, scenePrompt: newScene, mood: newMood, npcIds };

      // Fire-and-forget image generation (pass rich context for a better prompt)
      if (newScene) {
        const imgCtx = {
          mood: newMood,
          location: newChar.location,
          characterDesc: newChar.name
            ? `${newChar.name}, ${newChar.background || 'traveler'}, medieval clothing`
            : '',
          narrative: (parsed.narrative || '').slice(0, 500),
        };
        fetchSceneImage(newScene, slugifyPrompt(newScene), imgCtx);
      }
      npcIds.forEach(id => fetchNpcPortrait(id));

      setMessages(newApiHistory);
      setDisplayLog(prev => {
        const newLog = [...prev, playerEntry, gmEntry];
        persistSave(newChar, newApiHistory, newLog, newMood, newOptions, newScene);
        return newLog;
      });
      setCharacter(newChar);
      setMood(newMood);
      setOptions(newOptions);
      setCurrentScene(newScene);

    } catch (err) {
      console.error('GM error:', err);
      if (err.message === 'Session expired') { onLogout(); return; }
      const errEntry = { type: 'gm', text: "A strange silence falls... The oracle's voice fades. (Connection lost — please try again.)", mood: 'mysterious', scenePrompt: null };
      setDisplayLog(prev => [...prev, errEntry]);
    }
    setLoading(false);
  }, [persistSave, showNotif, onLogout, npcStates, fetchSceneImage, fetchNpcPortrait]);

  const handleSend = useCallback((text) => {
    if (!text?.trim() || loading || !character) return;
    setInput('');
    callGM(character, messages, text.trim());
  }, [loading, character, messages, callGM]);

  const handleFastTravel = useCallback(async (fromLoc, toLoc) => {
    if (!character || loading) return;
    setShowMap(false);
    setLoading(true);
    setOptions([]);

    try {
      const result = await fastTravel(fromLoc, toLoc, character, messages);

      if (result.encounter && result.parsed) {
        // Encounter: treat as a full GM response
        const { character: newChar, leveledUp, skillNotices } = GameEngine.applyStateChanges(character, result.parsed.stateChanges);

        const encScene    = result.parsed.scenePrompt || null;
        const encNpcIds   = (result.parsed.npcStateChanges || []).map(c => c.npcId).filter(Boolean);
        const travelEntry = { type: 'player', text: `[Fast travel from ${fromLoc.replace(/_/g,' ')} to ${toLoc.replace(/_/g,' ')}]`, hidden: true };
        const gmEntry     = { type: 'gm', text: result.parsed.narrative, scenePrompt: encScene, mood: result.parsed.mood || 'tense', npcIds: encNpcIds };
        if (encScene) {
          fetchSceneImage(encScene, slugifyPrompt(encScene), {
            mood: result.parsed.mood || 'tense',
            location: toLoc,
            characterDesc: character.name ? `${character.name}, ${character.background || 'traveler'}, medieval clothing` : '',
            narrative: (result.parsed.narrative || '').slice(0, 500),
          });
        }
        encNpcIds.forEach(id => fetchNpcPortrait(id));
        const newMood     = result.parsed.mood || 'tense';
        const newOptions  = result.parsed.options || [];
        const newScene    = result.parsed.scenePrompt || null;

        const newApiHistory = [
          ...messages,
          { role: 'user', content: travelEntry.text },
          { role: 'assistant', content: JSON.stringify(result.parsed) },
        ];

        setMessages(newApiHistory);
        setDisplayLog(prev => {
          const newLog = [...prev, travelEntry, gmEntry];
          persistSave(newChar, newApiHistory, newLog, newMood, newOptions, newScene);
          return newLog;
        });
        setCharacter(newChar);
        setMood(newMood);
        setOptions(newOptions);
        setCurrentScene(newScene);
        showNotif('⚠ The road had company.', 'tense');
        if (leveledUp) showNotif(`⬆️ Level Up! You are now Level ${newChar.level}!`, 'levelup', 5000);
        for (const notice of skillNotices) showNotif(notice.msg, notice.type);

      } else {
        // Clean travel — just update location
        const newChar = { ...character, location: toLoc };
        if (!newChar.knownLocations.includes(toLoc)) {
          newChar.knownLocations = [...newChar.knownLocations, toLoc];
        }
        const locName = toLoc.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
        const travelEntry = { type: 'gm', text: result.travelDescription || `You arrive at ${locName} without incident.`, scenePrompt: null, mood: 'calm' };

        setDisplayLog(prev => {
          const newLog = [...prev, travelEntry];
          persistSave(newChar, messages, newLog, 'calm', [], null);
          return newLog;
        });
        setCharacter(newChar);
        setMood('calm');
        setOptions([]);
        showNotif(`⬡ Arrived at ${locName}`, 'travel');
        // Now call GM to generate the arrival scene
        setTimeout(() => {
          callGM(newChar, messages, `[ARRIVAL] ${character.name} has just arrived at ${locName} via fast travel. Generate a brief, direct arrival scene describing the current state of the location. 2-3 short paragraphs.`);
        }, 500);
      }
    } catch (err) {
      console.error('Fast travel error:', err);
      showNotif('Fast travel failed. Try again.', 'info');
    }

    setLoading(false);
  }, [character, loading, messages, persistSave, callGM, showNotif, fetchSceneImage, fetchNpcPortrait]);

  const handleSetWaypointFromMap = useCallback((locationId) => {
    if (!character) return;
    if (!character.knownLocations.includes(locationId)) return;
    if (character.waypoints.includes(locationId)) return;
    const newChar = { ...character, waypoints: [...character.waypoints, locationId] };
    setCharacter(newChar);
    const name = locationId.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
    showNotif(`⬡ Waypoint marked: ${name}`, 'waypoint');
    persistSave(newChar, messages, displayLog, mood, options, currentScene);
  }, [character, messages, displayLog, mood, options, currentScene, persistSave, showNotif]);

  const handleNameSubmit = () => {
    if (!tempName.trim()) return;
    setStatAlloc({ ...INITIAL_CHARACTER, name: tempName.trim(), gender: tempGender });
    setScreen('backstory');
  };

  const handleBackstorySubmit = (backstory) => {
    setStatAlloc(prev => ({ ...prev, backstory: backstory || '' }));
    setTempBackstory('');
    setScreen('questType');
  };

  const handleQuestTypeSubmit = (qtId) => {
    setStatAlloc(prev => ({ ...prev, questType: qtId || '' }));
    setTempQuestType('');
    setScreen('statAlloc');
  };

  const toggleLightMode = () => {
    setLightMode(prev => {
      const next = !prev;
      localStorage.setItem('vrc-theme', next ? 'light' : 'dark');
      return next;
    });
    setShowSettings(false);
  };

  const adjustStat = (stat, delta) => {
    setStatAlloc(prev => {
      const newVal = prev.stats[stat] + delta;
      if (newVal < 6 || newVal > 16) return prev;
      if (prev.statPoints - delta < 0) return prev;
      return { ...prev, stats: { ...prev.stats, [stat]: newVal }, statPoints: prev.statPoints - delta };
    });
  };

  const finalizeCharacter = () => {
    const derived = GameEngine.computeDerivedStats(statAlloc.stats);
    const char = { ...statAlloc, ...derived, hp: derived.maxHp, mp: derived.maxMp, statPoints: 0 };
    setCharacter(char);
    setScreen('game');
    const pronounRef = char.gender === 'she' ? 'she/her' : char.gender === 'he' ? 'he/him' : 'they/them';
    const backstoryCtx = char.backstory ? ` Reason for being at the crossroads: "${char.backstory}".` : '';
    const qtData = QUEST_TYPE_OPTIONS.find(q => q.id === char.questType);
    const questCtx = qtData ? ` PLAYER DRIVE — ${qtData.title}: ${qtData.gmHint}` : '';
    const intro = `[GAME START] Character: ${char.name} (${pronounRef}), classless Human. Stats: ${JSON.stringify(char.stats)}.${backstoryCtx}${questCtx} Open with a direct, grounded scene at the crossroads at dusk. The character has just arrived on foot. They are OUTSIDE — they can see the inn's warm light, smell woodsmoke and damp earth, hear muffled noise from inside the inn but make out no words. Describe the crossroads, the shrine, the noticeboard, the road. Do not describe anything inside the inn or quote conversations they cannot hear. Keep it to 2-3 short paragraphs.`;
    callGM(char, [], intro, true);
  };

  const handleNewGame = async () => {
    if (!confirm('Begin a new story? Your current save will be lost.')) return;
    await deleteSave();
    setCharacter(null); setMessages([]); setDisplayLog([]);
    setMood('mysterious'); setOptions([]); setCurrentScene(null);
    setNpcStates({});
    setScreen('intro');
  };

  // ─── Image cache handlers ──────────────────────────────────────────────────

  const handleClearAllImages = useCallback(async () => {
    setImgConfirm(null);
    await clearAllImages();
    setSceneImages({});
    setNpcPortraits({});
    showNotif('Image cache cleared. Images will regenerate as you play.', 'info', 4000);
  }, [showNotif]);

  const handleClearCurrentImage = useCallback(async () => {
    setImgConfirm(null);
    if (!currentScene) return;
    const key = slugifyPrompt(currentScene);
    await clearSceneImage(key);
    setSceneImages(prev => { const n = { ...prev }; delete n[key]; return n; });
    fetchSceneImage(currentScene, key, {
      mood,
      location: character?.location || '',
      characterDesc: character?.name ? `${character.name}, ${character.background || 'traveler'}, medieval clothing` : '',
    });
    showNotif('Regenerating scene image...', 'info', 3000);
  }, [currentScene, character, mood, fetchSceneImage, showNotif]);

  const theme = MOOD_THEMES[mood] || MOOD_THEMES.mysterious;

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (screen === 'loading') return (
    <div style={{background:'#08050f',color:'#9b72cf',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Georgia, serif'}}>
      <div style={{textAlign:'center',opacity:0.7}}>
        <div style={{fontSize:'2rem',marginBottom:'0.75rem'}}>⚔</div>
        <div style={{fontSize:'0.9rem',letterSpacing:'0.2em'}}>LOADING...</div>
      </div>
    </div>
  );

  // ─── Intro ─────────────────────────────────────────────────────────────────

  if (screen === 'intro') return (
    <div style={{background:'radial-gradient(ellipse at 30% 20%, #1a0e2e 0%, #08050f 60%, #0a0508 100%)',color:'#c9a96e',height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia, serif',textAlign:'center',padding:'2rem'}}>
      <div style={{fontSize:'2.5rem',marginBottom:'0.5rem',letterSpacing:'0.1em'}}>⚔</div>
      <h1 style={{fontSize:'2.2rem',fontWeight:'normal',letterSpacing:'0.2em',marginBottom:'0.4rem',color:'#e8c87a'}}>VALDENMOOR</h1>
      <div style={{letterSpacing:'0.35em',fontSize:'0.75rem',color:'#6a5a4a',marginBottom:'2rem'}}>CHRONICLES</div>
      <div style={{width:'60px',height:'1px',background:'#c9a96e',opacity:0.4,marginBottom:'2rem'}}/>
      <p style={{maxWidth:'420px',lineHeight:'1.9',color:'#8a7a6a',marginBottom:'2.5rem',fontSize:'0.9rem'}}>
        An old kingdom. Unfinished roads. People holding on to things the land seems intent on taking. You came here for your own reasons — and the crossroads, as it always has, does not care what brought you. Only what you do now that you've arrived.
      </p>
      <button onClick={() => setScreen('name')}
        style={{background:'transparent',border:'2px solid #c9a96e66',color:'#c9a96e',padding:'0.7rem 2.5rem',fontSize:'0.85rem',letterSpacing:'0.15em',cursor:'pointer',fontFamily:'Georgia, serif',transition:'all 0.25s'}}
        onMouseOver={e=>{e.target.style.background='rgba(201,169,110,0.15)';e.target.style.borderColor='#c9a96e'}}
        onMouseOut={e=>{e.target.style.background='transparent';e.target.style.borderColor='#c9a96e66'}}>
        BEGIN YOUR STORY
      </button>
      <button onClick={onLogout} style={{marginTop:'2rem',background:'transparent',border:'none',color:'#3a2a1a',cursor:'pointer',fontSize:'0.65rem',fontFamily:'Georgia, serif',letterSpacing:'0.1em'}}>
        sign out ({user.username})
      </button>
    </div>
  );

  // ─── Name ──────────────────────────────────────────────────────────────────

  if (screen === 'name') return (
    <div style={{background:'radial-gradient(ellipse at 30% 20%, #1a0e2e 0%, #08050f 100%)',color:'#c9a96e',height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia, serif',padding:'2rem'}}>
      <div style={{color:'#6a5a4a',fontSize:'0.75rem',letterSpacing:'0.2em',marginBottom:'1.5rem'}}>YOUR NAME</div>
      <input value={tempName} onChange={e=>setTempName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&tempName.trim()&&handleNameSubmit()}
        placeholder="" autoFocus
        style={{background:'transparent',border:'none',borderBottom:'1px solid rgba(201,169,110,0.5)',color:'#e8c87a',fontSize:'1.8rem',textAlign:'center',padding:'0.5rem 1rem',fontFamily:'Georgia, serif',outline:'none',width:'280px',marginBottom:'2rem'}}/>
      <div style={{marginBottom:'2rem'}}>
        <div style={{color:'#6a5a4a',fontSize:'0.65rem',letterSpacing:'0.15em',marginBottom:'0.7rem',textAlign:'center'}}>PRONOUNS</div>
        <div style={{display:'flex',gap:'0.5rem'}}>
          {[['he','He/Him'],['she','She/Her'],['they','They/Them']].map(([val,label])=>(
            <button key={val} onClick={()=>setTempGender(val)}
              style={{background:tempGender===val?'rgba(201,169,110,0.2)':'transparent',border:`1px solid ${tempGender===val?'#c9a96e':'rgba(201,169,110,0.3)'}`,color:tempGender===val?'#e8c87a':'#6a5a4a',padding:'0.4rem 0.9rem',cursor:'pointer',fontFamily:'Georgia, serif',fontSize:'0.78rem',transition:'all 0.15s'}}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleNameSubmit} disabled={!tempName.trim()}
        style={{background:'transparent',border:'1px solid rgba(201,169,110,0.5)',color:'#c9a96e',padding:'0.6rem 2rem',fontSize:'0.85rem',cursor:tempName.trim()?'pointer':'not-allowed',fontFamily:'Georgia, serif',letterSpacing:'0.1em',opacity:tempName.trim()?1:0.4}}>
        Continue →
      </button>
    </div>
  );

  // ─── Backstory ─────────────────────────────────────────────────────────────

  if (screen === 'backstory') return (
    <div style={{background:'radial-gradient(ellipse at 30% 20%, #1a0e2e 0%, #08050f 100%)',color:'#c9a96e',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia, serif',padding:'2rem'}}>
      <div style={{color:'#6a5a4a',fontSize:'0.75rem',letterSpacing:'0.2em',marginBottom:'0.5rem'}}>WHO WERE YOU BEFORE?</div>
      <div style={{color:'#3a2a1a',fontSize:'0.68rem',marginBottom:'1.5rem'}}>Choose one or write your own.</div>
      <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',width:'100%',maxWidth:'440px',marginBottom:'1.25rem'}}>
        {BACKSTORY_OPTIONS.map((opt,i)=>(
          <button key={i} onClick={()=>setTempBackstory(opt)}
            style={{background:tempBackstory===opt?'rgba(201,169,110,0.15)':'transparent',border:`1px solid ${tempBackstory===opt?'#c9a96e':'rgba(201,169,110,0.25)'}`,color:tempBackstory===opt?'#e8c87a':'#8a7a6a',padding:'0.6rem 1rem',cursor:'pointer',fontFamily:'Georgia, serif',fontSize:'0.82rem',textAlign:'left',lineHeight:'1.5',transition:'all 0.15s'}}>
            {opt}
          </button>
        ))}
      </div>
      <textarea value={tempBackstory} onChange={e=>setTempBackstory(e.target.value)}
        placeholder="Or write your own reason..."
        rows={2}
        style={{background:'transparent',border:'none',borderBottom:'1px solid rgba(201,169,110,0.3)',color:'#d4c4a0',fontFamily:'Georgia, serif',fontSize:'0.85rem',padding:'0.4rem 0.25rem',outline:'none',width:'100%',maxWidth:'440px',resize:'none',marginBottom:'1.5rem'}}/>
      <div style={{display:'flex',gap:'0.75rem'}}>
        <button onClick={()=>handleBackstorySubmit(tempBackstory)}
          style={{background:tempBackstory.trim()?'rgba(201,169,110,0.15)':'transparent',border:`1px solid ${tempBackstory.trim()?'rgba(201,169,110,0.7)':'rgba(201,169,110,0.3)'}`,color:tempBackstory.trim()?'#c9a96e':'#6a5a4a',padding:'0.6rem 2rem',fontSize:'0.85rem',cursor:'pointer',fontFamily:'Georgia, serif',letterSpacing:'0.1em'}}>
          Continue →
        </button>
        <button onClick={()=>handleBackstorySubmit('')}
          style={{background:'transparent',border:'none',color:'#3a2a1a',cursor:'pointer',fontSize:'0.75rem',fontFamily:'Georgia, serif'}}>
          Skip
        </button>
      </div>
    </div>
  );

  // ─── Quest Type ────────────────────────────────────────────────────────────

  if (screen === 'questType') return (
    <div style={{background:'radial-gradient(ellipse at 30% 20%, #1a0e2e 0%, #08050f 100%)',color:'#c9a96e',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia, serif',padding:'2rem'}}>
      <div style={{color:'#6a5a4a',fontSize:'0.75rem',letterSpacing:'0.2em',marginBottom:'0.5rem'}}>WHAT DRIVES YOU?</div>
      <div style={{color:'#3a2a1a',fontSize:'0.68rem',marginBottom:'1.5rem'}}>This shapes what the world puts in your path.</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',width:'100%',maxWidth:'560px',marginBottom:'1.5rem'}}>
        {QUEST_TYPE_OPTIONS.map(qt => {
          const selected = tempQuestType === qt.id;
          return (
            <button key={qt.id} onClick={()=>setTempQuestType(selected ? '' : qt.id)}
              style={{background:selected?'rgba(201,169,110,0.12)':'transparent',border:`1px solid ${selected?'#c9a96e':'rgba(201,169,110,0.2)'}`,color:selected?'#e8c87a':'#8a7a6a',padding:'0.65rem 0.85rem',cursor:'pointer',fontFamily:'Georgia, serif',textAlign:'left',lineHeight:'1.4',transition:'all 0.15s'}}>
              <div style={{fontSize:'0.82rem',marginBottom:'0.2rem',color:selected?'#e8c87a':'#c9a96e'}}>{qt.title}</div>
              <div style={{fontSize:'0.72rem',color:selected?'#a08060':'#5a4a3a'}}>{qt.description}</div>
            </button>
          );
        })}
      </div>
      <div style={{display:'flex',gap:'0.75rem'}}>
        <button onClick={()=>handleQuestTypeSubmit(tempQuestType)}
          style={{background:tempQuestType?'rgba(201,169,110,0.15)':'transparent',border:`1px solid ${tempQuestType?'rgba(201,169,110,0.7)':'rgba(201,169,110,0.3)'}`,color:tempQuestType?'#c9a96e':'#6a5a4a',padding:'0.6rem 2rem',fontSize:'0.85rem',cursor:'pointer',fontFamily:'Georgia, serif',letterSpacing:'0.1em'}}>
          Continue →
        </button>
        <button onClick={()=>handleQuestTypeSubmit('')}
          style={{background:'transparent',border:'none',color:'#3a2a1a',cursor:'pointer',fontSize:'0.75rem',fontFamily:'Georgia, serif'}}>
          No strong pull
        </button>
      </div>
    </div>
  );

  // ─── Stat Allocation ───────────────────────────────────────────────────────

  if (screen === 'statAlloc' && statAlloc) return (
    <div style={{background:'radial-gradient(ellipse at 30% 20%, #1a0e2e 0%, #08050f 100%)',color:'#c9a96e',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia, serif',padding:'2rem'}}>
      <div style={{color:'#6a5a4a',fontSize:'0.7rem',letterSpacing:'0.2em',marginBottom:'0.5rem'}}>FORGE YOUR NATURE</div>
      <h2 style={{fontWeight:'normal',fontSize:'1.3rem',letterSpacing:'0.1em',marginBottom:'0.25rem'}}>{statAlloc.name}</h2>
      <p style={{color:'#6a5a4a',fontSize:'0.75rem',marginBottom:'0.5rem'}}>
        Points remaining: <span style={{color:statAlloc.statPoints>0?'#e8c87a':'#4caf7a'}}>{statAlloc.statPoints}</span>
      </p>
      <p style={{color:'#4a3a2a',fontSize:'0.7rem',marginBottom:'1.5rem'}}>Min 6 · Max 16 · Base 8</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.6rem',marginBottom:'1.5rem',width:'100%',maxWidth:'420px'}}>
        {Object.entries(statAlloc.stats).map(([stat, val]) => {
          const mod = Math.floor((val-10)/2);
          return (
            <div key={stat} style={{background:'rgba(201,169,110,0.06)',border:'1px solid rgba(201,169,110,0.2)',padding:'0.6rem 0.5rem',textAlign:'center'}}>
              <div style={{fontSize:'0.65rem',color:'#6a5a4a',letterSpacing:'0.1em',marginBottom:'0.2rem'}}>{stat}</div>
              <div style={{fontSize:'0.6rem',color:'#4a3a2a',marginBottom:'0.4rem'}}>{STAT_LABELS[stat]}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem'}}>
                <button onClick={()=>adjustStat(stat,-1)} style={{background:'transparent',border:'1px solid rgba(201,169,110,0.4)',color:'#c9a96e',width:'22px',height:'22px',cursor:'pointer',fontSize:'0.9rem',lineHeight:1}}>−</button>
                <span style={{fontSize:'1.1rem',color:'#e8c87a',minWidth:'20px'}}>{val}</span>
                <button onClick={()=>adjustStat(stat,1)} style={{background:'transparent',border:'1px solid rgba(201,169,110,0.4)',color:'#c9a96e',width:'22px',height:'22px',cursor:'pointer',fontSize:'0.9rem',lineHeight:1}}>+</button>
              </div>
              <div style={{fontSize:'0.65rem',color:mod>=0?'#4caf7a':'#c94a4a',marginTop:'0.2rem'}}>{mod>=0?'+':''}{mod}</div>
            </div>
          );
        })}
      </div>
      <button onClick={finalizeCharacter} disabled={statAlloc.statPoints!==0}
        style={{background:statAlloc.statPoints===0?'rgba(201,169,110,0.15)':'transparent',border:`2px solid ${statAlloc.statPoints===0?'#c9a96e':'#333'}`,color:statAlloc.statPoints===0?'#c9a96e':'#444',padding:'0.7rem 2.5rem',fontSize:'0.85rem',letterSpacing:'0.1em',cursor:statAlloc.statPoints===0?'pointer':'not-allowed',fontFamily:'Georgia, serif',transition:'all 0.2s'}}>
        {statAlloc.statPoints>0?`Spend ${statAlloc.statPoints} more point${statAlloc.statPoints!==1?'s':''}` : 'Enter Valdenmoor →'}
      </button>
    </div>
  );

  // ─── Main Game Screen ──────────────────────────────────────────────────────

  if (screen === 'game' && character) {
    const hpColor = character.hp/character.maxHp>0.6?'#4caf7a':character.hp/character.maxHp>0.3?'#e8c87a':'#c94a4a';

    const pal = lightMode ? {
      mainBg: 'radial-gradient(ellipse at top, #d9c9a0 0%, #c4ad80 100%)',
      headerBg: 'rgba(180,155,105,0.92)',
      headerBorder: 'rgba(100,70,30,0.3)',
      panelBg: 'rgba(210,185,145,0.97)',
      panelBorder: 'rgba(100,70,30,0.25)',
      logEntryBg: 'rgba(180,150,100,0.12)',
      inputBg: 'rgba(195,168,112,0.99)',
      inputBorder: 'rgba(100,70,30,0.65)',
      footerBg: 'rgba(180,155,105,0.7)',
      textMain: '#1a0e04',
      textMuted: '#5a3a1a',
      textAccent: '#7a4a10',
      settingsBg: '#d0b888',
      settingsBorder: 'rgba(100,70,30,0.5)',
      settingsText: '#2a1a0a',
    } : {
      mainBg: theme.bg,
      headerBg: 'rgba(0,0,0,0.5)',
      headerBorder: 'rgba(201,169,110,0.2)',
      panelBg: 'rgba(0,0,0,0.85)',
      panelBorder: 'rgba(201,169,110,0.2)',
      logEntryBg: 'rgba(0,0,0,0.2)',
      inputBg: 'rgba(0,0,0,0.6)',
      inputBorder: 'rgba(201,169,110,0.2)',
      footerBg: 'rgba(0,0,0,0.4)',
      textMain: '#d4c4a0',
      textMuted: '#6a5a4a',
      textAccent: '#e8c87a',
      settingsBg: '#0a0a0f',
      settingsBorder: 'rgba(201,169,110,0.4)',
      settingsText: '#d4c4a0',
    };

    return (
      <div style={{background:pal.mainBg,minHeight:'100vh',display:'flex',flexDirection:'column',fontFamily:'Georgia, serif',color:pal.textMain,transition:'background 2s ease',maxWidth:'860px',margin:'0 auto'}}>
        {/* Placeholder color can't be set via inline styles — inject a style tag based on mode */}
        <style>{`input::placeholder { color: ${lightMode ? 'rgba(80,52,16,0.58)' : 'rgba(180,155,110,0.5)'}; }`}</style>
        <Notification notification={notification}/>

        {/* WORLD MAP OVERLAY */}
        {showMap && (
          <WorldMap
            character={character}
            onFastTravel={handleFastTravel}
            onSetWaypoint={handleSetWaypointFromMap}
            onClose={() => setShowMap(false)}
          />
        )}

        {/* IMAGE CACHE CONFIRMATION MODAL */}
        {imgConfirm && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
            <div style={{maxWidth:'360px',width:'100%',background:pal.settingsBg,border:`1px solid ${pal.settingsBorder}`,padding:'1.5rem 1.75rem',fontFamily:'Georgia, serif'}}>
              <div style={{color:'#c94a4a',fontSize:'0.72rem',letterSpacing:'0.15em',marginBottom:'1rem'}}>
                {imgConfirm.type === 'all' ? '⚠ CLEAR ALL IMAGES' : '⚠ REFRESH SCENE IMAGE'}
              </div>
              <div style={{color:pal.textMain,fontSize:'0.88rem',lineHeight:'1.7',marginBottom:'1.4rem'}}>
                {imgConfirm.type === 'all'
                  ? 'This will delete every cached image — all scenes and NPC portraits. They will be regenerated fresh as you play, using the current prompts.'
                  : 'This will delete the cached image for the current scene and immediately request a new one. The new image may look different.'}
              </div>
              <div style={{display:'flex',gap:'0.75rem'}}>
                <button onClick={() => imgConfirm.type === 'all' ? handleClearAllImages() : handleClearCurrentImage()}
                  style={{background:'rgba(180,50,50,0.2)',border:'1px solid rgba(180,50,50,0.7)',color:'#e07070',padding:'0.45rem 1.25rem',cursor:'pointer',fontFamily:'Georgia, serif',fontSize:'0.82rem',transition:'all 0.15s'}}
                  onMouseOver={e=>{e.currentTarget.style.background='rgba(180,50,50,0.35)';}}
                  onMouseOut={e=>{e.currentTarget.style.background='rgba(180,50,50,0.2)';}}>
                  Confirm
                </button>
                <button onClick={() => setImgConfirm(null)}
                  style={{background:'transparent',border:`1px solid ${pal.settingsBorder}`,color:pal.textMuted,padding:'0.45rem 1.25rem',cursor:'pointer',fontFamily:'Georgia, serif',fontSize:'0.82rem',transition:'all 0.15s'}}
                  onMouseOver={e=>{e.currentTarget.style.background='rgba(201,169,110,0.1)';}}
                  onMouseOut={e=>{e.currentTarget.style.background='transparent';}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HOW TO PLAY MODAL */}
        {showHowToPlay && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
            <div style={{maxWidth:'480px',width:'100%',background:pal.settingsBg,border:`1px solid ${pal.settingsBorder}`,padding:'1.5rem 1.75rem',fontFamily:'Georgia, serif'}}>
              <div style={{color:pal.textAccent,fontSize:'0.75rem',letterSpacing:'0.15em',marginBottom:'1.25rem'}}>HOW TO PLAY</div>
              <div style={{color:pal.textMain,fontSize:'0.88rem',lineHeight:'1.75'}}>
                <p style={{marginBottom:'0.75rem'}}><strong style={{color:pal.textAccent}}>Type anything</strong> in the input to act. Describe what your character does, says, examines, or attempts. The world responds to what you do.</p>
                <p style={{marginBottom:'0.75rem'}}><strong style={{color:pal.textAccent}}>Stats</strong> shape outcomes — Strength for combat, Dexterity for stealth, Intellect for magic, Wisdom for perception, Constitution for endurance, Charisma for social situations.</p>
                <p style={{marginBottom:'0.75rem'}}><strong style={{color:pal.textAccent}}>Skills</strong> are taught by NPCs. Earn their trust. Teaching takes time.</p>
                <p style={{marginBottom:'0.75rem'}}><strong style={{color:pal.textAccent}}>Waypoints</strong> mark locations for fast travel. Set them by visiting a place and establishing a presence — the GM will note it. Fast travel is possible between waypoints, but the road is never entirely safe.</p>
                <p style={{marginBottom:'0'}}>Pay attention to what people say, what they don't say, and who's asking.</p>
              </div>
              <button onClick={()=>setShowHowToPlay(false)}
                style={{marginTop:'1.25rem',background:'transparent',border:`1px solid ${pal.settingsBorder}`,color:pal.textAccent,padding:'0.5rem 1.5rem',cursor:'pointer',fontFamily:'Georgia, serif',fontSize:'0.82rem'}}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div style={{background:pal.headerBg,backdropFilter:'blur(4px)',borderBottom:`1px solid ${pal.headerBorder}`,padding:'0.65rem 1rem',display:'flex',flexDirection:'column',gap:'0.45rem',position:'sticky',top:0,zIndex:100}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.4rem'}}>
            <div>
              <span style={{color:pal.textAccent,fontSize:'1.1rem'}}>{character.name}</span>
              <span style={{color:pal.textMuted,fontSize:'0.88rem',margin:'0 0.5rem'}}>·</span>
              <span style={{color:pal.textMuted,fontSize:'0.88rem'}}>Lv {character.level}</span>
              <span style={{color:pal.textMuted,fontSize:'0.88rem',margin:'0 0.5rem'}}>·</span>
              <span style={{color:pal.textMuted,fontSize:'0.82rem',fontStyle:'italic'}}>
                {character.location.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
              </span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <span style={{color:pal.textAccent,fontSize:'0.92rem'}}>💰 {character.gold}g</span>
              {onAdmin && <button onClick={onAdmin} style={{background:'transparent',border:'none',color:pal.textMuted,cursor:'pointer',fontSize:'0.65rem',fontFamily:'Georgia, serif'}}>admin</button>}
              {/* Settings */}
              <div style={{position:'relative'}}>
                <button onClick={()=>setShowSettings(p=>!p)}
                  style={{background:showSettings?`rgba(201,169,110,0.15)`:'transparent',border:`1px solid ${showSettings?'rgba(201,169,110,0.6)':'rgba(201,169,110,0.25)'}`,color:pal.textAccent,padding:'0.25rem 0.65rem',cursor:'pointer',fontSize:'0.88rem',fontFamily:'Georgia, serif',letterSpacing:'0.05em',transition:'all 0.15s'}}>
                  ⚙
                </button>
                {showSettings && (
                  <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:pal.settingsBg,border:`1px solid ${pal.settingsBorder}`,zIndex:300,minWidth:'175px',fontFamily:'Georgia, serif',boxShadow:'0 4px 16px rgba(0,0,0,0.5)'}}>
                    {[
                      [lightMode ? '☾ Dark Mode' : '☀ Light Mode', toggleLightMode],
                      ['? How to Play', ()=>{setShowHowToPlay(true);setShowSettings(false);}],
                      ['↺ Start Over', ()=>{setShowSettings(false);handleNewGame();}],
                      ['→ Sign Out', ()=>{setShowSettings(false);onLogout();}],
                    ].map(([label, fn])=>(
                      <button key={label} onClick={fn}
                        style={{display:'block',width:'100%',background:'transparent',border:'none',borderBottom:`1px solid ${pal.settingsBorder}40`,color:pal.settingsText,padding:'0.55rem 0.9rem',cursor:'pointer',fontFamily:'Georgia, serif',fontSize:'0.78rem',textAlign:'left',transition:'background 0.1s'}}
                        onMouseOver={e=>e.currentTarget.style.background='rgba(201,169,110,0.12)'}
                        onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                        {label}
                      </button>
                    ))}
                    {/* Image cache divider */}
                    <div style={{borderTop:`1px solid ${pal.settingsBorder}`,margin:'0.15rem 0',opacity:0.5}}/>
                    {currentScene && (
                      <button onClick={()=>{setShowSettings(false);setImgConfirm({type:'current'});}}
                        style={{display:'block',width:'100%',background:'transparent',border:'none',borderBottom:`1px solid ${pal.settingsBorder}40`,color:pal.settingsText,padding:'0.55rem 0.9rem',cursor:'pointer',fontFamily:'Georgia, serif',fontSize:'0.78rem',textAlign:'left',transition:'background 0.1s'}}
                        onMouseOver={e=>e.currentTarget.style.background='rgba(201,169,110,0.12)'}
                        onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                        🖼 Refresh Scene Image
                      </button>
                    )}
                    <button onClick={()=>{setShowSettings(false);setImgConfirm({type:'all'});}}
                      style={{display:'block',width:'100%',background:'transparent',border:'none',color:pal.settingsText,padding:'0.55rem 0.9rem',cursor:'pointer',fontFamily:'Georgia, serif',fontSize:'0.78rem',textAlign:'left',transition:'background 0.1s'}}
                      onMouseOver={e=>e.currentTarget.style.background='rgba(201,169,110,0.12)'}
                      onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      🗑 Clear All Images
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap',alignItems:'center'}}>
            <StatBar label="HP" value={character.hp} max={character.maxHp} color={hpColor}/>
            <StatBar label="MP" value={character.mp} max={character.maxMp} color="#7a8fd4"/>
            <XPBar value={character.xp} max={character.xpToNext} color={theme.accent}/>
          </div>
          <div style={{display:'flex',gap:'0.35rem',flexWrap:'wrap'}}>
            {[['📊','Stats'],['🎒','Pack'],['⚔','Skills'],['✨','Spells'],['📜','Lore']].map(([icon,label])=>(
              <PanelButton key={label} icon={icon} label={label} active={panel===label} onClick={()=>setPanel(p=>p===label?null:label)}/>
            ))}
            <PanelButton icon="🗺" label="Map" active={false} onClick={() => setShowMap(true)}/>
          </div>
        </div>

        {/* STATS PANEL */}
        {panel==='Stats'&&(
          <div style={{background:pal.panelBg,borderBottom:`1px solid ${pal.panelBorder}`,padding:'0.75rem'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem',maxWidth:'400px'}}>
              {Object.entries(character.stats).map(([s,v])=>{
                const mod=Math.floor((v-10)/2);
                return <div key={s} style={{textAlign:'center',padding:'0.4rem',border:`1px solid ${pal.panelBorder}`}}>
                  <div style={{color:pal.textMuted,fontSize:'0.6rem',letterSpacing:'0.1em'}}>{s}</div>
                  <div style={{color:pal.textAccent,fontSize:'1.2rem'}}>{v}</div>
                  <div style={{color:mod>=0?'#4caf7a':'#c94a4a',fontSize:'0.65rem'}}>{mod>=0?'+':''}{mod}</div>
                </div>;
              })}
            </div>
            {character.statPoints>0&&<div style={{color:pal.textAccent,fontSize:'0.8rem',marginTop:'0.5rem'}}>⬆ {character.statPoints} unspent stat points — tell the GM!</div>}
            <div style={{marginTop:'0.5rem',borderTop:`1px solid ${pal.panelBorder}`,paddingTop:'0.4rem'}}>
              {(()=>{
                const p = character.gender==='he'?'he/him':character.gender==='she'?'she/her':'they/them';
                const gt = formatGameTime(character.gameMinutes || 0);
                const needs = needsLabel(character.hunger, character.thirst, character.fatigue);
                return <>
                  <div style={{color:pal.textMuted,fontSize:'0.65rem',fontStyle:'italic'}}>
                    {`Day ${gt.dayNum} · ${gt.label} · ${gt.hr12}:${gt.mn}${gt.ampm} · ${character.race} · ${p}`}
                  </div>
                  {needs && <div style={{color:needs.includes('⚠')?'#c94a4a':pal.textMuted,fontSize:'0.65rem',fontStyle:'italic',marginTop:'0.15rem'}}>{needs}</div>}
                </>;
              })()}
            </div>
          </div>
        )}

        {/* PACK PANEL */}
        {panel==='Pack'&&(
          <div style={{background:pal.panelBg,borderBottom:`1px solid ${pal.panelBorder}`,padding:'0.75rem'}}>
            <div style={{color:pal.textMuted,fontSize:'0.65rem',letterSpacing:'0.1em',marginBottom:'0.4rem'}}>CARRIED ({character.inventory.length} items)</div>
            {character.inventory.length===0
              ? <div style={{color:pal.textMuted,fontSize:'0.8rem',fontStyle:'italic'}}>Nothing carried.</div>
              : (() => {
                  const counts={};
                  character.inventory.forEach(item=>{counts[item]=(counts[item]||0)+1;});
                  return Object.entries(counts).map(([item,count])=>(
                    <div key={item} style={{color:'#c9a96e',fontSize:'0.82rem',padding:'0.2rem 0',borderBottom:`1px solid ${pal.panelBorder}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span>· {item}</span>
                      {count>1&&<span style={{color:pal.textMuted,fontSize:'0.72rem'}}>×{count}</span>}
                    </div>
                  ));
                })()
            }
            <div style={{marginTop:'0.6rem',color:pal.textMuted,fontSize:'0.65rem',fontStyle:'italic',borderTop:`1px solid ${pal.panelBorder}`,paddingTop:'0.4rem'}}>
              Use any item by describing it in the input below.
            </div>
          </div>
        )}

        {/* SKILLS PANEL */}
        {panel==='Skills'&&(
          <div style={{background:pal.panelBg,borderBottom:`1px solid ${pal.panelBorder}`,padding:'0.75rem'}}>
            <div style={{color:pal.textMuted,fontSize:'0.65rem',letterSpacing:'0.1em',marginBottom:'0.6rem'}}>SKILLS</div>
            {character.skills.length===0
              ? <div style={{color:pal.textMuted,fontSize:'0.8rem',fontStyle:'italic'}}>
                  No skills yet. Skills are learned slowly from willing teachers — and teachers must be earned.
                </div>
              : character.skills.map(sk => <SkillProgressBar key={sk.id || sk.name} skill={sk}/>)
            }
            <div style={{marginTop:'0.5rem',color:pal.textMuted,fontSize:'0.62rem',fontStyle:'italic',borderTop:`1px solid ${pal.panelBorder}`,paddingTop:'0.4rem'}}>
              Skills advance through practice (XP) and meeting tier gate requirements.
            </div>
          </div>
        )}

        {/* SPELLS PANEL */}
        {panel==='Spells'&&(
          <div style={{background:pal.panelBg,borderBottom:`1px solid ${pal.panelBorder}`,padding:'0.75rem'}}>
            <div style={{color:pal.textMuted,fontSize:'0.65rem',letterSpacing:'0.1em',marginBottom:'0.4rem'}}>KNOWN SPELLS</div>
            {character.spells.length===0 && (character.spellLearning?.length === 0 || !character.spellLearning)
              ? <div style={{color:'#4a3a2a',fontSize:'0.8rem',fontStyle:'italic'}}>Seek those willing to teach. Magic is not given — it is earned through trust and time.</div>
              : character.spells.map((sp,i)=>(
                <div key={i} style={{marginBottom:'0.6rem',borderBottom:'1px solid rgba(201,169,110,0.08)',paddingBottom:'0.5rem'}}>
                  <div style={{color:'#b08fd4',fontSize:'0.88rem'}}>✦ {sp.name} <span style={{color:'#5a4a7a',fontSize:'0.7rem'}}>({sp.mpCost} MP)</span></div>
                  <div style={{color:'#6a5a7a',fontSize:'0.75rem'}}>{sp.description}</div>
                  <div style={{color:'#4a3a5a',fontSize:'0.68rem',fontStyle:'italic'}}>Taught by {sp.taughtBy}</div>
                </div>
              ))
            }
            {/* In-progress spell learning */}
            {(character.spellLearning?.length > 0) && (
              <>
                <div style={{color:'#5a4a6a',fontSize:'0.65rem',letterSpacing:'0.1em',margin:'0.5rem 0 0.4rem',borderTop:'1px solid rgba(201,169,110,0.08)',paddingTop:'0.5rem'}}>LEARNING</div>
                {character.spellLearning.map((sl,i) => (
                  <div key={i} style={{marginBottom:'0.5rem',paddingBottom:'0.4rem',borderBottom:'1px solid rgba(100,80,120,0.15)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                      <span style={{color:'#8060a8',fontSize:'0.82rem'}}>◌ {sl.spellName}</span>
                      <span style={{color:'#4a3a5a',fontSize:'0.65rem'}}>Stage {sl.stage}/{sl.totalStages}</span>
                    </div>
                    <div style={{height:'3px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',margin:'0.25rem 0',overflow:'hidden'}}>
                      <div style={{width:`${(sl.stage/sl.totalStages)*100}%`,height:'100%',background:'#6a4a8a',borderRadius:'2px'}}/>
                    </div>
                    {sl.partialNote && <div style={{color:'#5a4a6a',fontSize:'0.68rem',fontStyle:'italic'}}>{sl.partialNote}</div>}
                    {sl.teacherNpcId && <div style={{color:'#3a2a4a',fontSize:'0.62rem',fontStyle:'italic'}}>Learning from: {sl.teacherNpcId.replace(/_/g,' ')}</div>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* LORE PANEL */}
        {panel==='Lore'&&(
          <div style={{background:pal.panelBg,borderBottom:`1px solid ${pal.panelBorder}`,padding:'0.75rem'}}>
            <div style={{color:pal.textMuted,fontSize:'0.65rem',letterSpacing:'0.1em',marginBottom:'0.4rem'}}>DISCOVERED KNOWLEDGE</div>
            {Object.keys(character.flags).length===0
              ? <div style={{color:'#4a3a2a',fontSize:'0.8rem',fontStyle:'italic'}}>Nothing noted yet. Investigate the world.</div>
              : Object.entries(character.flags).filter(([k])=>!k.startsWith('notable_')).map(([k,v])=>(
                  <div key={k} style={{color:'#c9a96e',fontSize:'0.78rem',padding:'0.15rem 0'}}>· {k.replace(/_/g,' ')}: <span style={{color:'#6a5a4a'}}>{String(v)}</span></div>
                ))
            }
            <div style={{marginTop:'0.75rem',color:'#6a5a4a',fontSize:'0.65rem',letterSpacing:'0.1em'}}>KNOWN LOCATIONS</div>
            {character.knownLocations.map(loc=>(
              <div key={loc} style={{color:'#5a7a5a',fontSize:'0.78rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                · {loc.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                {loc===character.location&&<span style={{color:'#4a5a3a',fontSize:'0.65rem'}}>← here</span>}
                {character.waypoints?.includes(loc)&&<span style={{color:'#c9a96e',fontSize:'0.6rem'}}>★</span>}
              </div>
            ))}
            {/* Notable NPC relationships */}
            {Object.keys(npcStates).length > 0 && (
              <>
                <div style={{marginTop:'0.75rem',color:'#6a5a4a',fontSize:'0.65rem',letterSpacing:'0.1em'}}>NPC RELATIONSHIPS</div>
                {Object.entries(npcStates)
                  .filter(([,s]) => s.interactionCount > 0)
                  .sort(([,a],[,b]) => (b.relationship||0) - (a.relationship||0))
                  .map(([id, s]) => {
                    const rel = s.relationship || 0;
                    const relLabel = rel >= 80 ? 'Loyal' : rel >= 60 ? 'Trusted' : rel >= 30 ? 'Warm' : rel >= 0 ? 'Neutral' : rel >= -40 ? 'Cool' : rel >= -60 ? 'Hostile' : 'Refused';
                    const relColor = rel >= 60 ? '#8fc47a' : rel >= 0 ? '#c9a96e' : '#c94a4a';
                    return (
                      <div key={id} style={{color:'#8a7a6a',fontSize:'0.72rem',padding:'0.1rem 0',display:'flex',justifyContent:'space-between'}}>
                        <span>· {id.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
                        <span style={{color:relColor,fontSize:'0.65rem'}}>{relLabel} ({rel > 0 ? '+' : ''}{rel})</span>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        )}

        {/* NARRATIVE LOG */}
        <div style={{flex:1,overflowY:'auto'}} onClick={()=>showSettings&&setShowSettings(false)}>
          {displayLog.map((entry,i)=>{
            if (entry.hidden) return null;
            if (entry.type==='player') return (
              <div key={i} style={{padding:'0.6rem 1rem',marginBottom:'0.25rem'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:'0.5rem',padding:'0.5rem 0.75rem',background:pal.logEntryBg,borderLeft:'2px solid rgba(201,169,110,0.4)'}}>
                  <span style={{color:pal.textMuted,fontSize:'0.68rem',marginTop:'0.2rem',whiteSpace:'nowrap'}}>You</span>
                  <span style={{color:lightMode?'#5a3a10':'#b09a70',fontStyle:'italic',fontSize:'0.88rem',lineHeight:'1.6'}}>{entry.text}</span>
                </div>
              </div>
            );
            const entryTheme = MOOD_THEMES[entry.mood] || MOOD_THEMES.mysterious;
            return (
              <div key={i} style={{marginBottom:'0.5rem'}}>
                {entry.scenePrompt && (() => {
                  const imgKey = slugifyPrompt(entry.scenePrompt);
                  return sceneImages[imgKey]
                    ? <img src={sceneImages[imgKey]} alt="" style={{width:'100%',display:'block',opacity:0.92,maxHeight:'240px',objectFit:'cover',borderBottom:`1px solid ${entryTheme.accent}33`}}/>
                    : <div style={{opacity:0.92}}><SceneIllustration prompt={entry.scenePrompt} mood={entry.mood||'mysterious'}/></div>;
                })()}
                {entry.npcIds?.length > 0 && entry.npcIds.some(id => npcPortraits[id]) && (
                  <div style={{display:'flex',gap:'0.4rem',padding:'0.35rem 0.6rem',background:'rgba(0,0,0,0.3)',flexWrap:'wrap',alignItems:'flex-end'}}>
                    {entry.npcIds.filter(id => npcPortraits[id]).map(id => (
                      <div key={id} style={{textAlign:'center'}}>
                        <img src={npcPortraits[id]} alt={id} style={{width:'52px',height:'52px',objectFit:'cover',border:`1px solid ${entryTheme.accent}44`,display:'block'}}/>
                        <div style={{color:'#6a5a4a',fontSize:'0.58rem',marginTop:'0.1rem'}}>{id.replace(/_/g,' ')}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{padding:'1rem 1rem 0.75rem',background:pal.logEntryBg,borderLeft:`2px solid ${entryTheme.accent}33`}}>
                  <div style={{lineHeight:'1.95',fontSize:'0.92rem',color:pal.textMain,whiteSpace:'pre-wrap'}}>{entry.text}</div>
                </div>
              </div>
            );
          })}
          {loading&&<div style={{textAlign:'center',padding:'1.5rem',color:lightMode?'#7a5a2a':'#4a3a5a',fontStyle:'italic',fontSize:'0.85rem',letterSpacing:'0.1em'}}>✦ &nbsp; the oracle stirs &nbsp; ✦</div>}
          <div ref={logEndRef}/>
        </div>

        {/* INPUT */}
        <div style={{padding:'0.5rem 0.75rem 0.6rem',background:pal.inputBg,borderTop:`2px solid ${pal.inputBorder}`}}>
          <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend(input)}
              placeholder="What do you do?"
              disabled={loading}
              style={{flex:1,background:'transparent',border:'none',borderBottom:`1px solid ${pal.inputBorder}`,color:pal.textMain,fontFamily:'Georgia, serif',fontSize:'0.88rem',padding:'0.3rem 0.25rem',outline:'none'}}/>
            <button onClick={()=>handleSend(input)} disabled={loading||!input.trim()}
              style={{background:'transparent',border:`1px solid ${input.trim()?'rgba(201,169,110,0.6)':pal.inputBorder}`,color:input.trim()?'#c9a96e':pal.textMuted,padding:'0.3rem 0.9rem',cursor:input.trim()?'pointer':'default',fontFamily:'Georgia, serif',fontSize:'0.85rem',transition:'all 0.15s'}}>→</button>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{textAlign:'center',padding:'0.3rem',background:pal.footerBg,borderTop:`1px solid ${pal.panelBorder}`}}>
          <span style={{color:pal.textMuted,fontSize:'0.62rem',fontFamily:'Georgia, serif',fontStyle:'italic',opacity:0.5}}>Valdenmoor Chronicles</span>
        </div>
      </div>
    );
  }

  return null;
}
