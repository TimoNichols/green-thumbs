// Green Thumbs — full app prototype (light, botanical)
// Tabs: Home · Plants · Scan · Garden · You

const { useState, useEffect, useRef, useMemo } = React;

// ─── Tokens ──────────────────────────────────────────────────
const T = {
  // Light, botanical palette
  bg:        '#F4F1E8',   // warm cream background
  bgAlt:     '#EBE6D6',   // section dividers / subtle bands
  bgRaise:   '#FFFFFF',   // cards
  bgSage:    '#E5EBDB',   // pale sage tint (chips, hero washes)
  bgMint:    '#DCE7C7',   // mint-leaf tint
  bgDeep:    '#0E1A12',   // ONLY for camera viewfinder

  line:      'rgba(45, 70, 50, 0.10)',
  lineSoft:  'rgba(45, 70, 50, 0.06)',

  // Greens — deep to light
  forest:    '#1F3A28',   // primary text, deep accent
  pine:      '#2E5238',   // secondary green
  leaf:      '#5C8A5C',   // CTA, mid-green
  sage:      '#8FA988',   // soft green
  mint:      '#B8D5A6',   // pale mint
  leafDeep:  '#3D6240',   // for darker outlines

  // Text
  text:      '#1F3A28',   // primary on cream
  textSoft:  '#4A5A4A',   // secondary
  textMute:  '#6B7A6B',   // tertiary, mono labels

  // Amber accent — diagnosis only
  amber:     '#B8842E',   // amber on light
  amberSoft: '#F5E6C8',   // amber bg tint (light)
  amberDeep: '#7A5418',   // amber dark text on amber bg
  amberLine: '#D9B074',

  // Type
  serif: '"Fraunces", "Cormorant Garamond", Georgia, serif',
  sans:  '"Manrope", -apple-system, system-ui, sans-serif',
  mono:  '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
};

const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>
     <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12 0 0 0 0 0.18 0 0 0 0 0.13 0 0 0 0.04 0'/></filter>
     <rect width='100%' height='100%' filter='url(%23n)'/>
   </svg>`
)}")`;

// ─── Icons ───────────────────────────────────────────────────
const Ico = {
  scan: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8V5a2 2 0 012-2h3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M21 16v3a2 2 0 01-2 2h-3"/>
      <circle cx="12" cy="12" r="3.5"/>
    </svg>
  ),
  home: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5L12 4l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-8.5z"/>
    </svg>
  ),
  list: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10"/>
    </svg>
  ),
  garden: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V11M12 11c0-3 2-6 5-6 0 4-2 7-5 7zM12 11c0-3-2-6-5-6 0 4 2 7 5 7z"/>
      <path d="M5 22h14"/>
    </svg>
  ),
  user: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
    </svg>
  ),
  leaf: (c=T.leaf, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19c0-9 7-14 16-14 0 9-5 16-14 16-1 0-2 0-2-2z"/>
      <path d="M5 19c4-4 8-7 14-9"/>
    </svg>
  ),
  sun: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
    </svg>
  ),
  drop: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3s-6 7-6 11a6 6 0 0012 0c0-4-6-11-6-11z"/>
    </svg>
  ),
  soil: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17h18M5 17l1-4h12l1 4M9 13V9a3 3 0 016 0v4"/>
    </svg>
  ),
  humid: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4s4 5 4 8a4 4 0 11-8 0c0-3 4-8 4-8zM17 11s3 4 3 6a3 3 0 11-6 0c0-2 3-6 3-6z"/>
    </svg>
  ),
  flash: (c, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>
    </svg>
  ),
  gallery: (c, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <circle cx="9" cy="10" r="1.5"/>
      <path d="M3 17l5-5 4 4 3-3 6 6"/>
    </svg>
  ),
  flip: (c, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h13l-3-3M21 17H8l3 3"/>
    </svg>
  ),
  back: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7"/>
    </svg>
  ),
  more: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>
    </svg>
  ),
  alert: (c=T.amber, s=18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l10 18H2L12 3z"/>
      <path d="M12 10v5M12 18v.5"/>
    </svg>
  ),
  check: (c=T.leaf, s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7"/>
    </svg>
  ),
  trash: (c='#fff', s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>
    </svg>
  ),
  bell: (c=T.text, s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9zM10 21a2 2 0 004 0"/>
    </svg>
  ),
  chevron: (c=T.textMute, s=18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7"/>
    </svg>
  ),
  settings: (c=T.text, s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>
    </svg>
  ),
  reminder: (c=T.text, s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8"/>
      <path d="M12 9v4l2 2M9 2h6"/>
    </svg>
  ),
  share: (c=T.text, s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v14"/>
    </svg>
  ),
  trophy: (c=T.text, s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a2 2 0 002 4M17 6h3a2 2 0 01-2 4"/>
    </svg>
  ),
  plus: (c=T.text, s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  bookmark: (c=T.text, s=18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v18l-6-4-6 4V3z"/>
    </svg>
  ),
  close: (c=T.text, s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18"/>
    </svg>
  ),
};

// ─── Reusable bits ───────────────────────────────────────────
function GrainOverlay({ opacity = 0.6 }) {
  // disabled — was muting colors. keep as no-op so call sites don't break.
  return null;
}

function Pill({ children, kind = 'default', style = {} }) {
  const k = {
    default: { bg: 'rgba(31,58,40,0.06)', fg: T.text,    bd: 'rgba(31,58,40,0.12)' },
    leaf:    { bg: T.bgMint,              fg: T.pine,    bd: 'rgba(92,138,92,0.3)' },
    amber:   { bg: T.amberSoft,           fg: T.amberDeep, bd: T.amberLine },
    sage:    { bg: T.bgSage,              fg: T.pine,    bd: 'rgba(143,169,136,0.4)' },
  }[kind] || {};
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'5px 10px', borderRadius:999, fontSize:11, fontWeight:600,
      letterSpacing:0.4, textTransform:'uppercase', fontFamily:T.sans,
      background:k.bg, color:k.fg, border:`1px solid ${k.bd}`,
      ...style,
    }}>{children}</span>
  );
}

// Plant placeholder — light, botanical stripe
function PlantPlaceholder({ size = 56, label = 'PLANT', shape = 'square', tone = 'mint' }) {
  const stripes = {
    mint: `repeating-linear-gradient(135deg, ${T.bgMint} 0 6px, ${T.bgSage} 6px 12px)`,
    sage: `repeating-linear-gradient(135deg, ${T.sage} 0 6px, ${T.bgMint} 6px 12px)`,
    forest: `repeating-linear-gradient(135deg, ${T.leafDeep} 0 6px, ${T.pine} 6px 12px)`,
  }[tone];
  return (
    <div style={{
      width: size, height: size,
      borderRadius: shape === 'circle' ? '50%' : 14,
      background: stripes,
      border: `1px solid ${T.line}`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily: T.mono, fontSize: 8, color: tone === 'forest' ? T.mint : T.pine,
      letterSpacing: 0.5, textAlign:'center', padding: 4, boxSizing:'border-box',
      flexShrink: 0,
    }}>{label}</div>
  );
}

// ─── Scan history ───────────────────────────────────────────
const RECENT = [
  { id:'p1', name:'Monstera deliciosa', common:'Swiss cheese plant', date:'Today',      symptom:'Yellow edges', confidence: 94 },
  { id:'p2', name:'Sansevieria trifasciata', common:'Snake plant',   date:'2 days ago', symptom:null,           confidence: 99 },
  { id:'p3', name:'Ficus lyrata', common:'Fiddle leaf fig',          date:'Last week',  symptom:'Brown tips',   confidence: 91 },
  { id:'p4', name:'Calathea orbifolia', common:'Prayer plant',       date:'Mar 12',     symptom:'Drooping',     confidence: 88 },
  { id:'p5', name:'Pilea peperomioides', common:'Chinese money plant', date:'Mar 8',    symptom:null,           confidence: 96 },
  { id:'p6', name:'Epipremnum aureum', common:'Golden pothos',       date:'Mar 1',      symptom:'Spots',        confidence: 90 },
];

const SYMPTOMS = ['None', 'Yellow edges', 'Brown tips', 'Drooping', 'Spots'];

