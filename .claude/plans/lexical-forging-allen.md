# Valdenmoor: 5 Gameplay Improvements

## Context
Player reported several issues during gameplay:
1. Stat points from leveling up can't be spent (no UI exists post-creation)
2. Character info is hidden behind panel buttons — wants persistent sidebar
3. Hunger/thirst/fatigue alerts not visible without opening Stats panel
4. GM is too passive — lets the player dictate story outcomes
5. Skills should grow subtly with use and can be self-taught through repeated behavior

## Implementation Order
4 → 2 → 1+3 → 5 (GM prompt first since it's simplest, layout second so stat spending & alerts build directly into the sidebar)

---

## 1. GM Narrative Authority (server only)
**File**: `server/index.js`

Insert new rule block after COMBAT & LEVELING section (after line ~947), before FREE-FORM ACTIONS:

```
GM NARRATIVE AUTHORITY — CRITICAL:
You are the author of this world. The player chooses their ACTIONS, not the outcomes.
- The player says what they TRY. You decide what HAPPENS.
- If a player dictates outcomes ("I find the hidden passage"), treat it as an ATTEMPT — resolve based on stats, circumstances, world logic.
- Maintain your own narrative threads. NPCs have agendas. Events unfold on their own timeline.
- The Forgetting progresses whether the player investigates or not. Political tensions escalate independently.
- Do NOT let the player skip story gates. Keys, NPC trust, quest steps cannot be bypassed by declaration.
- Surprise the player. Dead ends exist. Shortcuts have consequences. The world pushes back.
- You may introduce complications, setbacks, and unexpected turns unprompted.
```

---

## 2. Two-Column Layout (desktop sidebar + narrative)
**File**: `client/src/Game.jsx`

**Add responsive hook** (near top of Game component):
- `const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900)`
- Resize listener to update

**Desktop layout** (≥900px):
```
┌─────────────────────────────────────────────────┐
│ HEADER: Name · Lvl · Location         [⚙]      │
├──────────┬──────────────────────────────────────┤
│ SIDEBAR  │ NARRATIVE LOG (scrollable)           │
│ (280px)  │                                       │
│ HP/MP/XP │ [Scene image]                         │
│ 💰 Purse │ The inn smells of tallow...          │
│ Stats    │                                       │
│ Needs    │                                       │
│ Skills   │ ┌─────────────────────────┐          │
│          │ │ [Input]           [Send]│          │
├──────────┴─┴─────────────────────────┴──────────┤
│ Panel btns: 🎒Pack ✨Spells 📜Lore 🗺Map        │
└─────────────────────────────────────────────────┘
```

- **Header**: keep name/level/location/settings on desktop; remove HP/MP/XP bars and Stats button (moved to sidebar)
- **Sidebar** (280px, fixed width, scrollable): HP/MP/XP bars, currency, 6 stats with modifiers, stat point spending (Issue 3), needs/condition alerts, compact skills list
- **Main area** (flex:1): narrative log + input, same as current
- **Panel buttons**: remove Stats on desktop (always visible). Keep Pack, Skills (detailed view), Spells, Lore, Purse, Map
- **Mobile** (<900px): keep current single-column layout unchanged, add compact needs line under HP/MP/XP bars

---

## 3. Stat Point Spending UI (in sidebar on desktop, in Stats panel on mobile)
**File**: `client/src/Game.jsx`

**New function `spendStatPoint(stat)`**:
- Decrement `statPoints`, increment `stats[stat]` (cap at 20)
- If CON raised and modifier changed: add +1 to `maxHp` and `hp`
- If INT raised and modifier changed: add +1 to `maxMp` and `mp`
- Trigger save via `persistSave()`

**UI**: When `character.statPoints > 0`, show "SPEND POINTS (N)" header with + buttons next to each stat. Replace the old "tell the GM!" text. Render in sidebar (desktop) or Stats panel (mobile).

---

## 4. Hunger/Thirst/Fatigue Alerts
**File**: `client/src/Game.jsx`

- **Desktop sidebar**: "CONDITION" section showing individual needs with color coding
  - Hidden when all <25 (character is fine)
  - Yellow (#c9a96e) 25-49, Orange (#e0a030) 50-74, Red (#c94a4a) 75+
- **Mobile header**: compact `needsLabel()` line under HP/MP/XP bars (only when non-null)

---

## 5. Skill Growth Through Use + Self-Taught Skills
**Files**: `client/src/Game.jsx`, `server/index.js`

### 5a. Practice Growth (intra-tier improvement)
- Add `practiceLevel: 0` field to skill objects
- In `applyStateChanges` skillXP handler: after adding XP, if XP crosses 33% → practiceLevel=1, 66% → practiceLevel=2
- On tier advance (`updateSkill`), reset `practiceLevel` to 0
- Show practice pips in `SkillProgressBar` component
- Add PRACTICE GROWTH rules to GM prompt explaining subtle effectiveness improvements
- Update `buildSkillSection` to include practiceLevel in GM context

### 5b. Self-Taught Skill Acquisition
- Add `emergentSkill` to GM response schema: `{ id, name, description, xpToNext }`
- In `applyStateChanges`: handle `emergentSkill` — create Tier 1 skill with `selfTaught: true, tierName: 'Self-taught'`
- Self-taught skills capped at Tier 1 until NPC teaches further
- Show "Self-taught" badge + "(requires teacher to advance)" in skill display
- When `updateSkill` advances a self-taught skill past Tier 1, clear `selfTaught` flag
- Add SELF-TAUGHT SKILL rules to GM prompt: rare, requires 3-4 demonstrated uses, cannot advance past Tier 1 alone

---

## Verification
1. `preview_start` the dev server
2. Check for build errors via `preview_logs`
3. `preview_screenshot` to verify two-column layout on desktop
4. `preview_resize` to mobile preset to verify single-column fallback
5. `preview_snapshot` to verify sidebar content (stats, HP/MP, needs, skills)
6. Check `preview_console_logs` for runtime errors
