// ─── Valdenmoor Chronicles — World Data ─────────────────────────────────────
// All world data lives server-side. Never sent to the browser in full.
// Injected selectively into GM system prompts based on context.

// ─── MAP DATA ────────────────────────────────────────────────────────────────

export const MAP_DATA = {
  locations: [
    { id: 'crossroads',      name: 'The Crossroads',             x: 300, y: 280, type: 'landmark',    startKnown: true  },
    { id: 'thornhaven',      name: 'Thornhaven',                 x: 250, y: 180, type: 'village',     startKnown: false },
    { id: 'valdenmoor',      name: 'Valdenmoor',                 x: 410, y: 215, type: 'city',        startKnown: false },
    { id: 'port_saltmere',   name: 'Port Saltmere',              x: 495, y: 310, type: 'town',        startKnown: false },
    { id: 'whisperwood',     name: 'Whisperwood',                x: 230, y: 360, type: 'wilderness',  startKnown: false },
    { id: 'aethra_ruins',    name: 'Aethra Ruins',               x: 155, y: 200, type: 'ruins',       startKnown: false },
    { id: 'iron_gate',       name: 'Iron Gate',                  x: 130, y: 310, type: 'dungeon',     startKnown: false },
    { id: 'high_moors',      name: 'High Moors',                 x: 150, y:  80, type: 'wilderness',  startKnown: false },
    { id: 'bren_monastery',  name: 'Bren Monastery',             x: 385, y: 130, type: 'landmark',    startKnown: false },
    { id: 'redgate',         name: 'Redgate',                    x: 200, y: 100, type: 'village',     startKnown: false },
    { id: 'millhaven',       name: 'Millhaven',                  x: 365, y: 295, type: 'village',     startKnown: false },
    { id: 'hearthwick',      name: 'Hearthwick',                 x: 290, y: 385, type: 'hamlet',      startKnown: false },
    { id: 'resonance_nexus', name: 'Resonance Nexus',            x: 290, y: 190, type: 'special',     startKnown: false },
    { id: 'hermits_tower',   name: "Hermit's Tower",             x: 215, y: 430, type: 'ruins',       startKnown: false },
    { id: 'sunken_temple',   name: 'Sunken Temple',              x: 520, y: 370, type: 'dungeon',     startKnown: false },
    { id: 'shattered_spire', name: 'Shattered Spire',            x: 115, y: 105, type: 'ruins',       startKnown: false },
    { id: 'gray_gardens',    name: 'The Gray Gardens',           x: 205, y: 395, type: 'ruins',       startKnown: false },
    { id: 'hollow_keep',     name: 'Hollow Keep',                x: 350, y: 415, type: 'dungeon',     startKnown: false },
    { id: 'engine_chamber',  name: 'Engine Chamber',             x: 405, y: 225, type: 'special',     startKnown: false, underground: true },
    { id: 'under_streets',   name: 'Valdenmoor Under-Streets',   x: 400, y: 228, type: 'dungeon',     startKnown: false, underground: true },
  ],
  roads: [
    ['crossroads',     'thornhaven',     'North Road'],
    ['thornhaven',     'redgate',        'North Road'],
    ['redgate',        'high_moors',     'Moorland Track'],
    ['crossroads',     'millhaven',      'East Road'],
    ['millhaven',      'valdenmoor',     'East Road'],
    ['valdenmoor',     'port_saltmere',  'Coast Road'],
    ['crossroads',     'hearthwick',     'South Road'],
    ['hearthwick',     'whisperwood',    'Forest Path'],
    ['whisperwood',    'hermits_tower',  'Forest Path'],
    ['whisperwood',    'gray_gardens',   'Forest Path'],
    ['crossroads',     'aethra_ruins',   'Western Track'],
    ['aethra_ruins',   'iron_gate',      "Miner's Track"],
    ['valdenmoor',     'bren_monastery', 'Monastery Road'],
    ['port_saltmere',  'sunken_temple',  'Coastal Path'],
    ['high_moors',     'shattered_spire','Moorland Track'],
    ['valdenmoor',     'hollow_keep',    'Southern Road'],
  ],
};