// ─── HOME ────────────────────────────────────────────────────
function Home({ go }) {
  return (
    <div style={{ position:'relative', height:'100%', background: T.bg, color: T.text, overflow:'auto' }}>
      <GrainOverlay opacity={0.4}/>
      {/* botanical wash */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height: 420,
        background: `radial-gradient(120% 70% at 70% 0%, ${T.bgMint} 0%, ${T.bg} 70%)`,
        pointerEvents:'none',
      }} />

      <div style={{ position:'relative', padding:'72px 24px 120px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:34, height:34, borderRadius:10,
              background: `linear-gradient(135deg, ${T.leaf}, ${T.pine})`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>{Ico.leaf('#F4F1E8', 18)}</div>
            <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 500, letterSpacing: 0.2, color: T.text }}>
              Green Thumbs
            </div>
          </div>
          <button onClick={() => go('profile')} style={{
            background:'none', border:'none', cursor:'pointer', padding: 0,
            display:'flex', alignItems:'center', gap: 8,
          }}>
            <div style={{
              width:36, height:36, borderRadius:'50%',
              background: T.bgMint, border:`1px solid rgba(92,138,92,0.3)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily: T.serif, fontSize: 14, color: T.pine, fontWeight: 500,
            }}>K</div>
          </button>
        </div>

        {/* Hero copy */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase' }}>
            A field guide, in your pocket
          </div>
          <h1 style={{
            fontFamily: T.serif, fontWeight: 400, fontSize: 44, lineHeight: 1.05,
            margin: '14px 0 0', letterSpacing: -0.5, color: T.text,
          }}>
            Know what your<br/><em style={{ fontStyle:'italic', color: T.leaf }}>plant</em> needs.
          </h1>
          <p style={{
            fontFamily: T.sans, fontSize: 14.5, lineHeight: 1.55, color: T.textSoft,
            margin: '14px 0 0', maxWidth: 300, textWrap:'pretty',
          }}>
            One photo. Species, care, and a calm diagnosis when something's off.
          </p>
        </div>

        {/* Primary CTA */}
        <div style={{ marginTop: 32 }}>
          <button onClick={() => go('camera')} style={{
            width:'100%', height: 64, border:'none', cursor:'pointer',
            background: `linear-gradient(180deg, ${T.leaf} 0%, ${T.pine} 100%)`,
            color:'#FBFAF3', borderRadius: 18,
            fontFamily: T.sans, fontSize: 16, fontWeight: 700, letterSpacing: 0.2,
            display:'flex', alignItems:'center', justifyContent:'center', gap: 12,
            boxShadow: `0 6px 18px rgba(46,82,56,0.25), inset 0 -2px 0 rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18)`,
          }}>
            {Ico.scan('#FBFAF3', 22)} Scan a plant
          </button>
        </div>

        {/* This week stats */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 12 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase' }}>
              This week
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8 }}>
            <StatTile value="3" label="scans" tone="leaf"/>
            <StatTile value="2" label="watered" tone="sage"/>
            <StatTile value="1" label="flagged" tone="amber"/>
          </div>
        </div>

        {/* Up next — care reminder */}
        <div style={{
          marginTop: 18, padding: 18, borderRadius: 18,
          background: T.bgRaise, border: `1px solid ${T.line}`,
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase' }}>
              Up next
            </div>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.leaf, letterSpacing: 0.6 }}>TUESDAY</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
            <PlantPlaceholder size={48} label="MONST" tone="mint"/>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.serif, fontStyle:'italic', fontSize: 16, color: T.text }}>
                Water Monstera
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textSoft, marginTop: 2 }}>
                Top 2 in. should be dry by morning
              </div>
            </div>
            <button style={{
              padding:'8px 14px', borderRadius: 10, cursor:'pointer',
              background: T.bgMint, color: T.pine, border:`1px solid rgba(92,138,92,0.3)`,
              fontFamily: T.sans, fontSize: 12, fontWeight: 600,
            }}>Done</button>
          </div>
        </div>

        {/* Recent scans row */}
        <div style={{ marginTop: 22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 12 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase' }}>
              Recent scans
            </div>
            <button onClick={() => go('plants')} style={{
              background:'none', border:'none', color: T.leaf, cursor:'pointer',
              fontFamily: T.sans, fontSize: 12, fontWeight: 600,
            }}>See all →</button>
          </div>
          <div style={{ display:'flex', gap: 12, overflowX:'auto', margin:'0 -24px', padding: '4px 24px 12px' }}>
            {RECENT.slice(0, 5).map((p) => (
              <div key={p.id} onClick={() => go('report', p.id)} style={{
                flexShrink: 0, width: 110, cursor:'pointer',
              }}>
                <div style={{ position:'relative' }}>
                  <PlantPlaceholder size={110} label={p.name.split(' ')[0].toUpperCase()} />
                  {p.symptom && (
                    <div style={{
                      position:'absolute', top: 8, right: 8,
                      width: 18, height: 18, borderRadius:'50%',
                      background: T.amber, border:`2px solid ${T.bg}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <div style={{ width:4, height:4, borderRadius:'50%', background:'#FBFAF3' }}/>
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: T.serif, fontStyle:'italic', fontSize: 13, marginTop: 8, color: T.text }}>
                  {p.name.split(' ')[0]}
                </div>
                <div style={{ fontFamily: T.sans, fontSize: 11, color: T.textMute, marginTop: 1 }}>
                  {p.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ value, label, tone }) {
  const bgs = { leaf: T.bgMint, sage: T.bgSage, amber: T.amberSoft };
  const fgs = { leaf: T.pine,   sage: T.pine,   amber: T.amberDeep };
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: bgs[tone], border: `1px solid ${T.line}`,
    }}>
      <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 400, color: fgs[tone], lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 9.5, color: fgs[tone], opacity: 0.7, marginTop: 4, letterSpacing: 0.6, textTransform:'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

