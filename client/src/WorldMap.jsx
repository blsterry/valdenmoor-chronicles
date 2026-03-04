import { useState, useCallback } from 'react';

// ─── Map Data (client-side copy for rendering) ───────────────────────────────
// Mirrors server/lore.js MAP_DATA — keep in sync if locations change.

// Coordinates scaled for 800x600 viewBox (original 640x480 × 1.25)
const LOCATIONS = [
  { id: 'crossroads',      name: 'The Crossroads',             x: 375, y: 350, type: 'landmark'   },
  { id: 'thornhaven',      name: 'Thornhaven',                 x: 312, y: 225, type: 'village'    },
  { id: 'valdenmoor',      name: 'Valdenmoor',                 x: 512, y: 268, type: 'city'       },
  { id: 'port_saltmere',   name: 'Port Saltmere',              x: 618, y: 387, type: 'town'       },
  { id: 'whisperwood',     name: 'Whisperwood',                x: 287, y: 450, type: 'wilderness' },
  { id: 'aethra_ruins',    name: 'Aethra Ruins',               x: 193, y: 250, type: 'ruins'      },
  { id: 'iron_gate',       name: 'Iron Gate',                  x: 162, y: 387, type: 'dungeon'    },
  { id: 'high_moors',      name: 'High Moors',                 x: 187, y: 100, type: 'wilderness' },
  { id: 'bren_monastery',  name: 'Bren Monastery',             x: 481, y: 162, type: 'landmark'   },
  { id: 'redgate',         name: 'Redgate',                    x: 250, y: 125, type: 'village'    },
  { id: 'millhaven',       name: 'Millhaven',                  x: 456, y: 368, type: 'village'    },
  { id: 'hearthwick',      name: 'Hearthwick',                 x: 362, y: 481, type: 'hamlet'     },
  { id: 'resonance_nexus', name: 'Resonance Nexus',            x: 362, y: 237, type: 'special'    },
  { id: 'hermits_tower',   name: "Hermit's Tower",             x: 268, y: 537, type: 'ruins'      },
  { id: 'sunken_temple',   name: 'Sunken Temple',              x: 650, y: 462, type: 'dungeon'    },
  { id: 'shattered_spire', name: 'Shattered Spire',            x: 143, y: 131, type: 'ruins'      },
  { id: 'gray_gardens',    name: 'The Gray Gardens',           x: 256, y: 493, type: 'ruins'      },
  { id: 'hollow_keep',     name: 'Hollow Keep',                x: 437, y: 518, type: 'dungeon'    },
  { id: 'engine_chamber',  name: 'Engine Chamber',             x: 506, y: 281, type: 'special',   underground: true },
  { id: 'under_streets',   name: 'Under-Streets',              x: 500, y: 285, type: 'dungeon',   underground: true },
];

const ROADS = [
  ['crossroads',     'thornhaven'],
  ['thornhaven',     'redgate'],
  ['redgate',        'high_moors'],
  ['crossroads',     'millhaven'],
  ['millhaven',      'valdenmoor'],
  ['valdenmoor',     'port_saltmere'],
  ['crossroads',     'hearthwick'],
  ['hearthwick',     'whisperwood'],
  ['whisperwood',    'hermits_tower'],
  ['whisperwood',    'gray_gardens'],
  ['crossroads',     'aethra_ruins'],
  ['aethra_ruins',   'iron_gate'],
  ['valdenmoor',     'bren_monastery'],
  ['port_saltmere',  'sunken_temple'],
  ['high_moors',     'shattered_spire'],
  ['valdenmoor',     'hollow_keep'],
];