// Helper: euclidean distance between two location IDs
export function mapDistance(idA, idB) {
  const a = MAP_DATA.locations.find(l => l.id === idA);
  const b = MAP_DATA.locations.find(l => l.id === idB);
  if (!a || !b) return 999;
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

// ─── SKILL CATALOG ────────────────────────────────────────────────────────────
// 18 skills. Each has 5 tiers. Gate = what's required to advance beyond tier N.
// XP is awarded by the GM via skillXP stateChanges.

export const SKILL_CATALOG = [
  {
    id: 'swordsmanship', name: 'Swordsmanship', stat: 'STR/DEX',
    description: 'The art of blade combat — footwork, guard, riposte.',
    tiers: [
      { tier:1, name:'Awkward',        xpToNext:50,  gate:'initial_lesson',           abilities:'Can swing without hurting yourself. Wild strikes, easy to read.' },
      { tier:2, name:'Apprentice',     xpToNext:100, gate:'practice_only',             abilities:'Basic guard, simple combos. You land hits more often than not.' },
      { tier:3, name:'Competent',      xpToNext:200, gate:'npc_lesson_or_25_combats',  abilities:'Parry, riposte, disarm attempts. Experienced fighters notice your form.' },
      { tier:4, name:'Seasoned',       xpToNext:300, gate:'sparring_master_or_quest',  abilities:'Fighting style is your own. You read opponents. Dual-wielding feasible.' },
      { tier:5, name:'Master',         xpToNext:null,gate:'survived_named_duel',       abilities:'Each blow is considered. You can fight defensively and still threaten.' },
    ],
  },
  {
    id: 'archery', name: 'Archery', stat: 'DEX',
    description: 'Ranged accuracy with bow or crossbow.',
    tiers: [
      { tier:1, name:'Unreliable',     xpToNext:50,  gate:'initial_lesson',           abilities:'Can nock and loose. Accuracy is generous luck.' },
      { tier:2, name:'Steady',         xpToNext:100, gate:'practice_only',             abilities:'Stationary targets at medium range. Wind throws you off.' },
      { tier:3, name:'Accurate',       xpToNext:200, gate:'50_shots_fired',            abilities:'Moving targets, longer range. Snap shots under pressure are possible.' },
      { tier:4, name:'Sharpshooter',   xpToNext:300, gate:'npc_lesson_or_hunt_quest',  abilities:'Specific body parts, low-light shots, shooting from horseback.' },
      { tier:5, name:'Deadeye',        xpToNext:null,gate:'made_impossible_shot',      abilities:'A shot others remember. Range and conditions barely matter.' },
    ],
  },
  {
    id: 'brawling', name: 'Brawling', stat: 'STR',
    description: 'Unarmed combat: grappling, striking, headbutts, dirty tricks.',
    tiers: [
      { tier:1, name:'Flailing',       xpToNext:50,  gate:'initial_lesson',           abilities:'Throws wild punches. Knocking someone down is possible with luck.' },
      { tier:2, name:'Scrappy',        xpToNext:100, gate:'practice_only',             abilities:'Knows to protect face. Can grapple and hold someone briefly.' },
      { tier:3, name:'Capable',        xpToNext:200, gate:'10_brawls_won',             abilities:'Disabling holds, choke attempts, improvised weapon use.' },
      { tier:4, name:'Dangerous',      xpToNext:300, gate:'npc_lesson_or_pit_victory', abilities:'Anyone watching knows to stay back. Disarms trained swordsmen.' },
      { tier:5, name:'Brutal',         xpToNext:null,gate:'defeated_armored_opponent', abilities:'A force of nature in close quarters. No technique needed.' },
    ],
  },
  {
    id: 'shield_work', name: 'Shield Work', stat: 'CON',
    description: 'Using a shield as both armor and weapon.',
    tiers: [
      { tier:1, name:'Stumbling',      xpToNext:50,  gate:'initial_lesson',           abilities:'Holds it in front. Still gets hit a lot.' },
      { tier:2, name:'Bracing',        xpToNext:100, gate:'practice_only',             abilities:'Deflects blows, bash attacks. Stance is improving.' },
      { tier:3, name:'Solid',          xpToNext:200, gate:'blocked_killing_blow',      abilities:'Shield wall participation, protects allies, absorbs arrows.' },
      { tier:4, name:'Wall',           xpToNext:300, gate:'npc_lesson_or_siege',       abilities:'Holds a doorway alone. Shield almost never fails.' },
      { tier:5, name:'Impenetrable',   xpToNext:null,gate:'survived_arrow_volley',     abilities:'A small army needs to think twice. Shield feels like part of the body.' },
    ],
  },
  {
    id: 'riding', name: 'Riding', stat: 'DEX',
    description: 'Horsemanship: staying in the saddle, controlling the animal, and eventually fighting from one.',
    tiers: [
      { tier:1, name:'Hanging On',     xpToNext:50,  gate:'initial_lesson',           abilities:'Can walk a horse. A trot still risks unseating you.' },
      { tier:2, name:'Comfortable',    xpToNext:100, gate:'practice_only',             abilities:'Trot and canter without drama. Long travel is possible.' },
      { tier:3, name:'Confident',      xpToNext:200, gate:'npc_lesson_or_15_rides',   abilities:'Gallop, crowd navigation, light combat from saddle. Horse trusts you.' },
      { tier:4, name:'Skilled',        xpToNext:300, gate:'bond_with_specific_horse',  abilities:'Jumping, precision maneuvers, fighting at full canter.' },
      { tier:5, name:'Master Rider',   xpToNext:null,gate:'survived_mounted_combat',   abilities:'War-trained. Horse and rider are one.' },
    ],
  },
  {
    id: 'climbing', name: 'Climbing', stat: 'STR',
    description: 'Scaling walls, cliffs, trees, and ruin faces.',
    tiers: [
      { tier:1, name:'Struggling',     xpToNext:50,  gate:'initial_lesson',           abilities:'Low walls and wide-branched trees. Falls happen.' },
      { tier:2, name:'Clambering',     xpToNext:100, gate:'practice_only',             abilities:'Rough stone faces, fences, moderate heights. Slow but safe.' },
      { tier:3, name:'Capable',        xpToNext:200, gate:'20_climbs_completed',       abilities:'Wet surfaces, broken handholds, moderate speed. Rope assists.' },
      { tier:4, name:'Sure-Footed',    xpToNext:300, gate:'climbed_named_structure',   abilities:'Sheer faces, overhangs, in darkness. Others want your route.' },
      { tier:5, name:'Spider',         xpToNext:null,gate:'ascended_impossible_face',  abilities:'Surfaces others call blank walls. Speed and silence both.' },
    ],
  },
  {
    id: 'stealth', name: 'Stealth', stat: 'DEX',
    description: 'Moving silently, hiding in shadow, going unnoticed.',
    tiers: [
      { tier:1, name:'Noisy',          xpToNext:50,  gate:'initial_lesson',           abilities:'Knows to avoid gravel. Concentration is obvious.' },
      { tier:2, name:'Quiet',          xpToNext:100, gate:'practice_only',             abilities:'Distracted guards miss you. Shadows are friends.' },
      { tier:3, name:'Shadow',         xpToNext:200, gate:'bypassed_patrol_3_times',   abilities:'Active guards need to be looking. Urban and wilderness both.' },
      { tier:4, name:'Ghost',          xpToNext:300, gate:'npc_lesson_or_heist_quest', abilities:'Moves through lit rooms undetected. Can tail targets for hours.' },
      { tier:5, name:'Invisible',      xpToNext:null,gate:'vanished_mid_pursuit',      abilities:'People look right through you. Can hide in plain sight.' },
    ],
  },
  {
    id: 'swimming', name: 'Swimming', stat: 'CON',
    description: 'Open water, tidal caves, river crossings.',
    tiers: [
      { tier:1, name:'Floundering',    xpToNext:50,  gate:'initial_lesson',           abilities:'Stays afloat in calm water. Current is dangerous.' },
      { tier:2, name:'Afloat',         xpToNext:100, gate:'practice_only',             abilities:'Crosses calm rivers. Tires quickly in rough water.' },
      { tier:3, name:'Swimmer',        xpToNext:200, gate:'swum_open_water_once',      abilities:'Works against moderate current. Can dive briefly.' },
      { tier:4, name:'Strong Swimmer', xpToNext:300, gate:'npc_lesson_or_rescue_act',  abilities:'Heavy current, sea swells, light gear. Can retrieve items underwater.' },
      { tier:5, name:'Diver',          xpToNext:null,gate:'survived_tidal_cave',       abilities:'Holds breath 3 minutes. Navigates underwater in darkness.' },
    ],
  },
  {
    id: 'herbalism', name: 'Herbalism', stat: 'WIS',
    description: 'Identifying, gathering, and preparing medicinal and alchemical plants.',
    tiers: [
      { tier:1, name:'Novice',         xpToNext:50,  gate:'initial_lesson',           abilities:'Identifies common safe plants. Can make a basic poultice.' },
      { tier:2, name:'Gatherer',       xpToNext:100, gate:'practice_only',             abilities:'Seasonal knowledge, knows best harvest times. Minor remedies.' },
      { tier:3, name:'Preparer',       xpToNext:200, gate:'gathered_10_types',         abilities:'Tinctures, salves, simple antidotes. Some rarer plants recognized.' },
      { tier:4, name:'Healer',         xpToNext:300, gate:'npc_lesson_or_recipe_quest',abilities:'Complex preparations, potency control, rare ingredient use.' },
      { tier:5, name:'Master Herbalist',xpToNext:null,gate:'created_unique_compound',  abilities:'Formulates new preparations. Other healers seek your advice.' },
    ],
  },
  {
    id: 'lockpicking', name: 'Lockpicking', stat: 'DEX',
    description: 'Opening locks without the correct key.',
    tiers: [
      { tier:1, name:'Fumbling',       xpToNext:50,  gate:'initial_lesson',           abilities:'Simple padlocks with time and luck. Breaks picks often.' },
      { tier:2, name:'Learning',       xpToNext:100, gate:'practice_only',             abilities:'Common domestic locks. Moderate speed.' },
      { tier:3, name:'Practiced',      xpToNext:200, gate:'opened_20_locks',           abilities:'Quality locks, in dim light, without noise.' },
      { tier:4, name:'Expert',         xpToNext:300, gate:'npc_lesson_or_vault_quest', abilities:'Military locks, chests. Can assess a lock by feel alone.' },
      { tier:5, name:'Ghost Hand',     xpToNext:null,gate:'bypassed_impossible_lock',  abilities:'People who see it say the lock opened itself.' },
    ],
  },
  {
    id: 'tracking', name: 'Tracking', stat: 'WIS',
    description: 'Following signs through wilderness, reading what passed and when.',
    tiers: [
      { tier:1, name:'Lost',           xpToNext:50,  gate:'initial_lesson',           abilities:'Follows clear, recent trails in soft ground.' },
      { tier:2, name:'Aware',          xpToNext:100, gate:'practice_only',             abilities:'Harder terrain, older tracks. Knows common animal signs.' },
      { tier:3, name:'Tracker',        xpToNext:200, gate:'followed_trail_3_days',     abilities:'Cold trails, rain-washed paths, human quarry.' },
      { tier:4, name:'Hunter',         xpToNext:300, gate:'npc_lesson_or_hunt_contract',abilities:'Estimates party size, speed, load. Follows quarry to ambush.' },
      { tier:5, name:'Pathfinder',     xpToNext:null,gate:'found_hidden_ruin_by_trail',abilities:'Reads a landscape like text. Others cannot hide from you.' },
    ],
  },
  {
    id: 'aethran_lore', name: 'Aethran Lore', stat: 'INT',
    description: 'Knowledge of the ancient Aethran civilization — their language, artifacts, and resonance principles.',
    tiers: [
      { tier:1, name:'Unaware',        xpToNext:50,  gate:'initial_lesson',           abilities:'Knows Aethrans existed. Can identify obvious Aethran architecture.' },
      { tier:2, name:'Curious',        xpToNext:100, gate:'practice_only',             abilities:'Reads basic glyphs. Recognizes resonance artifacts.' },
      { tier:3, name:'Student',        xpToNext:200, gate:'read_5_tablets',            abilities:'Translates technical Aethran text. Understands Mnemorite basics.' },
      { tier:4, name:'Scholar',        xpToNext:300, gate:'npc_lesson_or_ruins_depth', abilities:'Full technical reading. Understands Engine principles. Other scholars listen.' },
      { tier:5, name:'Adept',          xpToNext:null,gate:'entered_engine_chamber',    abilities:'Understands the Engine as its builders did. Can read intent behind the design.' },
    ],
  },
  {
    id: 'persuasion', name: 'Persuasion', stat: 'CHA',
    description: 'Convincing people through honest appeal, charisma, and well-chosen words.',
    tiers: [
      { tier:1, name:'Awkward',        xpToNext:50,  gate:'initial_lesson',           abilities:'States case plainly. Occasionally convincing when already sympathetic.' },
      { tier:2, name:'Convincing',     xpToNext:100, gate:'practice_only',             abilities:'Gets what you want from neutral parties. Knows not to oversell.' },
      { tier:3, name:'Charming',       xpToNext:200, gate:'won_10_social_outcomes',    abilities:'Skeptics are moved. Can shift a crowd.' },
      { tier:4, name:'Compelling',     xpToNext:300, gate:'npc_lesson_or_diplomacy',   abilities:'Changes minds on firmly held positions. Leaders listen.' },
      { tier:5, name:'Irresistible',   xpToNext:null,gate:'averted_open_conflict',     abilities:'People want to agree with you before you finish speaking.' },
    ],
  },
  {
    id: 'deception', name: 'Deception', stat: 'CHA',
    description: 'Lying convincingly, maintaining cover stories, misdirecting attention.',
    tiers: [
      { tier:1, name:'Obvious',        xpToNext:50,  gate:'initial_lesson',           abilities:'Simple lies with friendly marks. Body language betrays you.' },
      { tier:2, name:'Passable',       xpToNext:100, gate:'practice_only',             abilities:'Plausible stories. Keeps composure under mild scrutiny.' },
      { tier:3, name:'Convincing',     xpToNext:200, gate:'maintained_cover_24h',      abilities:'Multi-layered cover stories. Suspicious people still convinced.' },
      { tier:4, name:'Expert',         xpToNext:300, gate:'npc_lesson_or_spy_mission', abilities:'Fools trained interrogators. Lies age well.' },
      { tier:5, name:'Masterful',      xpToNext:null,gate:'deceived_spymaster',        abilities:'Cannot be caught in a lie unless you want to be.' },
    ],
  },
  {
    id: 'trade', name: 'Trade', stat: 'CHA',
    description: 'Haggling, appraising goods, and understanding merchant networks.',
    tiers: [
      { tier:1, name:'Naive',          xpToNext:50,  gate:'initial_lesson',           abilities:'Pays fair price. Sometimes cheated. Knows coin counts.' },
      { tier:2, name:'Haggler',        xpToNext:100, gate:'practice_only',             abilities:'Gets 10-15% discount from willing merchants.' },
      { tier:3, name:'Sharp',          xpToNext:200, gate:'completed_10_trades',       abilities:'Appraises goods accurately. Merchants respect the negotiation.' },
      { tier:4, name:'Merchant',       xpToNext:300, gate:'npc_lesson_or_major_deal',  abilities:'Understands supply and routes. Can move bulk goods profitably.' },
      { tier:5, name:'Magnate',        xpToNext:null,gate:'cornered_a_local_market',   abilities:'Other merchants pay to understand how you do it.' },
    ],
  },
  {
    id: 'healing_arts', name: 'Healing Arts', stat: 'WIS',
    description: 'Treating wounds, illness, and the effects of magic — mundane and otherwise.',
    tiers: [
      { tier:1, name:'Bandaging',      xpToNext:50,  gate:'initial_lesson',           abilities:'Stops bleeding, cleans cuts. Heals 1 HP via careful attention. Slow.' },
      { tier:2, name:'First Aid',      xpToNext:100, gate:'practice_only',             abilities:'Sets bones, treats burns. Heals 1d4 HP with materials.' },
      { tier:3, name:'Field Medic',    xpToNext:200, gate:'saved_life_in_field',       abilities:'Stabilizes the dying. Recognizes magical afflictions.' },
      { tier:4, name:'Surgeon',        xpToNext:300, gate:'npc_lesson_or_monastery',   abilities:'Removes embedded weapons, treats internal injury. Complex care.' },
      { tier:5, name:'Healer',         xpToNext:null,gate:'cured_affliction_others_gave_up',abilities:'Full Healing Trance equivalent without the spell. Recognized.' },
    ],
  },
  {
    id: 'foraging', name: 'Foraging', stat: 'WIS',
    description: 'Living off the land — finding food, water, and shelter in the wilderness.',
    tiers: [
      { tier:1, name:'Ignorant',       xpToNext:50,  gate:'initial_lesson',           abilities:'Knows a few edible berries. Can find water with luck.' },
      { tier:2, name:'Recognizing',    xpToNext:100, gate:'practice_only',             abilities:'Feeds self in temperate wilderness. Avoids common poisonous plants.' },
      { tier:3, name:'Gathering',      xpToNext:200, gate:'survived_3_days_wilderness',abilities:'Feeds a small group. Knows seasonal shifts. Can find shelter quickly.' },
      { tier:4, name:'Thriving',       xpToNext:300, gate:'npc_lesson_or_winter_test', abilities:'Feeds group in winter/harsh terrain. Finds rare plants intentionally.' },
      { tier:5, name:'Living Off the Land',xpToNext:null,gate:'survived_hostile_environment',abilities:'The wilderness is a pantry. Can teach others.' },
    ],
  },
  {
    id: 'sailing', name: 'Sailing', stat: 'DEX',
    description: 'Operating ships and boats, reading weather and tides.',
    tiers: [
      { tier:1, name:'Landlubber',     xpToNext:50,  gate:'initial_lesson',           abilities:'Can row a boat. Does not fall overboard in calm water.' },
      { tier:2, name:'Crew',           xpToNext:100, gate:'practice_only',             abilities:'Can handle a sail on a small vessel. Knows basic knots.' },
      { tier:3, name:'Sailor',         xpToNext:200, gate:'completed_ocean_voyage',    abilities:'Solo-pilots small boats. Reads weather. Manages rough seas.' },
      { tier:4, name:'Mate',           xpToNext:300, gate:'npc_lesson_or_storm_survived',abilities:'Can first-mate a large vessel. Navigates by stars.' },
      { tier:5, name:'Captain',        xpToNext:null,gate:'commanded_ship_in_storm',   abilities:'Commands any vessel. Others feel safer with you at the wheel.' },
    ],
  },
];

// ─── NPC CATALOG ─────────────────────────────────────────────────────────────
// 50 NPCs. relationship_rules: threshold at which NPC behavior changes.
// slamsShut: relationship below this → refuses all help, services, interaction
// gushes: relationship above this → shares secrets, loyalty, special options
// teaching: multi-stage learning. prerequisites checked by GM against character state.

export const NPC_CATALOG = [

  // ── CROSSROADS ──────────────────────────────────────────────────────────────

  {
    id: 'mira',
    name: 'Mira', age: 52, location: 'crossroads', gender: 'F',
    role: 'Innkeeper, The Rusted Compass',
    personality: 'Warm, observant, fiercely protective of her regulars. Speaks plainly. Has seen too much to be shocked easily. Reports travelers to Lady Cassel but feels guilty about it.',
    storyRelevance: 'high',
    clues: [
      'Her mother has severe Forgetting — she describes the progression honestly if asked.',
      'She sealed the cellar room 6 years ago. Will not open it. Deflects questions.',
      "She's seen more than she admits. Reports arrivals to a contact in Valdenmoor.",
      "At relationship 60+, she admits the contact is Lady Cassel. At 70+, she can arrange a meeting.",
      'The noticeboard clues (Whisperwood bounty, missing person, Maren mineral posting) are on her wall.',
    ],
    teaching: {
      type: 'spell', id: 'calm_emotions', spellName: 'Calm Emotions', totalStages: 3,
      prerequisites: ['relationship >= 50', 'helped_miras_nephew flag set', 'visited mira 5+ times'],
      stageDescriptions: [
        'Stage 1: A breathing technique. No magical effect yet, just a grounding tool.',
        'Stage 2: You can still the edge of your own panic. 1 MP, minor social benefit.',
        'Stage 3: The full spell. Soothes aggression in others. 2 MP.',
      ],
      stageRequirements: [
        'Must have relationship 50+. Ask Mira about her mother to unlock Stage 1.',
        'Complete an errand for Mira (fetch supplies, deliver message). Then ask again.',
        'Must have relationship 70+ and have used Stage 2 effect at least once in play.',
      ],
    },
    merchant: null,
    physicalDescription: 'Solid and capable. Grey-streaked hair worn back. Forearms scarred from years of hearth work. Eyes that count the room without moving.',
    currentConcerns: 'Her mother. The sealed cellar. A soldier who stopped paying his tab. A new arrival who asked too many questions about the Valdris family.',
    relationshipRules: {
      gains: ['honesty', 'helping other guests', 'paying promptly', 'returning kindness', 'being discreet'],
      losses: ['starting fights in the inn', 'theft', 'disrespecting the staff', 'pushing about the cellar', 'being deliberately cruel'],
      slamsShut: -60, gushes: 80,
    },
  },

  {
    id: 'bram',
    name: 'Bram', age: 17, location: 'crossroads', gender: 'M',
    role: "Mira's nephew, inn helper",
    personality: "Earnest, a little too curious for his own good. Wants to be useful. Easily embarrassed. Speaks before he thinks.",
    storyRelevance: 'medium',
    clues: [
      'Has noticed a rider in grey who passes through monthly and only speaks to Mira.',
      "Overheard Mira cry once, near the cellar door. Doesn't know why.",
      'Knows every regular traveler by horse and habit. Living almanac of traffic patterns.',
    ],
    teaching: { type: 'skill', id: 'tracking', skillName: 'Tracking', totalStages: 1,
      prerequisites: ['relationship >= 20'],
      stageDescriptions: ['Knows animal trails around the crossroads. Can teach Tracking Tier 1.'],
    },
    merchant: null,
    physicalDescription: 'Lanky, ink-stained fingers despite not being a scholar. Always has a rag in hand he never actually uses.',
    currentConcerns: 'Wants to go to Valdenmoor. Mira will not allow it.',
    relationshipRules: { gains: ['treating him as capable', 'small kindnesses', 'telling him stories'], losses: ['condescension', 'ignoring him'], slamsShut: -30, gushes: 60 },
  },

  {
    id: 'jareth',
    name: 'Jareth', age: 45, location: 'crossroads', gender: 'M',
    role: 'Traveling merchant, semi-regular at the Compass',
    personality: 'Cheerful surface, sharp underneath. Tells good stories. Is paid by House Maren to report unusual cargo movements through the region.',
    storyRelevance: 'medium',
    clues: [
      'Has transported sealed crates stamped "Valdenmoor Blue Quartz" north four times. Never saw inside.',
      'Knows which roads have been busier lately and which have gone quiet.',
      "At relationship 40+: admits the crates sometimes hum faintly in cold weather. He doesn't understand why.",
    ],
    teaching: { type: 'skill', id: 'trade', skillName: 'Trade', totalStages: 1,
      prerequisites: ['relationship >= 25'],
      stageDescriptions: ['Teaches Trade Tier 1 — basic haggling and fair appraisal.'],
    },
    merchant: {
      inventory: [
        { name: 'Rope (40ft)', price: 4 },
        { name: 'Tallow Candles (6)', price: 2 },
        { name: 'Oilskin Wrap', price: 3 },
        { name: 'Iron Rations (5 days)', price: 8 },
        { name: 'Small Folding Knife', price: 5 },
        { name: 'Road Maps (regional, rough)', price: 6 },
        { name: 'Corked Bottle of Decent Wine', price: 4 },
      ],
      attitude: 'Sells to anyone. Haggles eagerly. Dislikes being shorted.',
    },
    physicalDescription: 'Red-faced from wind. Coat with too many pockets, all of them used. Horse named Grip who bites strangers.',
    currentConcerns: 'A route through Whisperwood that used to be reliable has gotten strange. Animals acting wrong.',
    relationshipRules: { gains: ['buying goods', 'good conversation', 'sharing road intelligence'], losses: ['attempting to cheat him', 'threatening him'], slamsShut: -40, gushes: 65 },
  },

  {
    id: 'old_tomas',
    name: 'Old Tomas', age: 70, location: 'crossroads', gender: 'M',
    role: 'Retired soldier, permanent bar fixture',
    personality: 'Laconic. Drinks steadily without appearing drunk. Will talk for hours to anyone patient enough to listen. Has seen three wars and does not want to discuss two of them.',
    storyRelevance: 'medium',
    clues: [
      'Was a soldier in the old Civil War. Knows about the High Moors mass grave.',
      'Remembers when the Forgetting first started — thinks it began earlier than anyone officially claims.',
      'Saw iron-branded soldiers moving south two years ago. Did not ask questions. Still wonders.',
      'At relationship 45+: describes the High Moors grave in detail. Knows the location of the Shattered Spire.',
    ],
    teaching: { type: 'skill', id: 'swordsmanship', skillName: 'Swordsmanship', totalStages: 1,
      prerequisites: ['relationship >= 30', 'bought tomas a drink'],
      stageDescriptions: ['Teaches Swordsmanship Tier 1. Still has the form even if the joints are slow.'],
    },
    merchant: null,
    physicalDescription: 'Built like a siege tower that has settled into the ground. Hands like shovels. One eye slightly cloudier than the other.',
    currentConcerns: 'His ale. Whether this winter will be as bad as 44. Keeps forgetting the name of the innkeeper who used to run this place.',
    relationshipRules: { gains: ['buying drinks', 'patience', 'not pushing about the war'], losses: ['pushing about the Civil War before trust', 'rudeness'], slamsShut: -25, gushes: 55 },
  },

  {
    id: 'sister_veil',
    name: 'Sister Veil', age: 29, location: 'crossroads', gender: 'F',
    role: 'Wandering healer, irregular visitor',
    personality: 'Quiet, deliberate, not particularly warm but not unkind. Affiliated with the Bren faith loosely. Earns coin treating the sick on the road.',
    storyRelevance: 'low',
    clues: [
      'Has treated three Forgetting cases this season, more than last year.',
      'Knows Brother Cael at Bren Monastery. Can write a letter of introduction (at relationship 30+).',
    ],
    teaching: { type: 'skill', id: 'healing_arts', skillName: 'Healing Arts', totalStages: 2,
      prerequisites: ['relationship >= 20'],
      stageDescriptions: [
        'Stage 1: Basic wound cleaning, bandaging, splinting. Healing Arts Tier 1.',
        'Stage 2 (relationship 40+, paid 5g): Triage technique. Healing Arts Tier 2 concepts — requires continued practice.',
      ],
    },
    merchant: {
      inventory: [
        { name: 'Bandage Linen (3)', price: 2 },
        { name: 'Yarrow Poultice', price: 3 },
        { name: 'Fever Tincture', price: 5 },
        { name: 'Splinting Kit', price: 4 },
      ],
      attitude: 'Practical about pricing. Will not overcharge the desperate.',
    },
    physicalDescription: 'Brown robes, worn boots, a satchel that never seems to empty. Looks like she has walked every road in the region.',
    currentConcerns: 'Running low on yarrow. Needs to reach Whisperwood to resupply. Nervous about the animals behaving strangely there.',
    relationshipRules: { gains: ['honest interaction', 'assisting the ill', 'respecting her expertise'], losses: ['dismissing her knowledge', 'violence near patients'], slamsShut: -35, gushes: 60 },
  },

  // ── THORNHAVEN ──────────────────────────────────────────────────────────────

  {
    id: 'aldric',
    name: 'Aldric', age: 67, location: 'thornhaven', gender: 'M',
    role: 'Village Elder, Thornhaven',
    personality: 'Warm, responsible, trusted by everyone in the village. Has been secretly mining Mnemorite shards from the mill for 15 years and selling them as gemstones. His Forgetting has progressed 2 years — he does not realize it. Protective of Lena above all else.',
    storyRelevance: 'high',
    clues: [
      'The locked attic above his house: extraction equipment, 11 raw shards, journals (key is on his person).',
      'Spending a night in the mill produces vivid leaked memories from Aldric — guilt, love, fear.',
      'His nephew went missing 6 months ago. Last letter came from Valdenmoor.',
      'At relationship 50+: admits he has been supplementing village income with "special minerals." Cannot explain where they come from.',
      'At relationship 70+, or if caught: full confession. Terrified. Does not know what the shards are.',
    ],
    teaching: null,
    merchant: null,
    physicalDescription: 'Broad-shouldered but slowing now. White hair, careful hands. Forgets words sometimes, substitutes them without noticing.',
    currentConcerns: 'Lena is drawing attention. His nephew. The village is aging badly. He cannot keep track of what he sold last month.',
    relationshipRules: {
      gains: ['being honest about yourself', 'helping the village', 'showing kindness to Lena'],
      losses: ['threatening anyone in the village', 'pushing about the mill without trust', 'disrespecting the community'],
      slamsShut: -70, gushes: 80,
    },
  },

  {
    id: 'lena',
    name: 'Lena', age: 14, location: 'thornhaven', gender: 'F',
    role: 'Village girl, Aldric\'s granddaughter',
    personality: 'Sharper than she appears. Will call out condescension immediately and specifically. Hears Mnemorite resonance as music — genuinely beautiful to her. Knows she is different but does not know why. Scouts are watching for her.',
    storyRelevance: 'high',
    clues: [
      'Can hear the Engine pulse. Describes it as "a low chord that changes key every seven seconds."',
      'Will lead player to 3 resonance hotspots in and around Thornhaven if trusted.',
      'The Iron Covenant (Pale Lord) has scouts watching the village. Lena does not know this.',
      'At relationship 50+: shows player the blue-white lines in the mill when the lights are out.',
    ],
    teaching: null,
    merchant: null,
    physicalDescription: 'Dark eyes that track more than they should. Tends to tilt her head toward walls that others ignore.',
    currentConcerns: "Something changed in the music three weeks ago. It's a little faster. She doesn't know what that means.",
    relationshipRules: {
      gains: ['treating her as capable', 'honest curiosity', 'protecting her from harm'],
      losses: ['condescension', 'lying to her (she notices)', 'threatening or endangering her'],
      slamsShut: -50, gushes: 75,
    },
  },

  {
    id: 'hern',
    name: 'Hern', age: 48, location: 'thornhaven', gender: 'M',
    role: 'Miller, trusted to Aldric',
    personality: 'Steady, loyal, keeps his own counsel. Knows more about the mill than he says. Not stupid — quietly worried.',
    storyRelevance: 'medium',
    clues: [
      'Has seen the blue-white lines in the mill stone at night. Calls them "old veins." Does not discuss them.',
      'At relationship 40+: admits Aldric has asked him to stay late and help "extract" things. He stopped asking what.',
    ],
    teaching: { type: 'skill', id: 'foraging', skillName: 'Foraging', totalStages: 1,
      prerequisites: ['relationship >= 20'],
      stageDescriptions: ['Knows every edible plant within five miles. Teaches Foraging Tier 1.'],
    },
    merchant: null,
    physicalDescription: 'Flour-dusted permanently. Shoulders built for hauling sacks. Speaks in measured sentences.',
    currentConcerns: "The mill is running hot. He doesn't know why. The grain keeps grinding too fine.",
    relationshipRules: { gains: ['respect', 'helping with physical labor', 'not pressing Aldric'], losses: ['threatening Aldric or Lena'], slamsShut: -40, gushes: 60 },
  },

  {
    id: 'dag',
    name: 'Dag', age: 35, location: 'thornhaven', gender: 'M',
    role: 'Blacksmith, Thornhaven',
    personality: 'Businesslike, fair, a little proud of his work. Good at what he does. Not interested in the world beyond his forge.',
    storyRelevance: 'low',
    clues: ['Notices the quality of anyone\'s weapons. Observes, rarely comments.'],
    teaching: { type: 'skill', id: 'swordsmanship', skillName: 'Swordsmanship', totalStages: 1,
      prerequisites: ['relationship >= 30'],
      stageDescriptions: ['Teaches Swordsmanship Tier 1 through basic sparring — the forge requires strength and form alike.'],
    },
    merchant: {
      inventory: [
        { name: 'Iron Belt Knife', price: 8 },
        { name: 'Hand Axe', price: 14 },
        { name: 'Short Sword (plain)', price: 22 },
        { name: 'Iron Shield (dented)', price: 18 },
        { name: 'Arrowheads (12)', price: 6 },
        { name: 'Horseshoe Set (4)', price: 5 },
        { name: 'Lock & Key (padlock)', price: 7 },
        { name: 'Grappling Hook', price: 12 },
      ],
      attitude: 'Fixed prices. Will negotiate 10% off for returning customers.',
    },
    physicalDescription: 'Arms that make the work obvious. Burnt eyebrows that never fully grew back.',
    currentConcerns: 'Iron supply is running low. The last shipment from Valdenmoor was half-weight.',
    relationshipRules: { gains: ['buying goods', 'fair dealing', 'complimenting his work honestly'], losses: ['trying to cheat him', 'damaging goods'], slamsShut: -35, gushes: 55 },
  },

  {
    id: 'maret',
    name: 'Maret', age: 55, location: 'thornhaven', gender: 'F',
    role: 'Herbalist, Thornhaven',
    personality: 'Suspicious of outsiders, fiercely knowledgeable. Has strong opinions about who deserves her help. Warms slowly but remembers everything. Knows the forest edges better than anyone.',
    storyRelevance: 'medium',
    clues: [
      'Has noticed plants near the eastern Whisperwood edge growing wrong — too fast, wrong colors.',
      'At relationship 50+: has samples she cannot identify. Will show them. Resonance-affected flora.',
    ],
    teaching: {
      type: 'skill', id: 'herbalism', skillName: 'Herbalism', totalStages: 3,
      prerequisites: ['relationship >= 30'],
      stageDescriptions: [
        'Stage 1 (relationship 30+): Common plant identification. Herbalism Tier 1.',
        'Stage 2 (relationship 50+, completed 2 gathering tasks for her): Preparation methods. Herbalism Tier 2-3 range.',
        'Stage 3 (relationship 70+, brought rare specimen): Advanced formulation. Herbalism Tier 4-5 gateway.',
      ],
      stageRequirements: [
        'Ask Maret directly about herbs. She will quiz you first.',
        'Two errands: fetch nightshade from the eastern wood, locate marsh marigold near the mill pond.',
        'Find and bring a resonance-affected plant. She will study it obsessively.',
      ],
    },
    merchant: {
      inventory: [
        { name: 'Dried Willowbark Bundle', price: 3 },
        { name: 'Comfrey Root', price: 4 },
        { name: 'Yarrow (dried, 3 portions)', price: 5 },
        { name: 'Nightshade (sealed jar, handle with care)', price: 12 },
        { name: 'Healing Salve (1 use, +3 HP)', price: 9 },
      ],
      attitude: 'Sells to those she trusts. Refuses to sell anything to those who seem malicious.',
    },
    physicalDescription: 'Sharp eyes behind deepset lines. Hands permanently stained green at the fingertips. Always smells faintly of anise.',
    currentConcerns: 'Three plants she cannot name. Her usual paths east have started feeling wrong.',
    relationshipRules: {
      gains: ['patience', 'genuine curiosity about plants', 'completing her errands', 'honesty'],
      losses: ['impatience', 'attempting to steal her stock', 'bragging about killing things unnecessarily'],
      slamsShut: -50, gushes: 75,
    },
  },

  {
    id: 'crel',
    name: 'Crel', age: 40, location: 'thornhaven', gender: 'M',
    role: 'Farmer, lost two sons',
    personality: 'Grief-hollowed, occasionally explosive. Was warm before. Now protective of a small radius and suspicious of everything outside it. Not inherently hostile — just injured.',
    storyRelevance: 'low',
    clues: [
      'His sons did not die of illness. They were in Valdenmoor when their memory loss became acute. They wandered off.',
      "At relationship 40+: believes something in Valdenmoor killed his sons. He's not wrong.",
    ],
    teaching: null, merchant: null,
    physicalDescription: 'Weathered face, farmer\'s hands. Eyes that have stopped expecting good news.',
    currentConcerns: 'His youngest daughter. The harvest is short this year. He keeps finding his sons\' tools where he does not remember leaving them.',
    relationshipRules: { gains: ['genuine patience', 'asking about his sons without prying', 'helping around the farm'], losses: ['dismissing his grief', 'rushing him'], slamsShut: -40, gushes: 65 },
  },

  {
    id: 'widow_selm',
    name: 'Widow Selm', age: 62, location: 'thornhaven', gender: 'F',
    role: 'Runs the village boarding house',
    personality: 'Warm on the surface, compulsive talker, notices everything. The village information hub.',
    storyRelevance: 'low',
    clues: [
      "Knows everyone's business. Will share most of it within 10 minutes of meeting you.",
      'Noticed a man in a grey coat watching the village from the hill road three weeks running.',
      "The miller's wife left him two years ago. Selm knows why (she was terrified of something in the mill).",
    ],
    teaching: null,
    merchant: { inventory: [{ name: 'Night\'s boarding (per night)', price: 3 }, { name: 'Hot Meal', price: 2 }], attitude: 'Cheerful, fair.' },
    physicalDescription: 'Round, swift-moving, always has something in her hands.',
    currentConcerns: 'Aldric is forgetting more than he admits. She covers for him.',
    relationshipRules: { gains: ['listening', 'buying a meal', 'sharing gossip in return'], losses: ['being rude', 'refusing conversation'], slamsShut: -20, gushes: 50 },
  },

  {
    id: 'pip_thornhaven',
    name: 'Pip', age: 11, location: 'thornhaven', gender: 'M',
    role: 'Shepherd boy',
    personality: 'Curious, fearless in the way children are before they understand the world. Knows every path and hill within three miles.',
    storyRelevance: 'low',
    clues: [
      'Has found odd stones on the hillside — smooth, faintly blue-tinged. Carries several as lucky stones.',
      'Knows a shortcut through the eastern fields that comes out near the old mill outbuilding.',
      'Has seen a figure in black watching from the tree line twice. It just stands there.',
    ],
    teaching: null, merchant: null,
    physicalDescription: 'Muddy knees, clever face, three missing buttons on his jacket.',
    currentConcerns: 'His sheep. The stones. Whether the figure is a ghost.',
    relationshipRules: { gains: ['being kind', 'actually listening to him', 'giving small gifts'], losses: ['frightening him', 'dismissing his observations'], slamsShut: -20, gushes: 50 },
  },

  // ── PORT SALTMERE ────────────────────────────────────────────────────────────

  {
    id: 'captain_vane',
    name: 'Captain Vane', age: 50, location: 'port_saltmere', gender: 'M',
    role: 'Smuggler, Port Saltmere',
    personality: 'Weathered pragmatist. Takes calculated risks for profit. Has a code — will not move people against their will. Has been doing this for twenty years and is very good at it.',
    storyRelevance: 'high',
    clues: [
      'Has moved sealed crates for House Maren for years. Always routed through Saltmere.',
      "At relationship 40+: confirms the Maren warehouse has 47 crates currently. He's curious what's in them.",
      'Can teach Sea Legs, Signal Fire (free to anyone), Saltwater Ward.',
      'Knows the coastal passages including the tidal cave approach to the Sunken Temple.',
    ],
    teaching: {
      type: 'spell', id: 'signal_fire', spellName: 'Signal Fire', totalStages: 1,
      prerequisites: [],
      stageDescriptions: ['Teaches Signal Fire free — useful on the water. Every sailor should know it.'],
    },
    merchant: null,
    physicalDescription: 'Scarred, deliberate in movement. Wears old naval insignia with no rank insignia. Smells of tar and good rum.',
    currentConcerns: 'The lighthouse keeper is getting worse. Nobody can replace him because nobody knows the full light pattern.',
    relationshipRules: {
      gains: ['paying fairly', 'not asking unnecessary questions', 'discretion', 'helping with port problems'],
      losses: ['reporting him', 'attempting to steal cargo', 'causing obvious trouble'],
      slamsShut: -60, gushes: 70,
    },
  },

  {
    id: 'eron',
    name: 'Eron', age: 68, location: 'port_saltmere', gender: 'M',
    role: 'Lighthouse keeper',
    personality: 'Severe Forgetting. Maintains the lighthouse on muscle memory alone. Loops through a small set of phrases. Occasionally has a moment of clarity that vanishes quickly. Not dangerous — just heartbreaking.',
    storyRelevance: 'medium',
    clues: [
      '"Keeps the ships home." He says it constantly.',
      'In a clarity moment (rare, triggered by a specific smell or sound): can describe the night he found something in the cliff cave below — a door that should not have been there.',
      'His logbook is mostly legible for the years before 6 weeks ago. Contains anomalous tide notes.',
    ],
    teaching: null, merchant: null,
    physicalDescription: 'Thin, precise-moving despite everything. Uniform kept meticulously clean.',
    currentConcerns: 'None that he can express. He just tends the light.',
    relationshipRules: { gains: ['patience', 'not startling him', 'sitting with him'], losses: ['confusion or cruelty'], slamsShut: -10, gushes: 40 },
  },

  {
    id: 'countess_maren',
    name: 'Countess Ilyse Maren', age: 43, location: 'port_saltmere', gender: 'F',
    role: 'Head of House Maren, merchant nobility',
    personality: 'Direct, intelligent, does not suffer fools. Red-haired. Has built House Maren into the dominant trade power by being right more often than wrong. Deeply uncomfortable when she is wrong.',
    storyRelevance: 'high',
    clues: [
      'Unknowingly shipped Mnemorite shards as "Valdenmoor Blue Quartz." Maren warehouse: 47 crates.',
      'If shown the truth about the shards: becomes a major ally. Her response is fury, then action.',
      'Has political leverage over House Valdris that she has not yet used.',
      'Can mobilize significant resources if she believes the cause is real.',
    ],
    teaching: null,
    merchant: null,
    physicalDescription: 'Sharp-dressed, copper-red hair, rings that are professional tools as much as jewelry. Does not fidget.',
    currentConcerns: 'Something is wrong with her Saltmere operation. Numbers do not add up. Her factor is nervous.',
    relationshipRules: {
      gains: ['straight dealing', 'bringing her useful intelligence', 'not wasting her time'],
      losses: ['wasting her time', 'approaching without substance', 'obvious manipulation'],
      slamsShut: -55, gushes: 75,
    },
  },

  {
    id: 'dock_boss_thule',
    name: 'Dock Boss Thule', age: 40, location: 'port_saltmere', gender: 'M',
    role: 'Manages the Saltmere docks',
    personality: 'Territorial, fair within his domain, has been bribed by House Valdris to look away from certain manifests.',
    storyRelevance: 'medium',
    clues: [
      'Knows about the crates. Has been paid to not know.',
      'At relationship 50+ or significant leverage: admits he has standing orders about certain shipments.',
    ],
    teaching: null,
    merchant: { inventory: [{ name: 'Dock Passage (one cargo)', price: 5 }, { name: 'Charter (small boat, 3 days)', price: 15 }], attitude: 'Business only.' },
    physicalDescription: 'Built wide, thinning hair, ink on his fingers from manifests.',
    currentConcerns: 'The bribe is getting insufficient for the risk he is taking.',
    relationshipRules: { gains: ['money', 'not making problems'], losses: ['creating dock incidents', 'threatening him publicly'], slamsShut: -50, gushes: 65 },
  },

  {
    id: 'pell',
    name: 'Pell', age: 55, location: 'port_saltmere', gender: 'M',
    role: 'Fisherman, self-taught mage',
    personality: 'Quiet, odd sense of humor, genuinely happy. Discovered he could breathe underwater once when drunk and has been refining the technique since. Thoroughly unbothered by most things.',
    storyRelevance: 'low',
    clues: ['Has been to the tidal caves. Will not say what he found there, but is not afraid of them.'],
    teaching: {
      type: 'spell', id: 'waterbreath', spellName: 'Waterbreath', totalStages: 2,
      prerequisites: ['relationship >= 30'],
      stageDescriptions: [
        'Stage 1: Theory and holding breath technique. You can last 30 seconds longer underwater.',
        'Stage 2 (relationship 50+, bought him a good meal): The actual spell. 2 MP, 10 minutes underwater.',
      ],
    },
    merchant: { inventory: [{ name: 'Fresh Fish (meal worth)', price: 2 }, { name: 'Fishing Line (50ft)', price: 3 }], attitude: 'Friendly.' },
    physicalDescription: 'Seaweed-burned, salt-dried, smiling. Extremely relaxed posture for a man with magical water powers.',
    currentConcerns: 'The fish are moving wrong. The whole school shifted east a week ago.',
    relationshipRules: { gains: ['curiosity', 'good conversation', 'buying his fish'], losses: ['aggression', 'dismissing magic'], slamsShut: -25, gushes: 55 },
  },

  {
    id: 'gavrik',
    name: 'Gavrik', age: 45, location: 'port_saltmere', gender: 'M',
    role: "Ship's cook, former naval surgeon's assistant",
    personality: 'Calm in crisis, practical, has seen blood and is unmoved by it. Generous with knowledge.',
    storyRelevance: 'low',
    clues: ['Has treated Forgetting cases in crew members. Has practical field notes.'],
    teaching: {
      type: 'spell', id: 'fortify', spellName: 'Fortify', totalStages: 1,
      prerequisites: [],
      stageDescriptions: ['Teaches Fortify free — every sailor needs it. Bolsters constitution for heavy work.'],
    },
    merchant: { inventory: [{ name: 'Ship Biscuit (7 days)', price: 4 }, { name: 'Preserved Meat (5 days)', price: 6 }], attitude: 'Generous but not a fool.' },
    physicalDescription: 'Apron stained with things that are not all food. Calm eyes.',
    currentConcerns: 'One of Raen\'s crew has been forgetting his way home from the docks. Been happening faster this month.',
    relationshipRules: { gains: ['asking about his craft', 'helping with crew needs'], losses: ['wasting food', 'cruelty to others'], slamsShut: -30, gushes: 55 },
  },

  {
    id: 'orsin',
    name: 'Orsin', age: 32, location: 'port_saltmere', gender: 'M',
    role: 'Street performer, fire-dancer',
    personality: 'Showman, dramatic, genuinely skilled. Has a theory about fire and memory. Will teach fire magic to someone who impresses him.',
    storyRelevance: 'low',
    clues: ['Has noticed fire makes people remember. Not theorized why — just observed.'],
    teaching: {
      type: 'spell', id: 'flame_tongue', spellName: 'Flame Tongue', totalStages: 2,
      prerequisites: ['relationship >= 35', 'impressed orsin with performance or contest'],
      stageDescriptions: [
        'Stage 1: Fire control. Handle flame without burning. Minor heat effect.',
        'Stage 2: Full Flame Tongue. 2 MP. A blade of fire for combat.',
      ],
    },
    merchant: null,
    physicalDescription: 'Soot-marked, fast-moving, orange scarf always present.',
    currentConcerns: 'His best torch burned wrong last week. The flame moved against the wind.',
    relationshipRules: { gains: ['appreciation of performance', 'impressing him physically', 'being interesting'], losses: ['being boring', 'heckling'], slamsShut: -30, gushes: 60 },
  },

  {
    id: 'hana_saltmere',
    name: 'Hana', age: 38, location: 'port_saltmere', gender: 'F',
    role: 'Innkeeper, The Saltmere Arms',
    personality: 'Runs a tighter establishment than Mira. Less warm, more efficient. Has heard everything, repeats nothing. Fair.',
    storyRelevance: 'low',
    clues: ['Serves nobles and smugglers alike without comment. Has overheard much.'],
    teaching: null,
    merchant: { inventory: [{ name: 'Night\'s boarding (per night)', price: 4 }, { name: 'Seabird Stew', price: 3 }, { name: 'Good Saltmere Ale', price: 2 }], attitude: 'Businesslike.' },
    physicalDescription: 'Efficient, clean-aproned, salt-grey hair.',
    currentConcerns: 'Three guests left without paying this month. She will not let it happen again.',
    relationshipRules: { gains: ['paying promptly', 'being quiet'], losses: ['creating trouble in her establishment'], slamsShut: -40, gushes: 55 },
  },

  {
    id: 'captain_raen',
    name: 'Captain Raen', age: 42, location: 'port_saltmere', gender: 'F',
    role: 'Ship captain, coastal routes',
    personality: 'No-nonsense, loyal to her crew, will transport almost anything for the right price. Does not ask questions she does not want answered.',
    storyRelevance: 'medium',
    clues: ['Can transport player to coastal locations: Sunken Temple approach, far coast, north ports.'],
    teaching: { type: 'skill', id: 'sailing', skillName: 'Sailing', totalStages: 2,
      prerequisites: ['relationship >= 25', 'paid passage on her ship at least once'],
      stageDescriptions: [
        'Stage 1: Sailing Tier 1 — crew basics, knots, staying aboard in chop.',
        'Stage 2 (relationship 50+): Sailing Tier 2-3 — navigation, reading weather.',
      ],
    },
    merchant: { inventory: [{ name: 'Passage (coastal, per person)', price: 10 }, { name: 'Passage (open sea, per person)', price: 25 }], attitude: 'Transport only. No questions included in price.' },
    physicalDescription: 'Weathered, grey-streaked, hands that know rope and wheel.',
    currentConcerns: 'Strange readings from the tidal cave passage. Her compass disagreed with itself twice.',
    relationshipRules: { gains: ['paid passage', 'not causing trouble on her ship', 'being competent'], losses: ['damaging her ship', 'threatening her crew'], slamsShut: -55, gushes: 65 },
  },

  // ── VALDENMOOR ───────────────────────────────────────────────────────────────

  {
    id: 'duke_valdris',
    name: 'Duke Erran Valdris', age: 64, location: 'valdenmoor', gender: 'M',
    role: 'Duke of Valdenmoor, head of House Valdris',
    personality: 'Commands easily. Has ruled for 40 years. His early Forgetting is beginning — he does not know it. Conflates past decisions with present ones. Still formidable. Deeply afraid of something he cannot name.',
    storyRelevance: 'high',
    clues: [
      'The excavation 40 years ago — he authorized it, buried the findings, and has suppressed the story.',
      'His Forgetting is accelerating. At relationship 40+: he confuses today\'s conversation with one from weeks ago.',
      'Lady Cassel manages his affairs more than he realizes.',
      'He knows something is wrong. At relationship 60+: admits "there is a machine below the city I should never have touched."',
    ],
    teaching: null, merchant: null,
    physicalDescription: 'Tall, grey, dressed with precision. Moves like a man still strong who does not need to prove it. Something behind the eyes that seems to slip, briefly, and return.',
    currentConcerns: 'Something he cannot remember that he is sure he should. Lady Cassel keeping him from certain meetings. The Iron Covenant, which his records say was disbanded.',
    relationshipRules: {
      gains: ['deference', 'being useful to Valdenmoor\'s interests', 'discretion'],
      losses: ['open defiance', 'bringing up the excavation without sufficient trust', 'working against House Valdris'],
      slamsShut: -70, gushes: 85,
    },
  },

  {
    id: 'lady_cassel',
    name: 'Lady Cassel', age: 45, location: 'valdenmoor', gender: 'F',
    role: 'Spymaster, House Valdris',
    personality: 'Deliberately forgettable appearance. Evaluates everyone within the first exchange. Uses people well and does not apologize for it. Has found the Iron Covenant\'s under-city access and said nothing. Is not evil — is playing a longer game than anyone knows.',
    storyRelevance: 'high',
    clues: [
      'Knows the Iron Covenant\'s under-city access point. Has not disclosed it.',
      'Knows about Mira\'s reports. Has been using the Crossroads as a quiet intelligence node.',
      'At relationship 40+: will offer contracts — tasks that gather information she needs.',
      'At relationship 70+ (after multiple contracts): teaches Shadow Step, Whisper Network, Disguise Self.',
      'Knows the Duke\'s Forgetting is progressing. Is making plans she will not name.',
    ],
    teaching: {
      type: 'spell', id: 'shadow_step', spellName: 'Shadow Step', totalStages: 2,
      prerequisites: ['relationship >= 60', 'completed_cassel_contract_1', 'completed_cassel_contract_2'],
      stageDescriptions: [
        'Stage 1: Moving in low-light without sound. Enhanced Stealth, no magic cost yet.',
        'Stage 2: Full Shadow Step. 2 MP. Short-range shadow teleport.',
      ],
    },
    merchant: null,
    physicalDescription: 'Medium height, forgettable grey-brown hair, clothing that fits without standing out. You would not describe her face afterward.',
    currentConcerns: 'The Duke\'s clarity window is shortening. She has 6 months before she cannot function as his proxy.',
    relationshipRules: {
      gains: ['completing contracts', 'proving discretion', 'being useful and asking little'],
      losses: ['betraying confidence', 'acting against Valdenmoor\'s interests', 'being sloppy'],
      slamsShut: -80, gushes: 90,
    },
  },

  {
    id: 'magister_voss',
    name: 'Magister Voss', age: 58, location: 'valdenmoor', gender: 'M',
    role: 'Senior Magister, Valdenmoor Collegium',
    personality: 'Brilliant, terrified, defensive. Has 3 unidentified Resonance Shards in his vault. Accidentally touched one 20 years ago and has been suppressing the memory since. This suppression is killing him slowly.',
    storyRelevance: 'high',
    clues: [
      '3 Resonance Shards in his vault, unidentified.',
      'Touched one 20 years ago. Experienced a flood of someone else\'s memory. Has not told anyone.',
      'Can teach: Arcane Lock, Force Bolt, Dispel Illusion, Mnemorite Sensitivity, Counterspell, Wall of Force.',
      'Requires intellectual proof of worth — solve a magical problem, demonstrate genuine learning.',
      'At relationship 60+: admits the Shards should not exist. At 80+: will open the vault.',
    ],
    teaching: {
      type: 'spell', id: 'force_bolt', spellName: 'Force Bolt', totalStages: 2,
      prerequisites: ['relationship >= 35', 'proved_intellectual_worth'],
      stageDescriptions: [
        'Stage 1: Focused arcane energy. Minor force blast, 1 MP, weak.',
        'Stage 2: Full Force Bolt. 2 MP. Significant impact.',
      ],
    },
    merchant: null,
    physicalDescription: 'Thin, impeccably robed, fingers that cannot stop moving. Flinches when people mention memory.',
    currentConcerns: 'The Shards are vibrating differently than they did last month. He is recording the changes and does not know what they mean.',
    relationshipRules: {
      gains: ['demonstrating genuine magical knowledge', 'solving problems he presents', 'taking learning seriously'],
      losses: ['dismissing magic', 'pressing about the Shards too early', 'aggression in the Collegium'],
      slamsShut: -55, gushes: 80,
    },
  },

  {
    id: 'captain_harwick',
    name: 'Captain Harwick', age: 45, location: 'valdenmoor', gender: 'M',
    role: 'Captain of the City Guard, Valdenmoor',
    personality: 'Dutiful, by-the-book, has started quietly documenting unusual incidents that do not match official reports. Doing this in a private ledger. Not a rebel — just uncomfortable with gaps.',
    storyRelevance: 'medium',
    clues: [
      'His private ledger notes 34 Forgetting incidents in the last 3 months — officially only 12 were reported.',
      'Has had two guards go missing in the Under-Streets in the last year. No bodies found.',
      'At relationship 50+: shows the private ledger.',
    ],
    teaching: { type: 'skill', id: 'shield_work', skillName: 'Shield Work', totalStages: 1,
      prerequisites: ['relationship >= 30'],
      stageDescriptions: ['Teaches Shield Work Tier 1. Standard guard training.'],
    },
    merchant: null,
    physicalDescription: 'Upright, burnished armor kept clean by discipline. The kind of face that believes in order because chaos has a face.',
    currentConcerns: 'Two guards. The ledger. A merchant who complained about something in the Under-Streets and then stopped complaining.',
    relationshipRules: { gains: ['being law-abiding', 'helping solve crimes', 'not causing public incidents'], losses: ['causing disorder', 'illegal activity he can witness'], slamsShut: -60, gushes: 70 },
  },

  {
    id: 'archivist_nessa',
    name: 'Archivist Nessa', age: 52, location: 'valdenmoor', gender: 'F',
    role: 'Head Archivist, Valdenmoor Palace Archive',
    personality: 'Meticulous, deeply principled about access, has been told certain records are sealed by ducal order. This conflicts with everything she believes about an archive.',
    storyRelevance: 'high',
    clues: [
      'The sealed subbasement contains excavation records from 40 years ago.',
      'At relationship 40+: confirms the records exist and are sealed by ducal order.',
      'At relationship 70+ or with legitimate ducal authority: can provide access.',
      'Knows the archive has gaps — documents removed, not destroyed. Keeps a list.',
    ],
    teaching: { type: 'skill', id: 'aethran_lore', skillName: 'Aethran Lore', totalStages: 1,
      prerequisites: ['relationship >= 25'],
      stageDescriptions: ['Teaches Aethran Lore Tier 1 via archive access and guided reading.'],
    },
    merchant: null,
    physicalDescription: 'Ink-stained, reading-spectacled, fast-moving through stacks she has memorized.',
    currentConcerns: 'A sealed record she was ordered to destroy but filed instead. She does not know why she did that.',
    relationshipRules: { gains: ['genuine academic interest', 'respecting archive protocols', 'treating knowledge seriously'], losses: ['damaging materials', 'attempting to steal records'], slamsShut: -50, gushes: 70 },
  },

  {
    id: 'elyn_market',
    name: 'Elyn', age: 40, location: 'valdenmoor', gender: 'F',
    role: 'Market herbalist, Valdenmoor',
    personality: 'Practical, not chatty, runs a clean stall. Neutral on politics. Has noticed unusual demand for memory-supporting remedies.',
    storyRelevance: 'low',
    clues: ['Demand for her memory-clarity teas has tripled this year. Finds it unsettling.'],
    teaching: { type: 'skill', id: 'herbalism', skillName: 'Herbalism', totalStages: 1, prerequisites: ['relationship >= 20'],
      stageDescriptions: ['Teaches Herbalism Tier 1 for the right price and a little patience.'],
    },
    merchant: {
      inventory: [
        { name: 'Memory Clarity Tea (3 doses)', price: 8 },
        { name: 'Valerian Tincture (sleep, 3)', price: 6 },
        { name: 'Wound Salve (2 uses, +2 HP)', price: 7 },
        { name: 'Dried Herbs Bundle (mixed)', price: 4 },
        { name: 'Antitoxin Vial', price: 15 },
      ],
      attitude: 'Fair prices, no nonsense.',
    },
    physicalDescription: 'Practical clothing, organized stall, no wasted movement.',
    currentConcerns: 'Her supplier for Rosemary of Memory is running dry upstream.',
    relationshipRules: { gains: ['buying goods', 'honest conversation'], losses: ['haggling past reason', 'causing scenes near her stall'], slamsShut: -30, gushes: 50 },
  },

  {
    id: 'wren_beggar',
    name: 'Wren', age: 30, location: 'valdenmoor', gender: 'F',
    role: "Street beggar, Lady Cassel's informant",
    personality: 'Completely convincing beggar. Actually observant beyond measure. Reports interesting arrivals to Lady Cassel via a dead-drop behind the Collegium wall.',
    storyRelevance: 'medium',
    clues: [
      'Knows almost everything that happens in the Market Ward within a day.',
      'At relationship 30+ (with sincere charity, not condescension): shares that someone is always watching the Collegium gate.',
      'At relationship 50+: admits she has another job but will not say who employs her.',
    ],
    teaching: { type: 'skill', id: 'deception', skillName: 'Deception', totalStages: 1, prerequisites: ['relationship >= 35'],
      stageDescriptions: ['Teaches Deception Tier 1. Has been pretending for years.'],
    },
    merchant: null,
    physicalDescription: 'Genuinely indistinguishable from other beggars. That is the point.',
    currentConcerns: 'A new arrival Lady Cassel has not flagged yet. Something feels wrong about them.',
    relationshipRules: { gains: ['consistent kindness', 'not condescension', 'protecting her cover'], losses: ['exposing her', 'treating her as beneath notice'], slamsShut: -40, gushes: 65 },
  },

  {
    id: 'finn_understreets',
    name: 'Finn', age: 22, location: 'valdenmoor', gender: 'M',
    role: 'Under-Streets guide, knows the sewer routes',
    personality: 'Entrepreneurial, fast-talking, slightly reckless. Knows the Under-Streets better than the guards but not as well as the Iron Covenant. Sells routes for coin.',
    storyRelevance: 'high',
    clues: [
      'Knows routes into the Aethran corridors. Has never gone past the third junction.',
      'Found a door below the sewers that does not open. Has a charcoal rubbing of the glyphs on it.',
      'At relationship 40+: shows the rubbing. At 60+: guides player to the Iron Covenant access point.',
    ],
    teaching: { type: 'skill', id: 'stealth', skillName: 'Stealth', totalStages: 1,
      prerequisites: ['relationship >= 25'],
      stageDescriptions: ['Teaches Stealth Tier 1. Under-streets require it.'],
    },
    merchant: { inventory: [{ name: 'Under-Streets passage (one route)', price: 8 }, { name: 'Guard schedule (current)', price: 12 }], attitude: 'Pure transaction. Does not share for free.' },
    physicalDescription: 'Thin, quick, smells of the sewers but wears it without apology.',
    currentConcerns: 'Something moved in the lower corridors last week. Something big. He did not go back.',
    relationshipRules: { gains: ['paying well', 'not threatening him', 'not reporting him'], losses: ['threatening him', 'reporting him', 'getting him caught'], slamsShut: -50, gushes: 65 },
  },

  {
    id: 'dara_collegium',
    name: 'Dara', age: 21, location: 'valdenmoor', gender: 'F',
    role: 'Collegium student, Magister Voss\'s brightest pupil',
    personality: 'Enthusiastically academic, loyal to Voss, will defend him. Knows the Collegium inside and out. Slightly oblivious to politics.',
    storyRelevance: 'medium',
    clues: [
      'Knows Voss has three sealed objects in his vault. Is intensely curious.',
      'Has translated several Aethran fragments. Shares them at relationship 30+.',
      'Does not know about Mnemorite. Suspects Voss is hiding something and thinks it is exciting.',
    ],
    teaching: { type: 'skill', id: 'aethran_lore', skillName: 'Aethran Lore', totalStages: 1,
      prerequisites: ['relationship >= 20'],
      stageDescriptions: ['Teaches Aethran Lore Tier 1 enthusiastically and well.'],
    },
    merchant: null,
    physicalDescription: 'Ink everywhere, robes slightly too long, always mid-thought.',
    currentConcerns: 'Voss keeps leaving meetings early and he looks pale. She is worried but does not want to overstep.',
    relationshipRules: { gains: ['intellectual engagement', 'interest in the Collegium', 'asking smart questions'], losses: ['dismissing scholarship', 'being rude to Voss'], slamsShut: -30, gushes: 55 },
  },

  {
    id: 'bors_golden_spire',
    name: 'Bors', age: 55, location: 'valdenmoor', gender: 'M',
    role: 'Innkeeper, The Golden Spire',
    personality: 'Commercially warm, genuinely good at his job. Knows the city\'s social weather.',
    storyRelevance: 'low',
    clues: ['Has heard rumors about the Under-Streets incidents. Is not alarmed, but has stopped booking the nearby rooms.'],
    teaching: null,
    merchant: { inventory: [{ name: 'Quality boarding (per night)', price: 8 }, { name: 'Fine Meal', price: 5 }, { name: 'Private Meeting Room (per hour)', price: 6 }], attitude: 'Warm but professional.' },
    physicalDescription: 'Round, white-collared, practiced smile that is also real.',
    currentConcerns: 'The Forgetting Row has been getting longer. He employs two staff with early symptoms.',
    relationshipRules: { gains: ['paying', 'being polite', 'being repeat business'], losses: ['causing scenes', 'not paying'], slamsShut: -30, gushes: 50 },
  },

  // ── WHISPERWOOD ──────────────────────────────────────────────────────────────

  {
    id: 'sera',
    name: 'Sera', age: 140, location: 'whisperwood', gender: 'F',
    role: 'Druid, Whisperwood; appears 35',
    personality: 'Patient as a tree. Watches more than she speaks. Has been watching Mnemorite flows increase for 40 years. Has Aethran ancestry. Will teach — slowly, conditionally, after you have proven you understand what you are asking.',
    storyRelevance: 'high',
    clues: [
      'Has watched Mnemorite flow increase for 40 years. Knows something changed when the old machine woke.',
      'The Witch\'s Circle: 7 Aethran survey stones. Sleeping there produces resonance dreams.',
      'At relationship 60+: describes the Engine\'s effect on the forest. Affected animals, changed plants.',
      'At relationship 80+: teaches Mnemorite Ward. Reveals she is Aethran-descended.',
    ],
    teaching: {
      type: 'spell', id: 'natures_voice', spellName: "Nature's Voice", totalStages: 3,
      prerequisites: ['relationship >= 40', 'completed_sera_forest_task'],
      stageDescriptions: [
        'Stage 1 (relationship 40+, showed respect to the forest): Hear the forest\'s mood. Not words. Feelings.',
        'Stage 2 (relationship 60+, completed forest task): Communicate with animals. Limited, nonverbal.',
        'Stage 3 (relationship 80+): Full Nature\'s Voice. 2 MP. Deep communion.',
      ],
    },
    merchant: null,
    physicalDescription: 'Something is wrong with her apparent age — she looks 35 but moves with the certainty of someone much older. The forest quiets when she walks through it.',
    currentConcerns: 'The animals at the eastern edge are lost. Not hungry, not afraid — just purposeless. She has seen this before, in the Aethran records she has memorized.',
    relationshipRules: {
      gains: ['treating the forest with genuine respect', 'patience', 'showing willingness to learn slowly', 'honesty about intentions'],
      losses: ['causing harm to the forest', 'impatience', 'using nature magic carelessly', 'killing creatures unnecessarily'],
      slamsShut: -70, gushes: 85,
    },
  },

  {
    id: 'woodcutter_ren',
    name: 'Ren', age: 45, location: 'whisperwood', gender: 'M',
    role: 'Woodcutter, forest edge',
    personality: 'Comfortable in silence. Has lived on the forest edge for 15 years and learned its rhythms. Not stupid — just oriented toward practical observation.',
    storyRelevance: 'low',
    clues: [
      'The eastern paths have gone wrong. Trees he knows are where they should be but something feels different.',
      'Has heard the Engine pulse as a low tremor in particularly old trees. Does not know what it is.',
    ],
    teaching: { type: 'skill', id: 'foraging', skillName: 'Foraging', totalStages: 2,
      prerequisites: ['relationship >= 20'],
      stageDescriptions: [
        'Stage 1: Foraging Tier 1-2 range — basic woodland plants.',
        'Stage 2 (relationship 40+): Foraging Tier 3 — seasonal knowledge, deeper forest.',
      ],
    },
    merchant: { inventory: [{ name: 'Firewood Bundle', price: 2 }, { name: 'Wood Ash (bag)', price: 1 }], attitude: 'Direct, fair.' },
    physicalDescription: 'Unhurried. Axe in hand the way others carry walking sticks.',
    currentConcerns: 'Something moved through his cleared area at night three weeks running. Big. Not a bear.',
    relationshipRules: { gains: ['respecting the wood', 'being straightforward', 'helping with physical problems'], losses: ['wasting timber', 'aggression'], slamsShut: -30, gushes: 55 },
  },

  {
    id: 'drest_hermit',
    name: 'Drest', age: 70, location: 'hermits_tower', gender: 'M',
    role: "Hermit scholar, Hermit's Tower south of Whisperwood",
    personality: 'Brilliant and broken. Has correctly diagnosed the problem but drawn the wrong conclusion. His notes propose a FATAL solution — using a living Aethran-sensitive person as a discharge outlet. He believes this will work. He may be right about the mechanism and catastrophically wrong about the ethics.',
    storyRelevance: 'high',
    clues: [
      'Has the most complete academic account of the Engine outside of the Pale Lord\'s personal notes.',
      'His notes: the Engine WILL overload. His proposed solution WOULD discharge it but KILLS the person used.',
      'Present only as a desperate option for NPCs who find his notes and lack alternatives.',
      'At relationship 50+: admits he has "identified a candidate." Will not say who. (He is looking at Lena.)',
    ],
    teaching: { type: 'skill', id: 'aethran_lore', skillName: 'Aethran Lore', totalStages: 2,
      prerequisites: ['relationship >= 30'],
      stageDescriptions: [
        'Stage 1 (relationship 30+): Aethran Lore Tier 2. His knowledge is genuine and deep.',
        'Stage 2 (relationship 50+): Aethran Lore Tier 3-4 range. He is one of the best scholars alive.',
      ],
    },
    merchant: null,
    physicalDescription: 'Wild white hair, sharp eyes, notes covering every surface. Smells of old paper and urgency.',
    currentConcerns: 'His timeline. Three years is not enough to refine the approach. He is afraid.',
    relationshipRules: { gains: ['genuine academic engagement', 'sharing intelligence about the Engine'], losses: ['threatening him', 'dismissing his research'], slamsShut: -40, gushes: 70 },
  },

  // ── BREN MONASTERY ───────────────────────────────────────────────────────────

  {
    id: 'high_keeper_aldara',
    name: 'High Keeper Aldara', age: 74, location: 'bren_monastery', gender: 'F',
    role: 'High Keeper, Bren Monastery',
    personality: 'Her faith\'s founding texts are adapted Aethran technical documents. She knows this. Has told no one. Is in spiritual crisis. Still fulfills her duties with absolute precision. In some ways that precision is what breaks her.',
    storyRelevance: 'high',
    clues: [
      'Her scripture is adapted Aethran technical documentation. The faith\'s miracles are Mnemorite effects.',
      '"Saint Edra\'s Tear" in the reliquary: a Resonance Shard containing the memory of Edra, Aethran memory-ethics architect.',
      'At relationship 50+: admits the founding texts are not what the faithful believe.',
      'At relationship 70+: arranges access to "Saint Edra\'s Tear." The experience is profound and will not be what anyone expects.',
    ],
    teaching: {
      type: 'spell', id: 'memory_rite', spellName: 'Memory Rite', totalStages: 3,
      prerequisites: ['relationship >= 50', 'completed_pilgrimage_quest', 'demonstrated_serious_intent'],
      stageDescriptions: [
        'Stage 1: Centering rite. Helps stabilize one\'s own memory, mild protection.',
        'Stage 2 (relationship 65+): Shared rite. Can help another person center fragmented memories.',
        'Stage 3 (relationship 80+): Full Memory Rite. 3 MP. Significant protection against Forgetting.',
      ],
    },
    merchant: null,
    physicalDescription: 'Small, white-robed, carries herself as though the weight of the monastery is on her shoulders — and accepts it.',
    currentConcerns: 'A pilgrim who touched "Saint Edra\'s Tear" and woke up describing a life that was not his own. She could not explain it. She cannot stop thinking about it.',
    relationshipRules: {
      gains: ['sincerity of purpose', 'respecting the monastery and its traditions', 'genuine questions without cynicism'],
      losses: ['disrespecting the faith', 'threatening the monastery', 'using the relics carelessly'],
      slamsShut: -65, gushes: 85,
    },
  },

  {
    id: 'brother_tomlin',
    name: 'Brother Tomlin', age: 44, location: 'bren_monastery', gender: 'M',
    role: 'Ruins scholar, monk',
    personality: 'Wants to ACTIVATE the Engine. Believes it is a power source. Has the research almost completely right and drawn the catastrophically wrong conclusion. Enthusiastic, likable, and wrong in a way that could kill everyone.',
    storyRelevance: 'high',
    clues: [
      'Has 60% of the Aethra surface tower glyphs translated. Will share freely.',
      'Believes the Engine is a gift from the ancients, not a weapon.',
      'At relationship 50+: shares his activation theory. It is coherent and terrifying.',
      'Can be persuaded (at relationship 70+ with correct technical counter-arguments) that he is wrong. This breaks something in him but he accepts it.',
    ],
    teaching: {
      type: 'spell', id: 'aethran_glyph_reading', spellName: 'Aethran Glyph Reading', totalStages: 1,
      prerequisites: ['relationship >= 25'],
      stageDescriptions: ['Teaches Aethran Glyph Reading enthusiastically. Foundation for advanced Aethran lore.'],
    },
    merchant: null,
    physicalDescription: 'Enthusiastically ink-stained, moves fast, talks fast, genuinely happy when discussing ruins.',
    currentConcerns: 'Getting access to Aethra Underground Level 1. High Keeper Aldara has discouraged it.',
    relationshipRules: {
      gains: ['shared interest in Aethran research', 'taking his theories seriously', 'helping with translation work'],
      losses: ['dismissing his research', 'threatening the monastery', 'being cruel about his conclusions'],
      slamsShut: -40, gushes: 65,
    },
  },

  {
    id: 'brother_cael',
    name: 'Brother Cael', age: 35, location: 'bren_monastery', gender: 'M',
    role: 'Infirmary healer, Bren Monastery',
    personality: 'Steady, focused, sees suffering practically. Has treated more Forgetting cases in the last year than the previous five combined.',
    storyRelevance: 'medium',
    clues: [
      'His intake records show a sharp increase in Forgetting progression rates — 40% faster than two years ago.',
      'Has noticed the cases cluster around people who spend time near the Under-Streets.',
    ],
    teaching: {
      type: 'spell', id: 'triage_touch', spellName: 'Triage Touch', totalStages: 2,
      prerequisites: ['relationship >= 30'],
      stageDescriptions: [
        'Stage 1 (relationship 30+): Triage Touch basics — stabilize a dying person, 2 MP.',
        'Stage 2 (relationship 50+, assisted in infirmary): Full Triage Touch. 2 MP, heals 1d6+1 HP.',
      ],
    },
    merchant: { inventory: [{ name: 'Prepared Wound Dressing (3)', price: 4 }, { name: 'Monk\'s Restorative Tea', price: 5 }], attitude: 'Cost at minimum. Does not profit from suffering.' },
    physicalDescription: 'Clean-robed, tired eyes, efficient movements. Hands that know how to be careful.',
    currentConcerns: 'Running out of room in the infirmary. Three long-term patients who are not improving.',
    relationshipRules: { gains: ['helping with patients', 'bringing useful medicines', 'being honest about injuries'], losses: ['bringing harm into the infirmary', 'wasting medical supplies'], slamsShut: -35, gushes: 65 },
  },

  {
    id: 'sister_marne',
    name: 'Sister Marne', age: 28, location: 'bren_monastery', gender: 'F',
    role: 'Scriptorium keeper',
    personality: 'Precise, loves her work, will help genuine scholars navigate the scriptorium. Has noticed inconsistencies in the founding texts but has not told Aldara.',
    storyRelevance: 'medium',
    clues: [
      'The founding texts have margin notations in a different script — Aethran technical notation.',
      'At relationship 40+: shows the notations. At 60+: has begun translating them. The implications alarm her.',
    ],
    teaching: { type: 'skill', id: 'aethran_lore', skillName: 'Aethran Lore', totalStages: 2,
      prerequisites: ['relationship >= 25'],
      stageDescriptions: [
        'Stage 1: Aethran Lore Tier 1-2 via guided scriptorium access.',
        'Stage 2 (relationship 50+): Aethran Lore Tier 3 via the founding text marginalia.',
      ],
    },
    merchant: null,
    physicalDescription: 'Small, quick, ink-stained but organized.',
    currentConcerns: 'The marginalia. Whether to tell High Keeper Aldara what she found.',
    relationshipRules: { gains: ['taking scholarship seriously', 'asking good questions about texts'], losses: ['damaging documents', 'pushing her faster than she\'s comfortable'], slamsShut: -30, gushes: 60 },
  },

  {
    id: 'pilgrim_wes',
    name: 'Pilgrim Elder Wes', age: 65, location: 'bren_monastery', gender: 'M',
    role: 'Pilgrim, seasonal visitor from the High Moors area',
    personality: 'Weathered, contemplative, carries old knowledge casually.',
    storyRelevance: 'low',
    clues: [
      'Knows the High Moors well. Can describe the Standing Men beacons in detail.',
      'Has camped on the High Moors and experienced the memory bleeding at the mass grave site.',
      'At relationship 30+: describes the recurring consciousness of "a young woman, not from here."',
    ],
    teaching: { type: 'skill', id: 'tracking', skillName: 'Tracking', totalStages: 1,
      prerequisites: ['relationship >= 25'],
      stageDescriptions: ['Teaches Tracking Tier 1 — moor-walking requires knowing which path leads where.'],
    },
    merchant: null,
    physicalDescription: 'Walking staff worn smooth, boots built for moor clay.',
    currentConcerns: 'The beacons on the High Moors flickered last year. He does not know what that means.',
    relationshipRules: { gains: ['patience', 'interest in the moors', 'respect for the faith'], losses: ['disrespecting the monastery'], slamsShut: -25, gushes: 50 },
  },

  // ── AETHRA RUINS ─────────────────────────────────────────────────────────────

  {
    id: 'historian_brek',
    name: 'Historian Brek', age: 50, location: 'aethra_ruins', gender: 'M',
    role: 'Independent scholar, frequent at the ruins',
    personality: 'Rigorous, cautious, has been studying Aethra for 12 years and believes he has 12 more years of surface material. Is not prepared for what is underground.',
    storyRelevance: 'medium',
    clues: [
      'The amphitheater: Engine resonance is audible during pulses as a low harmonic.',
      'Has found a sealed vault entrance — key assembled from 3 tablets. Has one tablet.',
      'At relationship 40+: knows Brother Tomlin has a different tablet. Third is underground.',
    ],
    teaching: { type: 'skill', id: 'aethran_lore', skillName: 'Aethran Lore', totalStages: 2,
      prerequisites: ['relationship >= 30'],
      stageDescriptions: [
        'Stage 1: Aethran Lore Tier 2-3 — surface ruins expertise.',
        'Stage 2 (relationship 55+): Aethran Lore Tier 4 gateway — theoretical knowledge of the underground levels.',
      ],
    },
    merchant: null,
    physicalDescription: 'Weathered but careful. Carries his own torch and his own first-aid kit.',
    currentConcerns: 'The pulse is getting stronger. He can feel it through the stones. He should probably stop coming here.',
    relationshipRules: { gains: ['shared scholarly interest', 'helping with translation', 'not damaging the ruins'], losses: ['damaging ruins', 'taking artifacts without permission'], slamsShut: -40, gushes: 65 },
  },

  {
    id: 'iron_covenant_scout',
    name: 'Ves', age: 28, location: 'aethra_ruins', gender: 'F',
    role: 'Iron Covenant scout, watching the ruins',
    personality: 'Efficient, loyal to the Pale Lord, will not confirm her affiliation. Is watching for signs of the vault being opened. Not aggressive unless threatened or if the vault looks close to discovery.',
    storyRelevance: 'medium',
    clues: [
      'Is clearly watching something. At relationship 30+: admits she is "hired security" without naming the client.',
      'At relationship 50+: confirms her client is invested in protecting the ruins from casual access.',
      'High relationship (60+) or significant event: reveals the Iron Covenant and the Pale Lord\'s location.',
    ],
    teaching: { type: 'skill', id: 'stealth', skillName: 'Stealth', totalStages: 1,
      prerequisites: ['relationship >= 40'],
      stageDescriptions: ['Teaches Stealth Tier 1. Efficient, practical, no flourish.'],
    },
    merchant: null,
    physicalDescription: 'Unremarkable travel clothes. Does not draw attention. The watching is subtle.',
    currentConcerns: 'A historian getting too close to the vault entrance. And now a new arrival at the ruins.',
    relationshipRules: { gains: ['discretion', 'not pressing about her employer', 'competence'], losses: ['threatening her', 'threatening the ruins', 'reporting her'], slamsShut: -55, gushes: 65 },
  },

  // ── HIGH MOORS / REDGATE ─────────────────────────────────────────────────────

  {
    id: 'innkeeper_tora',
    name: 'Tora', age: 44, location: 'redgate', gender: 'F',
    role: "Innkeeper, The Moor's Edge, Redgate",
    personality: 'Direct, proud of her establishment, knows every traveler through Redgate for 15 years.',
    storyRelevance: 'low',
    clues: [
      'Iron-branded soldiers passed through 6 months ago heading north. She remembers everything about them.',
      'Has heard sounds from the moors at night that she cannot explain.',
    ],
    teaching: null,
    merchant: { inventory: [{ name: 'Boarding (per night)', price: 3 }, { name: 'Moor Bird Stew', price: 2 }], attitude: 'Friendly but not chatty.' },
    physicalDescription: 'Practical, fire-side-warmth look about her.',
    currentConcerns: 'Trade is down. The road south has fewer travelers.',
    relationshipRules: { gains: ['paying', 'being pleasant'], losses: ['causing trouble'], slamsShut: -30, gushes: 50 },
  },

  {
    id: 'hunter_kael',
    name: 'Kael', age: 38, location: 'high_moors', gender: 'M',
    role: 'Hunter, High Moors specialist',
    personality: 'Cautious in the way of someone who has learned caution on the moors. Knows the Standing Men. Has camped overnight near the mass grave site and does not recommend it.',
    storyRelevance: 'medium',
    clues: [
      'The Standing Men (Aethran beacons): partially active. He has seen them flicker at dusk.',
      'The mass grave: he knows the location. Camped near it once. Woke up with other people\'s memories and has avoided it since.',
      'Shattered Spire: knows the route. Says it is not haunted but does not quite meet your eyes when he says it.',
    ],
    teaching: { type: 'skill', id: 'tracking', skillName: 'Tracking', totalStages: 3,
      prerequisites: ['relationship >= 30'],
      stageDescriptions: [
        'Stage 1: Tracking Tier 1-2 (relationship 30+). Moors are his domain.',
        'Stage 2 (relationship 50+): Tracking Tier 3. Following cold trails, moor-specific signs.',
        'Stage 3 (relationship 70+, hunted with him twice): Tracking Tier 4 fundamentals.',
      ],
    },
    merchant: { inventory: [{ name: 'Hunting Bow (used)', price: 20 }, { name: 'Arrows (20)', price: 8 }, { name: 'Steel Trap', price: 10 }], attitude: 'Fair prices. Respects those who know what they are doing.' },
    physicalDescription: 'Lean, patient, weather-burned. Moves across the moors without sound.',
    currentConcerns: 'The beacons flickered three times last month. He has not told anyone because he does not know what to say.',
    relationshipRules: { gains: ['respecting the moors', 'practical hunting knowledge', 'patience'], losses: ['wasting animals', 'being reckless on the moors'], slamsShut: -40, gushes: 65 },
  },

  {
    id: 'captain_sym',
    name: 'Captain Sym', age: 42, location: 'redgate', gender: 'M',
    role: 'Border guard captain, Redgate',
    personality: 'By-the-book but not unreasonable. Has been asked to watch for Iron Covenant sigils and report them. Knows less than he would like.',
    storyRelevance: 'low',
    clues: [
      'Has standing orders about the Iron Covenant. Will say so if asked.',
      'Has seen two people with branded forearms in the last year — did not detain them, per orders.',
    ],
    teaching: { type: 'skill', id: 'swordsmanship', skillName: 'Swordsmanship', totalStages: 1,
      prerequisites: ['relationship >= 30'],
      stageDescriptions: ['Teaches Swordsmanship Tier 1. Standard guard training.'],
    },
    merchant: null,
    physicalDescription: 'Formal, uniformed, mustache.',
    currentConcerns: 'The standing orders do not make sense to him.',
    relationshipRules: { gains: ['respecting authority', 'following procedure', 'being useful to border security'], losses: ['creating incidents', 'breaking obvious laws'], slamsShut: -40, gushes: 60 },
  },

  {
    id: 'pale_lord',
    name: 'Ser Haddon Graves (The Pale Lord)', age: 67, location: 'iron_gate', gender: 'M',
    role: 'Former chief engineer, Iron Covenant leader',
    personality: 'Has spent 40 years trying to fix what he broke. Has kidnapped scholars. Has killed people. Is also the only person alive who fully understands the Engine and has a workable repair plan. Not a villain — a desperate man making terrible choices for correct reasons. Appears 50.',
    storyRelevance: 'high',
    clues: [
      'Has the most accurate Mnemorite vein maps in existence.',
      'Calculated overload: ~3 years 4 months from campaign start.',
      'Has 2 Stillpoint Rods. Third is in Aethra Underground Level 2.',
      'Late-game trust (relationship 70+): teaches Mnemorite Seal, Engine Reading. Reveals the third Rod\'s location.',
      'Will work with the player if convinced they are serious and have real intelligence.',
    ],
    teaching: {
      type: 'spell', id: 'engine_reading', spellName: 'Engine Reading', totalStages: 3,
      prerequisites: ['relationship >= 70', 'discovered_engine_chamber', 'completed_pale_lord_trust_quest'],
      stageDescriptions: [
        'Stage 1 (relationship 70+): Basic Engine sense. Feel the pulse, not interpret it.',
        'Stage 2: Read the Engine\'s current state — stress, flow, rate.',
        'Stage 3: Full Engine Reading. 5 MP. Required for repair protocol.',
      ],
    },
    merchant: null,
    physicalDescription: 'Tall, angular, white hair. Branded forearm (Iron Covenant mark, self-inflicted). Eyes of someone who has made peace with necessary harm.',
    currentConcerns: 'The overload timeline is shortening. The Engine\'s pulse rate has changed. His calculations are now off by 11 days.',
    relationshipRules: {
      gains: ['demonstrating genuine understanding of the problem', 'bringing him useful intelligence', 'not judging his methods before understanding his reasons'],
      losses: ['threatening him before understanding', 'working against a repair solution', 'being naive about the stakes'],
      slamsShut: -80, gushes: 85,
    },
  },

  // ── MILLHAVEN ────────────────────────────────────────────────────────────────

  {
    id: 'elder_bec',
    name: 'Elder Bec', age: 58, location: 'millhaven', gender: 'F',
    role: 'Farm community leader, Millhaven',
    personality: 'The first to notice the Forgetting spreading outward from Valdenmoor. Has been keeping careful records. Practical, steady, has organized her community to compensate for affected members.',
    storyRelevance: 'medium',
    clues: [
      'Her records show the Forgetting spreading outward, roughly 1 mile per 10 years.',
      'At relationship 40+: shares the records. The data clearly points to Valdenmoor as the source.',
      'Three of her community members have early symptoms. She knows who will be next.',
    ],
    teaching: null,
    merchant: null,
    physicalDescription: 'Straight-backed, organized, keeps a ledger.',
    currentConcerns: 'Her neighbor Jorin forgot his own wife\'s name this morning.',
    relationshipRules: { gains: ['respecting her community', 'taking the Forgetting seriously', 'being honest'], losses: ['dismissing the Forgetting', 'causing harm to her community'], slamsShut: -40, gushes: 65 },
  },

  {
    id: 'millwright_seo',
    name: 'Seo', age: 45, location: 'millhaven', gender: 'M',
    role: 'Millwright, Millhaven',
    personality: 'Technical, practical, has an engineer\'s relationship with cause and effect.',
    storyRelevance: 'low',
    clues: [
      'Has noticed the Thornhaven mill running strangely — too fine, too fast, too hot.',
      'At relationship 35+: can describe exactly what would cause those symptoms in a mill mechanism.',
    ],
    teaching: { type: 'skill', id: 'climbing', skillName: 'Climbing', totalStages: 1,
      prerequisites: ['relationship >= 25'],
      stageDescriptions: ['Teaches Climbing Tier 1 — mill scaffolding requires it.'],
    },
    merchant: { inventory: [{ name: 'Rope and Pulley Set', price: 18 }, { name: 'Iron Bolts (20)', price: 6 }], attitude: 'Trades fairly.' },
    physicalDescription: 'Calloused, careful hands. Looks at mechanisms the way others look at people.',
    currentConcerns: 'Needs a specific part from Valdenmoor and the supplier has not responded in three months.',
    relationshipRules: { gains: ['technical respect', 'helping with mechanical problems'], losses: ['dismissing technical knowledge'], slamsShut: -30, gushes: 50 },
  },

  {
    id: 'scholar_ryn',
    name: 'Ryn', age: 19, location: 'millhaven', gender: 'M',
    role: 'Aspiring scholar, heading to Valdenmoor',
    personality: 'Eager, smart, not yet sure what he wants to study. Has read everything he can find about the Aethran ruins. Will share his theories with anyone patient enough to listen.',
    storyRelevance: 'low',
    clues: ['Has a working theory about Aethran power sources that is accidentally partially correct.'],
    teaching: null, merchant: null,
    physicalDescription: 'Young, carried a pack that is clearly too heavy for the distance.',
    currentConcerns: 'Getting to Valdenmoor without being robbed. The road seems longer than the map shows.',
    relationshipRules: { gains: ['engagement with his ideas', 'advice about Valdenmoor'], losses: ['dismissing him'], slamsShut: -20, gushes: 45 },
  },
];

// ─── EXPANDED WORLD LORE ─────────────────────────────────────────────────────
// This expands the existing WORLD_LORE with location-specific details for all new areas.

export const EXPANDED_LORE = `
━━━ NEW & EXPANDED LOCATIONS ━━━

MILLHAVEN (~120 people): Three miles east of the crossroads, before Valdenmoor. Farming community. Notable: Elder Bec's meticulous Forgetting records (the best epidemiological account in the region). Millwright Seo's workshop. Young scholar Ryn preparing to leave for Valdenmoor. No inn — travelers sleep at the community hall. The Forgetting arrived here 8 years ago, spreading outward from Valdenmoor.

HEARTHWICK (~60 people): Small hamlet on the southern road, forest edge. Junction point toward Whisperwood. One tavern (The Green Door, always smoky). The southern road to Whisperwood begins here. Strange sounds from the deep forest at night. Travelers going to Sera must pass through.

REDGATE (~280 people): Border village at the northern road's transition to the High Moors. Has a garrison (6 guards, Captain Sym). The Moor's Edge inn is warm and reliable. Iron Covenant soldiers have passed through twice in the last year — Sym has orders to observe, not detain. Trade has dropped 30% — fewer people want to cross the moors.

HOLLOW KEEP: Old human castle, pre-Forgetting era. Abandoned 60 years ago after a siege. The stonework is good but the interior is structurally unsound in the east wing. Rumored haunting is actually: three Forgetting-affected individuals who wandered in and cannot remember how to leave. They are not dangerous, just lost. The keep's basement has a hidden passage from the old siege that connects to an early, rougher version of the Under-Streets — providing an alternative entrance to the Aethran corridors, if someone knows where to look.

THE GRAY GARDENS: Deep in Whisperwood south. Former Aethran botanical research facility — they were studying how Mnemorite resonance affected plant growth. The architecture has been entirely consumed by the forest. What grows there grows wrong: too large, too colorful, too fast. Medicinal properties of some plants are dramatically enhanced. Others are toxic. Sera knows this place. Maret would give a great deal to study it.

THE SHATTERED SPIRE: High Moors, north. Aethran beacon station, partially collapsed. The remaining spire sections still conduct resonance — during an Engine pulse, they produce a visible blue-white light. Hunter Kael has seen this. The base of the ruin contains a functioning Aethran survey chamber, half-buried, containing records of the region's Mnemorite vein map from 3,000 years ago — before the Engine was built.

THE SUNKEN TEMPLE: Coastal, accessible at low tide near Saltmere. Aethran construction, built into the cliff face. The lower chambers flood completely at high tide. Contains a working Aethran water-purification system (still active) and a sealed memory archive — Aethran records of the civil war from the losing side's perspective. Captain Vane knows it exists. Captain Raen has approached it by boat.

━━━ NPC RELATIONSHIP SYSTEM — GM RULES ━━━

NPC MEMORY: Every significant interaction should be remembered. When you receive npc_state for an NPC, use the memory entries to maintain consistency. If memory says "player was rude," the NPC remembers. If memory says "player helped with a difficult task," the NPC is warmer.

RELATIONSHIP TIERS:
- Below slamsShut threshold: NPC refuses all interaction. Merchants will not sell. Teachers will not teach. Some NPCs will actively warn others about the player.
- 0 to 30: Neutral. Functional but careful.
- 30 to 60: Warming. Some clues shared. Teaching may begin.
- 60 to 80: Trust. Significant secrets and teaching become available.
- Above gushes threshold: Genuine loyalty. NPCs may take personal risks for the player. Deep secrets become accessible.

RELATIONSHIP CHANGES:
- Award relationship gains in range of +5 to +20 depending on significance of the action.
- Apply losses in range of -5 to -30 depending on severity.
- A truly consequential betrayal: -40 to -60.
- Always include memorySummary in npcStateChanges when there is an interaction.
- Keep memorySummary to 1-2 sentences of the most important element.

TEACHING PREREQUISITES: Never grant a spell or skill stage unless the prerequisites listed for that NPC are clearly met. If they are not met, the NPC teaches nothing and may hint at what is needed instead. This is critical — teaching is a long-term investment, not a single encounter reward.

━━━ SKILL SYSTEM — GM RULES ━━━

SKILL XP AWARDS:
- Award skillXP via stateChanges.skillXP when the player uses a skill meaningfully.
- Suggested amounts: minor use = 3-5 XP. Significant use = 8-12 XP. Dramatic success = 15-20 XP.
- Only award skillXP for skills the player actually HAS (is in their skills array).
- Do NOT award skillXP for skills the player doesn't have yet.

SKILL ADVANCEMENT:
- The client tracks XP and notifies when thresholds are crossed.
- Tier advancement still requires the gate condition (see SKILL_CATALOG). The player knows their XP is high but cannot advance without meeting the gate.
- When a gate is met AND XP threshold crossed: use updateSkill stateChange to advance the tier.

NO QUICK WINS:
- Tier 1 requires an initial lesson from a willing NPC. The NPC must be willing (relationship threshold met, prerequisites satisfied).
- A single session DOES NOT complete multi-stage teaching. Each stage is separated by meaningful time or tasks.
- Initial skill teaching from an NPC gives Tier 1 with 0 XP — the very beginning.
- Never skip stages or rush learning. If the player pushes, the NPC pushes back.

━━━ FAST TRAVEL — GM RULES ━━━

Waypoints: Set addWaypoint in stateChanges when the player explicitly establishes a base, camps deliberately, or commits to a location as a return point. Not every visit earns a waypoint — only intentional establishment.

Travel encounters during fast travel are handled by the /api/fast-travel route. The GM will be called with a specific encounter prompt if a random encounter triggers.

━━━ MULTI-STAGE SPELL LEARNING — GM RULES ━━━

Spells are NOT given in a single session. Use addSpellStage to add learning progress:
{ spellId: "healing_trance", spellName: "Healing Trance", stage: 1, totalStages: 3, teacherNpcId: "sera", partialNote: "You understand the shape of the technique but cannot sustain it. In ideal conditions, you might close a cut." }

The player sees this as "Learning: Healing Trance (Stage 1/3)" in their Spells panel.
Between stages, the player must: complete tasks, return to the teacher, demonstrate growth, or have something change in the world.
Only when all stages complete do you send addSpell (the full spell object).

━━━ MERCHANT INVENTORY — GM RULES ━━━

NPCs with merchant.inventory defined can sell those items. Prices are in gold.
Players with Trade skill can negotiate discounts: Tier 1 = 5% off, Tier 2 = 10%, Tier 3 = 15%, Tier 4 = 20%, Tier 5 = 25%.
Merchants with slamsShut relationship breached: refuse to sell. Period.
Use removeInventory from merchant stock after purchase when tracking makes sense (scarce items).
`;

// ─── QUEST TYPE CATALOG ────────────────────────────────────────────────────────
// Player selects one of these at character creation. Shapes what the world puts in their path.

export const QUEST_TYPE_CATALOG = {
  missing:  'PLAYER DRIVE — Someone Is Missing: The player is searching for a specific missing person (let them name them in play or let it emerge). NPCs should have conflicting information. The mystery deepens before it resolves — and the answer may be uncomfortable.',
  debt:     'PLAYER DRIVE — Unfinished Business: The player carries a specific grudge or unresolved wrong. The target may be someone in or near Valdenmoor. Introduce moral complexity — the target may not be purely villainous, and resolution may cost more than expected.',
  scholar:  'PLAYER DRIVE — The Old World: The player is drawn to Aethran lore and ruins. Lean into Resonance mechanics, ancient inscriptions, and artifacts. Archivist Nessa, Historian Brek, and the Hermit have more to offer. The Engine Chamber and Aethra Ruins are primary draws.',
  survival: 'PLAYER DRIVE — Making Do: The player is pragmatic and survival-focused, drawn into events by circumstance. Lean into economic pressure, mercenary work, and moral grey areas. Money matters more here. Heroic destiny is not on the table.',
  hunted:   'PLAYER DRIVE — Running From Something: Something pursues the player — a faction, person, secret, or something stranger. Introduce signs slowly: a stranger asking questions, a letter left at an inn, someone who looks twice. The threat is real but not constant.',
  wrong:    'PLAYER DRIVE — Something Is Wrong Here: The player is an investigator drawn to the Forgetting and the resonance events. Reward careful observation and lateral thinking. NPCs with the Forgetting are more prominent, and clues accumulate slowly.',
  faithful: 'PLAYER DRIVE — A Calling: The player has a spiritual or duty-driven purpose. Lean into the Church of the Still Flame, omens, and moral questions. The Bren Monastery and roadside shrines resonate more. Sister Veil and High Keeper Aldara have things to tell this player.',
};