// ─── CAMERA ──────────────────────────────────────────────────
function Camera({ go, tw, setTw }) {
  const symptom = tw.cameraSymptom;
  const setSymptom = (s) => setTw('cameraSymptom', s);

  return (
    <div style={{ position:'relative', height:'100%', background: T.bgDeep, overflow:'hidden' }}>
      {/* Top chrome */}
      <div style={{
        position:'absolute', top: 56, left: 0, right: 0, zIndex: 10,
        padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <button onClick={() => go('home')} style={{
          width:40, height:40, borderRadius:'50%', cursor:'pointer',
          background:'rgba(255,255,255,0.12)', border:'none',
          display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(10px)',
        }}>{Ico.back('#F4F1E8', 22)}</button>
        <div style={{
          display:'flex', alignItems:'center', gap: 8, padding:'8px 14px',
          background:'rgba(255,255,255,0.1)', borderRadius: 999,
          fontFamily: T.mono, fontSize: 10.5, color: '#F4F1E8', letterSpacing: 1.2, textTransform:'uppercase',
          backdropFilter:'blur(10px)',
        }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background: T.mint }} />
          Identifying
        </div>
        <button style={{
          width:40, height:40, borderRadius:'50%', cursor:'pointer',
          background:'rgba(255,255,255,0.12)', border:'none',
          display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(10px)',
        }}>{Ico.flash('#F4F1E8', 20)}</button>
      </div>

      {/* Viewfinder */}
      <div style={{
        position:'absolute', top: 116, bottom: 280, left: 16, right: 16,
        borderRadius: 28, overflow:'hidden',
        background: `radial-gradient(140% 100% at 50% 30%, #1F3A28 0%, #060A07 100%)`,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06)`,
      }}>
        <div style={{
          position:'absolute', inset:0,
          background: `repeating-linear-gradient(120deg, rgba(184,213,166,0.08) 0 30px, transparent 30px 60px)`,
        }} />
        <div style={{
          position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
          fontFamily: T.mono, fontSize: 10, color: 'rgba(184,213,166,0.55)', letterSpacing: 1.4,
          textTransform:'uppercase', textAlign:'center',
        }}>
          [ live viewfinder ]<br/><span style={{ fontSize: 9, opacity: 0.7 }}>plant subject</span>
        </div>

        {/* Rule-of-thirds grid */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="rgba(255,255,255,0.14)" strokeWidth="1"/>
          <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="rgba(255,255,255,0.14)" strokeWidth="1"/>
          <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="rgba(255,255,255,0.14)" strokeWidth="1"/>
          <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="rgba(255,255,255,0.14)" strokeWidth="1"/>
        </svg>

        {/* Focus brackets */}
        {['tl','tr','bl','br'].map(p => {
          const pos = {
            tl: { top: '32%', left: '22%', borderTop: `2px solid ${T.mint}`, borderLeft: `2px solid ${T.mint}`, borderTopLeftRadius: 4 },
            tr: { top: '32%', right: '22%', borderTop: `2px solid ${T.mint}`, borderRight: `2px solid ${T.mint}`, borderTopRightRadius: 4 },
            bl: { bottom: '32%', left: '22%', borderBottom: `2px solid ${T.mint}`, borderLeft: `2px solid ${T.mint}`, borderBottomLeftRadius: 4 },
            br: { bottom: '32%', right: '22%', borderBottom: `2px solid ${T.mint}`, borderRight: `2px solid ${T.mint}`, borderBottomRightRadius: 4 },
          }[p];
          return <div key={p} style={{ position:'absolute', width: 28, height: 28, ...pos }} />;
        })}

        <div style={{
          position:'absolute', bottom: 16, left: 0, right: 0, textAlign:'center',
          fontFamily: T.mono, fontSize: 10, color: 'rgba(244,241,232,0.6)',
          letterSpacing: 1.2, textTransform:'uppercase',
        }}>Frame the whole plant</div>
      </div>

      {/* Symptom chip row */}
      <div style={{
        position:'absolute', bottom: 180, left: 0, right: 0, zIndex: 5,
      }}>
        <div style={{
          padding:'0 20px 10px', fontFamily: T.mono, fontSize: 10, color: 'rgba(184,213,166,0.7)',
          letterSpacing: 1.2, textTransform:'uppercase',
        }}>
          What looks off?
          <span style={{ marginLeft: 8, color: 'rgba(244,241,232,0.5)', textTransform:'none', letterSpacing: 0 }}>
            select before shooting
          </span>
        </div>
        <div style={{
          display:'flex', gap: 8, overflowX:'auto', padding: '0 20px 4px',
          scrollbarWidth:'none',
        }}>
          {SYMPTOMS.map(s => {
            const active = symptom === s;
            const isNone = s === 'None';
            return (
              <button key={s} onClick={() => setSymptom(s)} style={{
                flexShrink: 0, height: 38, padding: '0 16px', cursor:'pointer',
                borderRadius: 999, fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                background: active
                  ? (isNone ? 'rgba(184,213,166,0.25)' : 'rgba(217,176,116,0.25)')
                  : 'rgba(255,255,255,0.08)',
                color: active
                  ? (isNone ? T.mint : '#F0CC85')
                  : '#F4F1E8',
                border: `1px solid ${active
                  ? (isNone ? 'rgba(184,213,166,0.6)' : 'rgba(217,176,116,0.6)')
                  : 'rgba(255,255,255,0.14)'}`,
                backdropFilter:'blur(10px)',
                display:'flex', alignItems:'center', gap: 6,
                transition:'all 0.15s',
              }}>
                {active && !isNone && (
                  <div style={{ width:5, height:5, borderRadius:'50%', background: '#F0CC85' }}/>
                )}
                {active && isNone && Ico.check(T.mint, 12)}
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Shutter row */}
      <div style={{
        position:'absolute', bottom: 56, left: 0, right: 0, zIndex: 5,
        display:'flex', alignItems:'center', justifyContent:'space-around', padding: '0 32px',
      }}>
        <button style={{
          width:52, height:52, borderRadius: 14, cursor:'pointer',
          background: 'rgba(255,255,255,0.1)', border: `1px solid rgba(255,255,255,0.14)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(10px)',
        }}>{Ico.gallery('#F4F1E8', 22)}</button>

        <button onClick={() => go('analyzing')} style={{
          width:84, height:84, borderRadius:'50%', cursor:'pointer', position:'relative',
          background:'transparent', border:`3px solid #F4F1E8`, padding: 4,
        }}>
          <div style={{
            width:'100%', height:'100%', borderRadius:'50%',
            background: '#F4F1E8',
            boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.08)',
          }}/>
        </button>

        <button style={{
          width:52, height:52, borderRadius: 14, cursor:'pointer',
          background: 'rgba(255,255,255,0.1)', border: `1px solid rgba(255,255,255,0.14)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(10px)',
        }}>{Ico.flip('#F4F1E8', 22)}</button>
      </div>
    </div>
  );
}

// ─── ANALYZING ───────────────────────────────────────────────
function Analyzing({ go }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= 3) {
      const t = setTimeout(() => go('report', 'p1'), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(s => s + 1), 1200);
    return () => clearTimeout(t);
  }, [step]);

  const steps = [
    { label: 'Identifying species', sub: 'plant.id' },
    { label: 'Checking care database', sub: '4,212 species indexed' },
    { label: 'Generating diagnosis', sub: 'reasoning over symptoms' },
  ];

  return (
    <div style={{ position:'relative', height:'100%', background: T.bg, color: T.text, overflow:'hidden' }}>
      <GrainOverlay opacity={0.4}/>
      <div style={{
        position:'absolute', inset: 0,
        background: `radial-gradient(80% 60% at 50% 35%, ${T.bgMint} 0%, transparent 70%)`,
      }}/>

      <div style={{
        position:'relative', height:'100%', padding:'72px 32px',
        display:'flex', flexDirection:'column',
      }}>
        <div style={{ display:'flex', justifyContent:'center', marginTop: 8 }}>
          <div style={{ position:'relative' }}>
            <PlantPlaceholder size={140} label="MONSTERA" tone="mint"/>
            <div style={{
              position:'absolute', inset: 4, borderRadius: 12, overflow:'hidden', pointerEvents:'none',
            }}>
              <div className="scanline" style={{
                position:'absolute', left:0, right:0, height: 2,
                background: `linear-gradient(90deg, transparent, ${T.leaf}, transparent)`,
                boxShadow: `0 0 12px ${T.leaf}`,
              }}/>
            </div>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop: 40 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase' }}>
            Analyzing
          </div>
          <h2 style={{
            fontFamily: T.serif, fontSize: 26, fontWeight: 400, margin:'12px 0 0',
            color: T.text, letterSpacing: -0.3,
          }}>
            <em style={{ fontStyle:'italic' }}>Reading</em> the leaves…
          </h2>
        </div>

        <div style={{ marginTop: 44, display:'flex', flexDirection:'column', gap: 4 }}>
          {steps.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const idle = i > step;
            return (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap: 14,
                padding: '14px 6px',
                opacity: idle ? 0.35 : 1,
                transition: 'opacity 0.4s',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius:'50%', flexShrink: 0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: done ? T.bgMint : active ? T.amberSoft : 'rgba(31,58,40,0.06)',
                  border: `1px solid ${done ? T.leaf : active ? T.amberLine : 'rgba(31,58,40,0.12)'}`,
                }}>
                  {done && Ico.check(T.leaf, 14)}
                  {active && (
                    <div className="spinner" style={{
                      width: 12, height: 12, borderRadius:'50%',
                      border: `2px solid ${T.amber}`, borderTopColor:'transparent',
                    }} />
                  )}
                  {idle && <div style={{ width: 5, height: 5, borderRadius:'50%', background: T.textMute }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: T.sans, fontSize: 15, fontWeight: 600,
                    color: done ? T.textMute : T.text,
                    textDecoration: done ? 'line-through' : 'none',
                    textDecorationColor: 'rgba(75,90,75,0.4)',
                  }}>
                    {s.label}
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, marginTop: 2, letterSpacing: 0.4 }}>
                    {s.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:'auto', textAlign:'center' }}>
          <div style={{
            fontFamily: T.mono, fontSize: 10, color: T.textMute,
            letterSpacing: 1.2, textTransform:'uppercase',
          }}>
            ~ a few seconds ~
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 0.9s linear infinite; }
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .scanline { animation: scan 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ─── REPORT ──────────────────────────────────────────────────
function Report({ go, tw, plantId }) {
  const plant = RECENT.find(p => p.id === plantId) || RECENT[0];
  const symptoms = tw.cameraSymptom !== undefined ? tw.cameraSymptom : plant.symptom;
  const hasSymptom = symptoms && symptoms !== 'None';
  const confidence = tw.confidence ?? plant.confidence;

  return (
    <div style={{ position:'relative', height:'100%', background: T.bg, color: T.text, overflow:'auto' }}>
      <GrainOverlay opacity={0.35}/>

      <div style={{
        position:'sticky', top: 0, zIndex: 10,
        padding:'56px 16px 12px', display:'flex', alignItems:'center', justifyContent:'space-between',
        background: `linear-gradient(180deg, ${T.bg} 70%, transparent)`,
      }}>
        <button onClick={() => go('plants')} style={{
          width:36, height:36, borderRadius:'50%', cursor:'pointer',
          background: T.bgRaise, border:`1px solid ${T.line}`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{Ico.back(T.text, 18)}</button>
        <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase' }}>
          Care report
        </div>
        <button style={{
          width:36, height:36, borderRadius:'50%', cursor:'pointer',
          background: T.bgRaise, border:`1px solid ${T.line}`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{Ico.more(T.text, 18)}</button>
      </div>

      <div style={{ padding: '0 24px 32px' }}>
        <div style={{ display:'flex', gap: 16, alignItems:'flex-start' }}>
          <PlantPlaceholder size={88} label={plant.name.split(' ')[0].toUpperCase()} tone="mint"/>
          <div style={{ flex: 1, paddingTop: 4 }}>
            <div style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textSoft, letterSpacing: 0.2 }}>
              {plant.common}
            </div>
            <h1 style={{
              fontFamily: T.serif, fontStyle:'italic', fontWeight: 400, fontSize: 28,
              color: T.text, margin: '4px 0 10px', lineHeight: 1.05, letterSpacing: -0.3,
            }}>
              {plant.name.split(' ')[0]}<br/>{plant.name.split(' ').slice(1).join(' ')}
            </h1>
            <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
              <Pill kind="leaf">
                <div style={{ width:5, height:5, borderRadius:'50%', background: T.leaf }}/>
                {confidence}% match
              </Pill>
              <Pill>Easy</Pill>
            </div>
          </div>
        </div>

        {/* Diagnosis card */}
        {hasSymptom && (
          <div style={{
            marginTop: 20, position:'relative',
            background: `linear-gradient(135deg, ${T.amberSoft} 0%, #FAF0DC 100%)`,
            border: `1px solid ${T.amberLine}`,
            borderRadius: 18, padding: '18px 18px 20px',
            boxShadow: `0 4px 14px rgba(184,132,46,0.10)`,
            overflow:'hidden',
          }}>
            <div style={{
              position:'absolute', top:0, left:0, right:0, height: 1,
              background: `linear-gradient(90deg, transparent, ${T.amber}80, transparent)`,
            }}/>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                {Ico.alert(T.amberDeep, 18)}
                <div style={{ fontFamily: T.serif, fontStyle:'italic', fontSize: 18, color: T.amberDeep, fontWeight: 400 }}>
                  Diagnosis
                </div>
              </div>
              <div style={{
                display:'flex', alignItems:'center', gap: 5,
                fontFamily: T.mono, fontSize: 9.5, color: T.amberDeep, opacity: 0.85,
                letterSpacing: 1.2, textTransform:'uppercase',
                padding:'4px 8px', borderRadius: 6,
                background: 'rgba(184,132,46,0.1)', border:`1px solid ${T.amberLine}`,
              }}>
                reasoning
              </div>
            </div>

            <div style={{ fontFamily: T.sans, fontSize: 13, color: T.amberDeep, fontWeight: 700, marginBottom: 8 }}>
              {symptoms} · likely <span style={{ color: T.text }}>overwatering or low humidity</span>
            </div>

            <p style={{
              fontFamily: T.sans, fontSize: 14, lineHeight: 1.55,
              color: T.text, margin: 0, textWrap:'pretty',
            }}>
              The {symptoms.toLowerCase()} on your {plant.name.split(' ')[0]} most often signal <em>overwatering</em>.
              Check the top 2&nbsp;inches of soil — if it's still damp from your last watering,
              hold off and let it dry. Aerial roots and drainage matter more than schedule.
            </p>

            <div style={{
              marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.amberLine}`,
              display:'flex', justifyContent:'space-between', alignItems:'center',
              fontFamily: T.mono, fontSize: 10.5, color: T.amberDeep, opacity: 0.8,
              letterSpacing: 0.6,
            }}>
              <span>Confidence: moderate</span>
              <span>Re-scan in 7 days →</span>
            </div>
          </div>
        )}

        {/* Care grid */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4,
            textTransform:'uppercase', marginBottom: 12,
          }}>
            Care guide
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
            <CareCell icon={Ico.drop(T.pine, 18)}    label="Water"    value="Weekly"          hint="when top 2 in. dry"/>
            <CareCell icon={Ico.sun(T.amber, 18)}    label="Light"    value="Bright indirect" hint="east window ideal"/>
            <CareCell icon={Ico.soil(T.text, 18)}    label="Soil"     value="Aroid mix"       hint="bark, perlite, peat"/>
            <CareCell icon={Ico.humid(T.leaf, 18)}   label="Humidity" value="60–80%"          hint="mist or pebble tray"/>
          </div>
        </div>

        {/* Health tips */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4,
            textTransform:'uppercase', marginBottom: 8,
          }}>
            Health tips
          </div>
          <div style={{
            background: T.bgRaise, borderRadius: 16, padding: '4px 16px',
            border: `1px solid ${T.line}`,
          }}>
            {[
              'Wipe leaves monthly to keep pores clear',
              'Rotate quarter-turn weekly for even growth',
              'Provide a moss pole — climbers fenestrate faster',
              'Repot every 2 years; prefers being slightly root-bound',
            ].map((tip, i, arr) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap: 12, padding: '14px 0',
                borderBottom: i < arr.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  background: T.bgMint,
                  border: `1px solid rgba(92,138,92,0.3)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily: T.serif, fontStyle:'italic', fontSize: 12, color: T.pine,
                }}>{i+1}</div>
                <div style={{ fontFamily: T.sans, fontSize: 13.5, color: T.text, lineHeight: 1.4 }}>
                  {tip}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button style={{
          marginTop: 20, width:'100%', height: 52, cursor:'pointer',
          background: T.bgRaise, color: T.text, border:`1px solid ${T.line}`,
          borderRadius: 14, fontFamily: T.sans, fontSize: 14, fontWeight: 600,
        }}>
          + Save to my plants
        </button>
      </div>
    </div>
  );
}