// Type → icon shape config (sizes scaled up for legibility)
const TYPE_CONFIG = {
  city:       { size: 15, color: '#e8c87a', symbol: '◆',   label: 'City'       },
  town:       { size: 11, color: '#c9a96e', symbol: '◆',   label: 'Town'       },
  village:    { size: 9,  color: '#8fc47a', symbol: '●',   label: 'Village'    },
  hamlet:     { size: 7,  color: '#6a8a5a', symbol: '●',   label: 'Hamlet'     },
  landmark:   { size: 10, color: '#d4c4a0', symbol: '▲',   label: 'Landmark'   },
  ruins:      { size: 9,  color: '#9b72cf', symbol: '◪',   label: 'Ruins'      },
  dungeon:    { size: 9,  color: '#c94a4a', symbol: '▼',   label: 'Dungeon'    },
  wilderness: { size: 10, color: '#4caf7a', symbol: '⬟',   label: 'Wilderness' },
  special:    { size: 9,  color: '#5a9fd4', symbol: '★',   label: 'Special'    },
};

// ─── WorldMap Component ───────────────────────────────────────────────────────

export default function WorldMap({ character, onFastTravel, onSetWaypoint, onClose }) {
  const [hovered, setHovered]             = useState(null);
  const [selected, setSelected]           = useState(null);
  const [confirmTravel, setConfirmTravel] = useState(null);
  const [confirmWaypoint, setConfirmWaypoint] = useState(null);

  const knownLocations = new Set(character.knownLocations || []);
  const waypoints      = new Set(character.waypoints || []);
  const currentLoc     = character.location;

  // Show underground locations only if player has been there
  const visibleLocations = LOCATIONS.filter(loc => {
    if (loc.underground) return knownLocations.has(loc.id);
    return true;
  });

  const getLocation = (id) => LOCATIONS.find(l => l.id === id);

  const handleLocClick = useCallback((loc) => {
    if (!knownLocations.has(loc.id)) return; // Can't click unknown
    if (loc.id === currentLoc) return;        // Already here

    setSelected(loc.id);

    if (waypoints.has(loc.id)) {
      setConfirmTravel(loc);
    } else {
      setConfirmWaypoint(loc);
    }
  }, [knownLocations, waypoints, currentLoc]);

  const handleFastTravel = () => {
    if (confirmTravel) {
      onFastTravel(currentLoc, confirmTravel.id);
      setConfirmTravel(null);
      setSelected(null);
    }
  };

  const handleSetWaypoint = () => {
    if (confirmWaypoint) {
      onSetWaypoint(confirmWaypoint.id);
      setConfirmWaypoint(null);
      setSelected(null);
    }
  };

  const dismiss = () => {
    setConfirmTravel(null);
    setConfirmWaypoint(null);
    setSelected(null);
  };

  // ─── SVG rendering helpers ──────────────────────────────────────────────

  const renderRoad = (road, i) => {
    const a = getLocation(road[0]);
    const b = getLocation(road[1]);
    if (!a || !b) return null;

    const aKnown = knownLocations.has(a.id);
    const bKnown = knownLocations.has(b.id);

    if (!aKnown && !bKnown) return null; // Both unknown — don't render at all

    if (aKnown && bKnown) {
      // Full road
      return (
        <line key={i}
          x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke="rgba(201,169,110,0.3)" strokeWidth="1.5"
          strokeDasharray={road[0] === 'whisperwood' || road[1] === 'whisperwood' ? '4,3' : 'none'}
        />
      );
    }

    // One known — render a short stub toward the unknown, fading
    const known   = aKnown ? a : b;
    const unknown = aKnown ? b : a;
    const midX = known.x + (unknown.x - known.x) * 0.35;
    const midY = known.y + (unknown.y - known.y) * 0.35;

    return (
      <line key={i}
        x1={known.x} y1={known.y} x2={midX} y2={midY}
        stroke="rgba(100,90,70,0.25)" strokeWidth="1"
        strokeDasharray="3,3"
      />
    );
  };

  const renderLocation = (loc) => {
    const cfg     = TYPE_CONFIG[loc.type] || TYPE_CONFIG.landmark;
    const isKnown = knownLocations.has(loc.id);
    const isHere  = loc.id === currentLoc;
    const isWaypt = waypoints.has(loc.id);
    const isHov   = hovered === loc.id;
    const isSel   = selected === loc.id;

    if (!isKnown) {
      // Render as a faint question mark if there are roads leading here from known locations
      const hasKnownRoad = ROADS.some(r =>
        (r[0] === loc.id && knownLocations.has(r[1])) ||
        (r[1] === loc.id && knownLocations.has(r[0]))
      );
      if (!hasKnownRoad) return null;

      return (
        <g key={loc.id}>
          <circle cx={loc.x} cy={loc.y} r={5} fill="rgba(80,70,60,0.4)" stroke="rgba(80,70,60,0.2)" strokeWidth="1"/>
          <text x={loc.x} y={loc.y + 1} textAnchor="middle" dominantBaseline="middle" fill="rgba(80,70,60,0.5)" fontSize="7">?</text>
        </g>
      );
    }

    const baseColor  = cfg.color;
    const nodeSize   = cfg.size + (isHere ? 3 : 0) + (isHov ? 2 : 0) + (isSel ? 1 : 0);
    const strokeColor = isHere ? '#e8c87a' : isSel ? '#fff' : isHov ? baseColor : `${baseColor}88`;
    const strokeWidth = isHere ? 2.5 : isSel ? 2 : isHov ? 1.5 : 1;
    const fillColor  = isHere ? baseColor : `${baseColor}${isHov ? 'cc' : '66'}`;
    const isClickable = !isHere;

    return (
      <g key={loc.id}
        style={{ cursor: isClickable ? 'pointer' : 'default' }}
        onMouseEnter={() => setHovered(loc.id)}
        onMouseLeave={() => setHovered(null)}
        onClick={() => handleLocClick(loc)}
      >
        {/* Glow for current location */}
        {isHere && (
          <circle cx={loc.x} cy={loc.y} r={nodeSize + 6} fill={baseColor} opacity="0.08"/>
        )}
        {/* Waypoint ring */}
        {isWaypt && !isHere && (
          <circle cx={loc.x} cy={loc.y} r={nodeSize + 4} fill="none" stroke="#c9a96e" strokeWidth="1" opacity="0.5" strokeDasharray="3,2"/>
        )}
        {/* Main dot */}
        <circle cx={loc.x} cy={loc.y} r={nodeSize}
          fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth}
        />
        {/* Waypoint star */}
        {isWaypt && (
          <text x={loc.x} y={loc.y - nodeSize - 4}
            textAnchor="middle" fontSize="9" fill="#c9a96e" opacity="0.9">★</text>
        )}
        {/* Location name */}
        <text
          x={loc.x}
          y={loc.y + nodeSize + 12}
          textAnchor="middle"
          fontSize={isHere ? 10 : 9}
          fill={isHere ? '#e8c87a' : isHov ? '#d4c4a0' : '#8a7a6a'}
          fontFamily="Georgia, serif"
        >
          {loc.name}
        </text>
      </g>
    );
  };

  const hoveredLoc = hovered ? LOCATIONS.find(l => l.id === hovered) : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) { dismiss(); onClose(); } }}
    >
      <div style={{
        background: 'radial-gradient(ellipse at 30% 20%, #0d0a18 0%, #06050a 100%)',
        border: '1px solid rgba(201,169,110,0.35)',
        maxWidth: '920px', width: '100%',
        padding: '1rem',
        fontFamily: 'Georgia, serif',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <div>
            <span style={{ color: '#e8c87a', fontSize: '0.85rem', letterSpacing: '0.12em' }}>⬡ WORLD MAP</span>
            <span style={{ color: '#4a3a2a', fontSize: '0.65rem', marginLeft: '0.75rem' }}>
              {knownLocations.size} locations discovered · {waypoints.size} waypoints set
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#6a5a4a',
            cursor: 'pointer', fontSize: '1rem', padding: '0.2rem 0.5rem',
          }}>✕</button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem', borderBottom: '1px solid rgba(201,169,110,0.1)', paddingBottom: '0.4rem' }}>
          {[['city/town','◆','#e8c87a'],['village','●','#8fc47a'],['landmark','▲','#d4c4a0'],['ruins','◪','#9b72cf'],['dungeon','▼','#c94a4a'],['wilderness','⬟','#4caf7a'],['special','★','#5a9fd4']].map(([label, sym, color]) => (
            <span key={label} style={{ fontSize: '0.6rem', color: '#6a5a4a' }}>
              <span style={{ color }}>{sym}</span> {label}
            </span>
          ))}
          <span style={{ fontSize: '0.6rem', color: '#6a5a4a' }}>
            <span style={{ color: '#c9a96e' }}>★</span> waypoint
          </span>
          <span style={{ fontSize: '0.6rem', color: '#6a5a4a' }}>
            <span style={{ color: '#4a3a2a' }}>?</span> unexplored road
          </span>
        </div>

        {/* SVG Map */}
        <div style={{ position: 'relative' }}>
          <svg
            width="100%"
            viewBox="0 0 800 600"
            style={{ display: 'block', background: 'radial-gradient(ellipse at 50% 50%, #0a0814 0%, #060508 100%)' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="mapBlur2"><feGaussianBlur stdDeviation="2"/></filter>
              <radialGradient id="fogGrad" cx="50%" cy="50%" r="50%">
                <stop offset="70%" stopColor="transparent" stopOpacity="0"/>
                <stop offset="100%" stopColor="#06050a" stopOpacity="0.8"/>
              </radialGradient>
            </defs>

            {/* Subtle grid / parchment texture */}
            {Array.from({length:16},(_,i)=>(
              <line key={`gh${i}`} x1="0" y1={i*40} x2="800" y2={i*40} stroke="rgba(201,169,110,0.03)" strokeWidth="0.5"/>
            ))}
            {Array.from({length:21},(_,i)=>(
              <line key={`gv${i}`} x1={i*40} y1="0" x2={i*40} y2="600" stroke="rgba(201,169,110,0.03)" strokeWidth="0.5"/>
            ))}

            {/* Roads */}
            {ROADS.map((r, i) => renderRoad(r, i))}

            {/* Locations */}
            {visibleLocations.map(loc => renderLocation(loc))}

            {/* Fog vignette */}
            <rect width="800" height="600" fill="url(#fogGrad)" pointerEvents="none"/>

            {/* Compass rose (top right) */}
            <g transform="translate(760, 40)">
              <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(201,169,110,0.2)" strokeWidth="1"/>
              <text x="0" y="-8" textAnchor="middle" fontSize="7" fill="rgba(201,169,110,0.5)" fontFamily="Georgia, serif">N</text>
              <line x1="0" y1="-5" x2="0" y2="-12" stroke="rgba(201,169,110,0.4)" strokeWidth="1"/>
              <line x1="0" y1="5"  x2="0" y2="12"  stroke="rgba(201,169,110,0.2)" strokeWidth="0.7"/>
              <line x1="-5" y1="0" x2="-12" y2="0" stroke="rgba(201,169,110,0.2)" strokeWidth="0.7"/>
              <line x1="5"  y1="0" x2="12"  y2="0" stroke="rgba(201,169,110,0.2)" strokeWidth="0.7"/>
            </g>
          </svg>

          {/* Hover tooltip */}
          {hoveredLoc && knownLocations.has(hoveredLoc.id) && (
            <div style={{
              position: 'absolute',
              left: `${(hoveredLoc.x / 800) * 100}%`,
              top:  `${(hoveredLoc.y / 600) * 100 - 12}%`,
              transform: 'translate(-50%, -100%)',
              background: 'rgba(6,5,10,0.95)',
              border: '1px solid rgba(201,169,110,0.4)',
              padding: '0.3rem 0.6rem',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}>
              <div style={{ color: '#e8c87a', fontSize: '0.75rem' }}>{hoveredLoc.name}</div>
              <div style={{ color: '#6a5a4a', fontSize: '0.6rem', textTransform: 'capitalize' }}>
                {TYPE_CONFIG[hoveredLoc.type]?.label || hoveredLoc.type}
                {waypoints.has(hoveredLoc.id) && ' · Waypoint set'}
                {hoveredLoc.id === character.location && ' · You are here'}
                {hoveredLoc.id !== character.location && knownLocations.has(hoveredLoc.id) && !waypoints.has(hoveredLoc.id) &&
                  ' · Click to set waypoint'}
                {hoveredLoc.id !== character.location && waypoints.has(hoveredLoc.id) &&
                  ' · Click to fast travel'}
              </div>
            </div>
          )}
        </div>

        {/* Current location indicator */}
        <div style={{ marginTop: '0.5rem', color: '#5a6a4a', fontSize: '0.7rem', textAlign: 'center' }}>
          You are at{' '}
          <span style={{ color: '#e8c87a' }}>
            {LOCATIONS.find(l => l.id === character.location)?.name || character.location}
          </span>
        </div>

        {/* Instructions */}
        <div style={{ color: '#3a2a1a', fontSize: '0.62rem', textAlign: 'center', marginTop: '0.25rem' }}>
          Click a discovered location to set a waypoint · Click a waypointed location to fast travel
        </div>
      </div>

      {/* Fast Travel Confirmation Modal */}
      {confirmTravel && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 210,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
        }}>
          <div style={{
            background: '#0a0814',
            border: '1px solid rgba(201,169,110,0.5)',
            padding: '1.5rem 2rem',
            maxWidth: '340px',
            textAlign: 'center',
            fontFamily: 'Georgia, serif',
          }}>
            <div style={{ color: '#c9a96e', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>FAST TRAVEL</div>
            <div style={{ color: '#d4c4a0', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
              Journey to {confirmTravel.name}?
            </div>
            <div style={{ color: '#6a5a4a', fontSize: '0.72rem', marginBottom: '1.25rem' }}>
              The road is long. Something may find you along the way.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={handleFastTravel} style={{
                background: 'rgba(201,169,110,0.15)',
                border: '1px solid rgba(201,169,110,0.6)',
                color: '#e8c87a', cursor: 'pointer',
                padding: '0.5rem 1.25rem', fontFamily: 'Georgia, serif', fontSize: '0.8rem',
              }}>
                Set Out →
              </button>
              <button onClick={dismiss} style={{
                background: 'transparent',
                border: '1px solid rgba(201,169,110,0.25)',
                color: '#6a5a4a', cursor: 'pointer',
                padding: '0.5rem 1.25rem', fontFamily: 'Georgia, serif', fontSize: '0.8rem',
              }}>
                Stay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Waypoint Confirmation Modal */}
      {confirmWaypoint && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 210,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
        }}>
          <div style={{
            background: '#0a0814',
            border: '1px solid rgba(201,169,110,0.5)',
            padding: '1.5rem 2rem',
            maxWidth: '360px',
            textAlign: 'center',
            fontFamily: 'Georgia, serif',
          }}>
            <div style={{ color: '#c9a96e', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>SET WAYPOINT</div>
            <div style={{ color: '#d4c4a0', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
              Mark {confirmWaypoint.name} as a waypoint?
            </div>
            <div style={{ color: '#6a5a4a', fontSize: '0.72rem', marginBottom: '1.25rem' }}>
              You must physically travel there first and establish a presence. Once set, you can fast travel here from anywhere you have a waypoint — though the road is never entirely safe.
            </div>
            <div style={{ color: '#4a3a2a', fontSize: '0.65rem', marginBottom: '1rem', fontStyle: 'italic' }}>
              Note: Waypoints are set by the GM when you establish a base at a location, or you can mark one here to remind yourself of the intent.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={handleSetWaypoint} style={{
                background: 'rgba(201,169,110,0.15)',
                border: '1px solid rgba(201,169,110,0.6)',
                color: '#e8c87a', cursor: 'pointer',
                padding: '0.5rem 1.25rem', fontFamily: 'Georgia, serif', fontSize: '0.8rem',
              }}>
                Mark It ★
              </button>
              <button onClick={dismiss} style={{
                background: 'transparent',
                border: '1px solid rgba(201,169,110,0.25)',
                color: '#6a5a4a', cursor: 'pointer',
                padding: '0.5rem 1.25rem', fontFamily: 'Georgia, serif', fontSize: '0.8rem',
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