function CareCell({ icon, label, value, hint }) {
  return (
    <div style={{
      background: T.bgRaise, border: `1px solid ${T.line}`,
      borderRadius: 16, padding: 14,
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
        {icon}
        <div style={{
          fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: 1.2, textTransform:'uppercase',
        }}>{label}</div>
      </div>
      <div style={{
        fontFamily: T.serif, fontSize: 18, fontWeight: 400,
        color: T.text, lineHeight: 1.1, letterSpacing: -0.2,
      }}>{value}</div>
      <div style={{
        fontFamily: T.sans, fontSize: 11.5, color: T.textSoft, marginTop: 4,
      }}>{hint}</div>
    </div>
  );
}

// ─── Wishlist seed ───────────────────────────────────────────
const WISHLIST_SEED = [
  { id:'w1', name:'Alocasia polly',        common:'African mask plant', note:'Saw at the market', priority:'High'   },
  { id:'w2', name:'Hoya kerrii',           common:'Sweetheart plant',   note:'Gift idea',          priority:'Medium' },
  { id:'w3', name:'Philodendron gloriosum', common:'Velvet leaf',       note:'Trade w/ Dani?',     priority:'Low'    },
];

// ─── MY PLANTS (the hub) ─────────────────────────────────────
function MyPlants({ go }) {
  const [tab, setTab] = useState('plants'); // 'plants' | 'wishlist'
  const [items, setItems] = useState(RECENT);
  const [wishlist, setWishlist] = useState(WISHLIST_SEED);
  const [filter, setFilter] = useState('All');
  const [swipedId, setSwipedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addTarget, setAddTarget] = useState('plants'); // where the sheet adds to
  const dragRef = useRef({ id: null, startX: 0, dx: 0 });

  const filtered = useMemo(() => {
    if (filter === 'Healthy') return items.filter(i => !i.symptom);
    if (filter === 'Flagged') return items.filter(i => i.symptom);
    return items;
  }, [items, filter]);

  const onPointerDown = (e, id) => {
    dragRef.current = { id, startX: e.clientX, dx: 0 };
    e.target.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.id) return;
    d.dx = e.clientX - d.startX;
    const el = document.getElementById('row-' + d.id);
    if (el) el.style.transform = `translateX(${Math.min(0, Math.max(-100, d.dx))}px)`;
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    if (!d.id) return;
    const el = document.getElementById('row-' + d.id);
    if (d.dx < -50) {
      if (el) el.style.transform = `translateX(-92px)`;
      setSwipedId(d.id);
    } else {
      if (el) el.style.transform = `translateX(0)`;
      setSwipedId(null);
    }
    dragRef.current = { id: null, startX: 0, dx: 0 };
  };

  const removePlant = (id) => {
    setItems(items.filter(i => i.id !== id));
    setSwipedId(null);
  };
  const removeWish = (id) => {
    setWishlist(wishlist.filter(i => i.id !== id));
    setSwipedId(null);
  };
  const moveWishToPlants = (id) => {
    const w = wishlist.find(i => i.id === id);
    if (!w) return;
    setWishlist(wishlist.filter(i => i.id !== id));
    setItems([
      { id:'p' + Date.now(), name:w.name, common:w.common, date:'Just added', symptom:null, confidence: null, manual:true },
      ...items,
    ]);
    setSwipedId(null);
  };

  const handleAdd = (entry) => {
    if (entry.target === 'wishlist') {
      setWishlist([{ id:'w' + Date.now(), ...entry, priority: entry.priority || 'Medium' }, ...wishlist]);
      setTab('wishlist');
    } else {
      setItems([{ id:'p' + Date.now(), name: entry.name, common: entry.common, date:'Just added', symptom:null, confidence: null, manual:true, water: entry.water, light: entry.light }, ...items]);
      setTab('plants');
    }
    setShowAdd(false);
  };

  const headerCount = tab === 'plants' ? items.length : wishlist.length;
  const headerLabel = tab === 'plants'
    ? `Saved · ${items.length} ${items.length === 1 ? 'plant' : 'plants'}`
    : `Wishlist · ${wishlist.length} ${wishlist.length === 1 ? 'plant' : 'plants'}`;

  return (
    <div style={{ position:'relative', height:'100%', background: T.bg, color: T.text, overflow:'auto' }}>
      <GrainOverlay opacity={0.35}/>

      <div style={{ padding:'56px 24px 8px' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase' }}>
              {headerLabel}
            </div>
            <h1 style={{
              fontFamily: T.serif, fontWeight: 400, fontSize: 32,
              color: T.text, margin:'8px 0 0', letterSpacing: -0.3,
            }}>
              {tab === 'plants'
                ? <><em style={{ fontStyle:'italic' }}>My</em> plants</>
                : <><em style={{ fontStyle:'italic' }}>Wish</em>list</>}
            </h1>
          </div>
          <div style={{ display:'flex', gap: 8 }}>
            <button onClick={() => { setAddTarget(tab); setShowAdd(true); }} style={{
              width:42, height:42, borderRadius: 14, cursor:'pointer',
              background: T.bgRaise, border:`1px solid ${T.line}`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }} aria-label="Add manually">{Ico.plus(T.text, 22)}</button>
            <button onClick={() => go('camera')} style={{
              width:42, height:42, borderRadius: 14, cursor:'pointer',
              background: T.leaf, border:'none',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: `0 4px 12px rgba(92,138,92,0.3), inset 0 -1px 0 rgba(0,0,0,0.12)`,
            }} aria-label="Scan">{Ico.scan('#FBFAF3', 22)}</button>
          </div>
        </div>

        {/* Plants / Wishlist segmented control */}
        <div style={{
          marginTop: 18, display:'flex', padding: 4, borderRadius: 14,
          background: T.bgRaise, border:`1px solid ${T.line}`,
        }}>
          {[
            { id:'plants',   label:'Plants',   count: items.length },
            { id:'wishlist', label:'Wishlist', count: wishlist.length },
          ].map(s => {
            const active = tab === s.id;
            return (
              <button key={s.id} onClick={() => { setTab(s.id); setSwipedId(null); }} style={{
                flex:1, height:36, cursor:'pointer', border:'none',
                borderRadius: 10, fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                background: active ? T.text : 'transparent',
                color: active ? T.bg : T.textSoft,
                display:'flex', alignItems:'center', justifyContent:'center', gap: 7,
              }}>
                {s.id === 'wishlist' && Ico.bookmark(active ? T.bg : T.textSoft, 14)}
                {s.label}
                <span style={{
                  fontFamily: T.mono, fontSize: 10, opacity: 0.65,
                }}>{s.count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters only on Plants tab */}
        {tab === 'plants' && (
          <div style={{ display:'flex', gap: 6, marginTop: 14 }}>
            {['All', 'Healthy', 'Flagged'].map((f) => {
              const active = f === filter;
              return (
                <button key={f} onClick={() => setFilter(f)} style={{
                  height: 30, padding: '0 12px', cursor:'pointer',
                  borderRadius: 999, fontFamily: T.sans, fontSize: 11.5, fontWeight: 600,
                  background: active ? T.bgMint : 'transparent',
                  color: active ? T.pine : T.textMute,
                  border: active ? `1px solid rgba(92,138,92,0.35)` : `1px solid ${T.lineSoft}`,
                }}>{f}</button>
              );
            })}
          </div>
        )}
      </div>

      {/* PLANTS LIST */}
      {tab === 'plants' && (
        <div style={{ padding: '12px 12px 120px' }}>
          {filtered.length === 0 && (
            <EmptyState
              title="No plants yet"
              body="Scan one with the camera, or add manually if you already know the species."
              cta="Add a plant"
              onCta={() => { setAddTarget('plants'); setShowAdd(true); }}
            />
          )}
          {filtered.map(p => (
            <div key={p.id} style={{
              position:'relative', borderRadius: 14, marginBottom: 6, overflow:'hidden',
            }}>
              <div style={{
                position:'absolute', right: 0, top: 0, bottom: 0, width: 92,
                background: '#A84545', display:'flex', alignItems:'center', justifyContent:'center',
                borderRadius: 14,
              }}>
                <button onClick={() => removePlant(p.id)} style={{
                  background:'none', border:'none', cursor:'pointer',
                  display:'flex', flexDirection:'column', alignItems:'center', gap: 4,
                  color:'#fff', fontFamily: T.sans, fontSize: 11, fontWeight: 600,
                }}>
                  {Ico.trash('#fff', 18)} Delete
                </button>
              </div>

              <div id={'row-' + p.id}
                   onPointerDown={(e) => onPointerDown(e, p.id)}
                   onPointerMove={onPointerMove}
                   onPointerUp={onPointerUp}
                   onPointerCancel={onPointerUp}
                   onClick={() => {
                     if (Math.abs(dragRef.current.dx) > 5) return;
                     if (swipedId === p.id) return;
                     if (!p.manual) go('report', p.id);
                   }}
                   style={{
                position:'relative', display:'flex', alignItems:'center', gap: 14,
                padding: '12px 14px', cursor:'pointer',
                background: T.bgRaise, border:`1px solid ${T.line}`,
                borderRadius: 14, transition: swipedId === p.id ? 'none' : 'transform 0.25s',
                touchAction: 'pan-y',
              }}>
                <PlantPlaceholder size={56} label={p.name.split(' ')[0].toUpperCase()} tone="mint"/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: T.serif, fontStyle:'italic', fontSize: 16,
                    color: T.text, lineHeight: 1.1, letterSpacing: -0.1,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>{p.name}</div>
                  <div style={{
                    fontFamily: T.sans, fontSize: 12.5, color: T.textSoft, marginTop: 3,
                  }}>{p.common}</div>
                  <div style={{ display:'flex', alignItems:'center', gap: 8, marginTop: 8, flexWrap:'wrap' }}>
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: 0.6 }}>
                      {p.date.toUpperCase()}
                    </span>
                    {p.manual ? (
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap: 4,
                        padding:'2px 8px', borderRadius: 999, fontFamily: T.sans, fontSize: 10.5,
                        fontWeight: 600, color: T.textSoft,
                        background: T.bgSage, border:`1px solid rgba(143,169,136,0.4)`,
                      }}>Manual</span>
                    ) : p.symptom ? (
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap: 4,
                        padding:'2px 8px', borderRadius: 999, fontFamily: T.sans, fontSize: 10.5,
                        fontWeight: 600, color: T.amberDeep,
                        background: T.amberSoft, border:`1px solid ${T.amberLine}`,
                      }}>
                        <div style={{ width:4, height:4, borderRadius:'50%', background: T.amber }}/>
                        {p.symptom}
                      </span>
                    ) : (
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap: 4,
                        padding:'2px 8px', borderRadius: 999, fontFamily: T.sans, fontSize: 10.5,
                        fontWeight: 600, color: T.pine,
                        background: T.bgMint, border:`1px solid rgba(92,138,92,0.3)`,
                      }}>
                        <div style={{ width:4, height:4, borderRadius:'50%', background: T.leaf }}/>
                        Healthy
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color: T.textMute, paddingRight: 4 }}>{Ico.chevron(T.textMute, 18)}</div>
              </div>
            </div>
          ))}

          {filtered.length > 0 && (
            <div style={{
              marginTop: 16, textAlign:'center',
              fontFamily: T.mono, fontSize: 10, color: T.textMute, opacity: 0.7,
              letterSpacing: 1.2, textTransform:'uppercase',
            }}>
              ← swipe to delete
            </div>
          )}
        </div>
      )}

      {/* WISHLIST */}
      {tab === 'wishlist' && (
        <div style={{ padding: '12px 12px 120px' }}>
          {wishlist.length === 0 && (
            <EmptyState
              title="Your wishlist is empty"
              body="Save plants you’re hunting for. We won’t scan or query — just keep the list for you."
              cta="Add to wishlist"
              onCta={() => { setAddTarget('wishlist'); setShowAdd(true); }}
            />
          )}
          {wishlist.map(p => {
            const tone = { High: 'amber', Medium: 'sage', Low: 'default' }[p.priority] || 'sage';
            return (
              <div key={p.id} style={{
                position:'relative', borderRadius: 14, marginBottom: 6, overflow:'hidden',
              }}>
                <div style={{
                  position:'absolute', right: 0, top: 0, bottom: 0, width: 92,
                  background: '#A84545', display:'flex', alignItems:'center', justifyContent:'center',
                  borderRadius: 14,
                }}>
                  <button onClick={() => removeWish(p.id)} style={{
                    background:'none', border:'none', cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center', gap: 4,
                    color:'#fff', fontFamily: T.sans, fontSize: 11, fontWeight: 600,
                  }}>
                    {Ico.trash('#fff', 18)} Remove
                  </button>
                </div>

                <div id={'row-' + p.id}
                     onPointerDown={(e) => onPointerDown(e, p.id)}
                     onPointerMove={onPointerMove}
                     onPointerUp={onPointerUp}
                     onPointerCancel={onPointerUp}
                     style={{
                  position:'relative', display:'flex', alignItems:'center', gap: 14,
                  padding: '12px 14px',
                  background: T.bgRaise, border:`1px solid ${T.line}`,
                  borderRadius: 14, transition: swipedId === p.id ? 'none' : 'transform 0.25s',
                  touchAction: 'pan-y',
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                    background: T.bgSage, border: `1px dashed rgba(92,138,92,0.5)`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {Ico.bookmark(T.pine, 22)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.serif, fontStyle:'italic', fontSize: 16,
                      color: T.text, lineHeight: 1.1, letterSpacing: -0.1,
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    }}>{p.name}</div>
                    <div style={{
                      fontFamily: T.sans, fontSize: 12.5, color: T.textSoft, marginTop: 3,
                    }}>{p.common}</div>
                    <div style={{ display:'flex', alignItems:'center', gap: 8, marginTop: 8, flexWrap:'wrap' }}>
                      <Pill kind={tone} style={{ padding:'2px 8px', fontSize: 10.5, textTransform:'none', letterSpacing: 0.2 }}>
                        {p.priority} priority
                      </Pill>
                      {p.note && (
                        <span style={{
                          fontFamily: T.sans, fontSize: 11.5, color: T.textMute,
                          fontStyle:'italic',
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth: 130,
                        }}>“{p.note}”</span>
                      )}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); moveWishToPlants(p.id); }} style={{
                    background: T.bgMint, border: `1px solid rgba(92,138,92,0.4)`,
                    borderRadius: 10, padding: '6px 10px', cursor:'pointer',
                    fontFamily: T.sans, fontSize: 10.5, fontWeight: 700, color: T.pine,
                    letterSpacing: 0.4,
                  }} aria-label="Got it">GOT IT</button>
                </div>
              </div>
            );
          })}

          {wishlist.length > 0 && (
            <div style={{
              marginTop: 16, textAlign:'center',
              fontFamily: T.mono, fontSize: 10, color: T.textMute, opacity: 0.7,
              letterSpacing: 1.2, textTransform:'uppercase',
            }}>
              tap “Got it” to move into your plants
            </div>
          )}
        </div>
      )}

      {/* ADD-MANUALLY SHEET */}
      {showAdd && (
        <AddManuallySheet
          defaultTarget={addTarget}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
        />
      )}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────
function EmptyState({ title, body, cta, onCta }) {
  return (
    <div style={{
      margin: '24px 12px', padding: '32px 24px',
      background: T.bgRaise, border: `1px dashed ${T.line}`, borderRadius: 18,
      textAlign:'center',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px',
        background: T.bgSage, display:'flex', alignItems:'center', justifyContent:'center',
      }}>{Ico.leaf(T.pine, 24)}</div>
      <div style={{ fontFamily: T.serif, fontStyle:'italic', fontSize: 20, color: T.text }}>{title}</div>
      <div style={{ fontFamily: T.sans, fontSize: 13, color: T.textSoft, marginTop: 8, lineHeight: 1.5 }}>
        {body}
      </div>
      <button onClick={onCta} style={{
        marginTop: 16, height: 40, padding: '0 20px', cursor:'pointer',
        background: T.text, color: T.bg, border:'none', borderRadius: 12,
        fontFamily: T.sans, fontSize: 13, fontWeight: 600,
      }}>{cta}</button>
    </div>
  );
}

// ─── Add Manually Sheet ──────────────────────────────────────
function AddManuallySheet({ defaultTarget = 'plants', onClose, onSubmit }) {
  const [target, setTarget] = useState(defaultTarget);
  const [name, setName] = useState('');
  const [common, setCommon] = useState('');
  const [water, setWater] = useState('');
  const [light, setLight] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setMounted(false);
    setTimeout(onClose, 220);
  };

  const canSubmit = name.trim().length > 0;
  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      target,
      name: name.trim(),
      common: common.trim() || '—',
      water: water || null,
      light: light || null,
      note: note.trim() || null,
      priority,
    });
  };

  return (
    <div style={{
      position:'absolute', inset: 0, zIndex: 50,
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }}>
      {/* scrim */}
      <div onClick={close} style={{
        position:'absolute', inset: 0,
        background: 'rgba(15, 26, 18, 0.45)',
        opacity: mounted ? 1 : 0, transition: 'opacity 220ms ease',
      }}/>

      {/* sheet */}
      <div style={{
        position:'relative', width:'100%',
        background: T.bg,
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 -12px 30px rgba(15,26,18,0.18)',
        transform: mounted ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.2, 0.9, 0.25, 1)',
        maxHeight: '88%', overflowY:'auto',
      }}>
        {/* grip */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.line }}/>
        </div>

        <div style={{ padding: '12px 22px 28px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 4 }}>
            <div>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase' }}>
                No scan needed
              </div>
              <h2 style={{
                fontFamily: T.serif, fontWeight: 400, fontSize: 26, margin: '6px 0 0',
                color: T.text, letterSpacing: -0.3,
              }}>
                Add <em style={{ fontStyle:'italic' }}>manually</em>
              </h2>
            </div>
            <button onClick={close} style={{
              width: 36, height: 36, borderRadius: 12, cursor:'pointer',
              background: T.bgRaise, border:`1px solid ${T.line}`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }} aria-label="Close">{Ico.close(T.text, 18)}</button>
          </div>

          {/* Destination toggle */}
          <FieldLabel>Where to save</FieldLabel>
          <div style={{
            display:'flex', padding: 4, borderRadius: 12,
            background: T.bgRaise, border:`1px solid ${T.line}`, marginBottom: 4,
          }}>
            {[
              { id:'plants',   label:'My plants' },
              { id:'wishlist', label:'Wishlist' },
            ].map(opt => {
              const active = target === opt.id;
              return (
                <button key={opt.id} onClick={() => setTarget(opt.id)} style={{
                  flex: 1, height: 34, cursor:'pointer', border:'none',
                  borderRadius: 8, fontFamily: T.sans, fontSize: 12.5, fontWeight: 600,
                  background: active ? T.text : 'transparent',
                  color: active ? T.bg : T.textSoft,
                }}>{opt.label}</button>
              );
            })}
          </div>

          {/* Name */}
          <FieldLabel>Plant name <Required/></FieldLabel>
          <Input value={name} onChange={setName} placeholder="e.g. Monstera deliciosa" autoFocus serif italic/>

          {/* Common name */}
          <FieldLabel>Common name <Optional/></FieldLabel>
          <Input value={common} onChange={setCommon} placeholder="e.g. Swiss cheese plant"/>

          {target === 'plants' ? (
            <>
              <FieldLabel>What you know <Optional/></FieldLabel>
              <div style={{ display:'flex', gap: 8 }}>
                <SelectChips
                  options={['', 'Low', 'Medium', 'High']}
                  labels={{ '': 'Water —', 'Low':'Low water', 'Medium':'Med water', 'High':'High water' }}
                  value={water} onChange={setWater}
                  flex
                />
              </div>
              <div style={{ display:'flex', gap: 8, marginTop: 8 }}>
                <SelectChips
                  options={['', 'Low', 'Bright indirect', 'Direct']}
                  labels={{ '': 'Light —', 'Low':'Low light', 'Bright indirect':'Bright indirect', 'Direct':'Direct sun' }}
                  value={light} onChange={setLight}
                  flex
                />
              </div>
              <div style={{
                marginTop: 12, padding: '10px 12px',
                background: T.bgSage, border:`1px solid rgba(143,169,136,0.4)`,
                borderRadius: 10, display:'flex', gap: 10, alignItems:'flex-start',
              }}>
                {Ico.leaf(T.pine, 16)}
                <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.pine, lineHeight: 1.45 }}>
                  Adding what you already know means we won’t query the AI for this plant unless you ask for a diagnosis later.
                </div>
              </div>
            </>
          ) : (
            <>
              <FieldLabel>Priority</FieldLabel>
              <div style={{ display:'flex', gap: 6 }}>
                {['Low', 'Medium', 'High'].map(p => {
                  const active = priority === p;
                  return (
                    <button key={p} onClick={() => setPriority(p)} style={{
                      flex: 1, height: 38, cursor:'pointer', borderRadius: 10,
                      background: active ? T.text : T.bgRaise,
                      color: active ? T.bg : T.textSoft,
                      border: active ? 'none' : `1px solid ${T.line}`,
                      fontFamily: T.sans, fontSize: 12.5, fontWeight: 600,
                    }}>{p}</button>
                  );
                })}
              </div>

              <FieldLabel>Note <Optional/></FieldLabel>
              <Input value={note} onChange={setNote} placeholder="e.g. Saw at the nursery"/>
            </>
          )}

          <div style={{ display:'flex', gap: 8, marginTop: 22 }}>
            <button onClick={close} style={{
              flex: 1, height: 50, cursor:'pointer', borderRadius: 14,
              background: 'transparent', color: T.textSoft,
              border:`1px solid ${T.line}`,
              fontFamily: T.sans, fontSize: 14, fontWeight: 600,
            }}>Cancel</button>
            <button onClick={submit} disabled={!canSubmit} style={{
              flex: 2, height: 50, cursor: canSubmit ? 'pointer' : 'not-allowed',
              borderRadius: 14, border:'none',
              background: canSubmit
                ? `linear-gradient(180deg, ${T.leaf}, ${T.pine})`
                : 'rgba(31,58,40,0.15)',
              color: canSubmit ? '#FBFAF3' : T.textMute,
              fontFamily: T.sans, fontSize: 14, fontWeight: 700,
              boxShadow: canSubmit ? `0 4px 12px rgba(46,82,56,0.25)` : 'none',
              letterSpacing: 0.3,
            }}>
              {target === 'plants' ? 'Add to my plants' : 'Add to wishlist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontFamily: T.mono, fontSize: 10, color: T.textMute,
      letterSpacing: 1.2, textTransform:'uppercase',
      marginTop: 18, marginBottom: 8,
      display:'flex', alignItems:'center', gap: 6,
    }}>{children}</div>
  );
}
function Required() {
  return <span style={{ color: T.amber, fontFamily: T.sans, textTransform:'none', letterSpacing: 0 }}>required</span>;
}
function Optional() {
  return <span style={{ color: T.textMute, fontFamily: T.sans, textTransform:'none', letterSpacing: 0, opacity: 0.7 }}>optional</span>;
}
function Input({ value, onChange, placeholder, autoFocus, serif, italic }) {
  return (
    <input
      value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} autoFocus={autoFocus}
      style={{
        width:'100%', height: 48, boxSizing:'border-box',
        padding: '0 14px', borderRadius: 12,
        background: T.bgRaise, border: `1px solid ${T.line}`,
        fontFamily: serif ? T.serif : T.sans,
        fontStyle: italic ? 'italic' : 'normal',
        fontSize: serif ? 17 : 14, color: T.text,
        outline:'none',
      }}
      onFocus={(e) => e.target.style.borderColor = T.leaf}
      onBlur={(e) => e.target.style.borderColor = T.line}
    />
  );
}
function SelectChips({ options, labels, value, onChange, flex }) {
  return (
    <div style={{ display:'flex', gap: 6, flex: flex ? 1 : undefined, flexWrap:'wrap' }}>
      {options.map(o => {
        const active = value === o;
        const display = labels[o] || o || '—';
        return (
          <button key={o || 'none'} onClick={() => onChange(o)} style={{
            height: 36, padding: '0 12px', cursor:'pointer',
            borderRadius: 10, fontFamily: T.sans, fontSize: 12, fontWeight: 600,
            background: active ? T.bgMint : T.bgRaise,
            color: active ? T.pine : T.textSoft,
            border: active ? `1px solid rgba(92,138,92,0.4)` : `1px solid ${T.line}`,
            flex: flex ? 1 : undefined, whiteSpace:'nowrap',
          }}>{display}</button>
        );
      })}
    </div>
  );
}

// ─── GARDEN (calendar / care reminders) ──────────────────────
function Garden({ go }) {
  const days = ['M','T','W','T','F','S','S'];
  const today = 1; // index
  const tasks = [
    { plant:'Monstera deliciosa', task:'Water', when:'Today',     due:true,  tone:'amber' },
    { plant:'Snake plant',        task:'Check soil', when:'Today', due:false, tone:'leaf' },
    { plant:'Fiddle leaf fig',    task:'Mist leaves', when:'Tomorrow', due:false, tone:'leaf' },
    { plant:'Pothos',             task:'Rotate', when:'Wed',      due:false, tone:'leaf' },
    { plant:'Calathea',           task:'Repot',  when:'Sat',      due:false, tone:'leaf' },
  ];
  return (
    <div style={{ position:'relative', height:'100%', background: T.bg, color: T.text, overflow:'auto' }}>
      <GrainOverlay opacity={0.35}/>
      <div style={{ padding:'56px 24px 120px' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase' }}>
          April · Week 17
        </div>
        <h1 style={{
          fontFamily: T.serif, fontWeight: 400, fontSize: 32, color: T.text,
          margin:'8px 0 0', letterSpacing: -0.3,
        }}>
          <em style={{ fontStyle:'italic' }}>The</em> garden
        </h1>

        {/* Week strip */}
        <div style={{
          marginTop: 22, padding: 14, borderRadius: 18,
          background: T.bgRaise, border: `1px solid ${T.line}`,
        }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: 4 }}>
            {days.map((d, i) => {
              const active = i === today;
              const has = [0,1,2,5].includes(i);
              return (
                <div key={i} style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap: 6, padding: 8,
                  borderRadius: 12,
                  background: active ? T.text : 'transparent',
                  color: active ? T.bg : T.text,
                }}>
                  <div style={{ fontFamily: T.mono, fontSize: 9.5, opacity: 0.6, letterSpacing: 0.6 }}>{d}</div>
                  <div style={{ fontFamily: T.serif, fontSize: 18 }}>{27 + i - today}</div>
                  <div style={{
                    width: 4, height: 4, borderRadius:'50%',
                    background: has ? (active ? T.mint : T.leaf) : 'transparent',
                  }}/>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase', marginBottom: 12 }}>
            Care plan
          </div>
          {tasks.map((t, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap: 14,
              padding: 14, borderRadius: 14, marginBottom: 8,
              background: T.bgRaise, border: `1px solid ${T.line}`,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: t.tone === 'amber' ? T.amberSoft : T.bgMint,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: t.tone === 'amber' ? T.amberDeep : T.pine,
              }}>
                {t.task === 'Water' && Ico.drop(t.tone === 'amber' ? T.amberDeep : T.pine, 18)}
                {t.task === 'Mist leaves' && Ico.humid(T.pine, 18)}
                {t.task !== 'Water' && t.task !== 'Mist leaves' && Ico.leaf(T.pine, 18)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.text }}>
                  {t.task} · <span style={{ fontStyle:'italic', fontFamily: T.serif, fontWeight: 400 }}>{t.plant}</span>
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, marginTop: 4, letterSpacing: 0.6, textTransform:'uppercase' }}>
                  {t.when}
                </div>
              </div>
              <button style={{
                width: 28, height: 28, borderRadius:'50%', cursor:'pointer',
                background: 'transparent',
                border: `1.5px solid ${t.due ? T.leaf : T.line}`,
              }}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE / YOU ───────────────────────────────────────────
function Profile({ go }) {
  return (
    <div style={{ position:'relative', height:'100%', background: T.bg, color: T.text, overflow:'auto' }}>
      <GrainOverlay opacity={0.35}/>
      <div style={{
        position:'absolute', top:0, left:0, right:0, height: 280,
        background: `linear-gradient(180deg, ${T.bgMint} 0%, ${T.bg} 100%)`,
      }}/>

      <div style={{ position:'relative', padding:'56px 24px 120px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase' }}>
            Profile
          </div>
          <button style={{
            width:36, height:36, borderRadius:'50%', cursor:'pointer',
            background: T.bgRaise, border:`1px solid ${T.line}`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{Ico.settings(T.text, 18)}</button>
        </div>

        {/* Avatar */}
        <div style={{ marginTop: 18, display:'flex', alignItems:'center', gap: 16 }}>
          <div style={{
            width: 84, height: 84, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${T.leaf}, ${T.pine})`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily: T.serif, fontStyle:'italic', fontSize: 36, color: '#FBFAF3',
            border: `3px solid ${T.bgRaise}`,
            boxShadow: `0 6px 18px rgba(46,82,56,0.18)`,
          }}>K</div>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: T.serif, fontWeight: 400, fontSize: 24,
              color: T.text, margin: 0, letterSpacing: -0.3,
            }}>Kai Nakamura</h1>
            <div style={{ fontFamily: T.sans, fontSize: 13, color: T.textSoft, marginTop: 4 }}>
              kai@plantmail.co
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.leaf, marginTop: 6, letterSpacing: 0.6, textTransform:'uppercase' }}>
              ✦ green thumb · since 2024
            </div>
          </div>
        </div>

        {/* Stats card */}
        <div style={{
          marginTop: 22, padding: 18, borderRadius: 18,
          background: T.bgRaise, border:`1px solid ${T.line}`,
        }}>
          <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase', marginBottom: 14 }}>
            Garden stats
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 12 }}>
            <ProfStat n="42" l="scans" />
            <ProfStat n="6" l="plants saved" />
            <ProfStat n="89%" l="healthy rate" />
          </div>
        </div>

        {/* Achievement strip */}
        <div style={{ marginTop: 16, display:'flex', gap: 8 }}>
          {[
            { ico: Ico.trophy(T.pine, 16),  label:'7-day streak', tone:'mint' },
            { ico: Ico.leaf(T.pine, 16),    label:'First scan',   tone:'sage' },
            { ico: Ico.drop(T.amberDeep, 16), label:'Plant saver',  tone:'amber' },
          ].map((a, i) => (
            <div key={i} style={{
              flex: 1, padding: 12, borderRadius: 12,
              background: a.tone === 'amber' ? T.amberSoft : a.tone === 'sage' ? T.bgSage : T.bgMint,
              border: `1px solid ${T.line}`,
              display:'flex', flexDirection:'column', alignItems:'flex-start', gap: 6,
            }}>
              {a.ico}
              <div style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.text }}>{a.label}</div>
            </div>
          ))}
        </div>

        {/* Settings list */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textMute, letterSpacing: 1.4, textTransform:'uppercase', marginBottom: 8 }}>
            Account
          </div>
          <div style={{
            background: T.bgRaise, borderRadius: 16, border: `1px solid ${T.line}`,
            padding: '4px 4px',
          }}>
            <SettingRow icon={Ico.bell(T.text, 18)}     label="Watering reminders" trail="On"/>
            <SettingRow icon={Ico.reminder(T.text, 18)} label="Care schedule"      trail="Weekly"/>
            <SettingRow icon={Ico.share(T.text, 18)}    label="Share my garden"    trail=""/>
            <SettingRow icon={Ico.user(T.text, 18)}     label="Edit profile"       trail=""/>
            <SettingRow icon={Ico.settings(T.text, 18)} label="App settings"       trail="" last/>
          </div>
        </div>

        <button style={{
          marginTop: 14, width:'100%', height: 48, cursor:'pointer',
          background: 'transparent', color: T.textSoft, border:`1px solid ${T.line}`,
          borderRadius: 12, fontFamily: T.sans, fontSize: 13, fontWeight: 600,
        }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

function ProfStat({ n, l }) {
  return (
    <div>
      <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 400, color: T.text, lineHeight: 1, letterSpacing: -0.3 }}>{n}</div>
      <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, marginTop: 6, letterSpacing: 0.8, textTransform:'uppercase' }}>{l}</div>
    </div>
  );
}

function SettingRow({ icon, label, trail, last }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap: 12,
      padding: '14px 14px', borderRadius: 12,
      borderBottom: last ? 'none' : `1px solid ${T.lineSoft}`,
      cursor:'pointer',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: T.bgSage, display:'flex', alignItems:'center', justifyContent:'center',
      }}>{icon}</div>
      <div style={{ flex: 1, fontFamily: T.sans, fontSize: 14, color: T.text, fontWeight: 500 }}>{label}</div>
      {trail && <div style={{ fontFamily: T.sans, fontSize: 12, color: T.textMute }}>{trail}</div>}
      {Ico.chevron(T.textMute, 16)}
    </div>
  );
}

// ─── BOTTOM TAB BAR ──────────────────────────────────────────
function TabBar({ active, go }) {
  const tabs = [
    { id: 'home',    icon: Ico.home,   label: 'Home' },
    { id: 'plants',  icon: Ico.list,   label: 'Plants' },
    { id: 'camera',  icon: Ico.scan,   label: 'Scan',   primary: true },
    { id: 'garden',  icon: Ico.garden, label: 'Garden' },
    { id: 'profile', icon: Ico.user,   label: 'You' },
  ];

  return (
    <div style={{
      position:'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 24,
      background: `linear-gradient(180deg, transparent, ${T.bg} 60%)`,
      pointerEvents:'none',
    }}>
      <div style={{
        margin: '0 12px', height: 64, borderRadius: 22,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter:'blur(20px) saturate(160%)',
        WebkitBackdropFilter:'blur(20px) saturate(160%)',
        border: `1px solid ${T.line}`,
        boxShadow: `0 8px 24px rgba(31,58,40,0.10), inset 0 1px 0 rgba(255,255,255,0.8)`,
        display:'flex', alignItems:'center', justifyContent:'space-around',
        padding:'0 8px', pointerEvents:'auto',
      }}>
        {tabs.map(t => {
          const isActive = active === t.id;
          if (t.primary) {
            return (
              <button key={t.id} onClick={() => go(t.id)} style={{
                width: 50, height: 50, borderRadius:'50%',
                background: `linear-gradient(180deg, ${T.leaf}, ${T.pine})`,
                border:'none', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: `0 6px 14px rgba(46,82,56,0.35), inset 0 -2px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25)`,
                marginTop: -16, position:'relative',
              }}>
                {t.icon('#FBFAF3', 22)}
              </button>
            );
          }
          return (
            <button key={t.id} onClick={() => go(t.id)} style={{
              flex: 1, height: '100%', background:'none', border:'none', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 3,
              fontFamily: T.sans, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.4,
              color: isActive ? T.pine : T.textMute,
            }}>
              {t.icon(isActive ? T.pine : T.textMute, 22)}
              <div>{t.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── App shell ───────────────────────────────────────────────
function GreenThumbsApp({ tw, setTw }) {
  const [screen, setScreen] = useState(tw.startScreen || 'home');
  const [reportPlantId, setReportPlantId] = useState('p1');

  useEffect(() => {
    if (tw.startScreen && tw.startScreen !== screen) setScreen(tw.startScreen);
  }, [tw.startScreen]);

  const go = (s, plantId) => {
    if (plantId) setReportPlantId(plantId);
    setScreen(s);
  };

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden', background: T.bg }}>
      <div style={{ position:'absolute', inset: 0 }}>
        {screen === 'home'      && <Home      go={go}/>}
        {screen === 'camera'    && <Camera    go={go} tw={tw} setTw={setTw}/>}
        {screen === 'analyzing' && <Analyzing go={go}/>}
        {screen === 'report'    && <Report    go={go} tw={tw} plantId={reportPlantId}/>}
        {screen === 'plants'    && <MyPlants  go={go}/>}
        {screen === 'garden'    && <Garden    go={go}/>}
        {screen === 'profile'   && <Profile   go={go}/>}
      </div>
      {screen !== 'camera' && screen !== 'analyzing' && (
        <TabBar active={screen} go={go} />
      )}
    </div>
  );
}

window.GreenThumbsApp = GreenThumbsApp;
window.GT_T = T;
