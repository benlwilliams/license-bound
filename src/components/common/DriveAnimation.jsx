/**
 * Side-view driving animation for the live session screen.
 * Camera is locked on the car — road markings and background elements scroll past.
 */

function Wheel({ cx, cy, paused = false }) {
  return (
    <g>
      {/* Tire */}
      <circle cx={cx} cy={cy} r={13} fill="#1a1a2e" />
      {/* Rim ring */}
      <circle cx={cx} cy={cy} r={10} fill="#2d2d44" />
      {/* Spinning spokes */}
      <g>
        <line x1={cx - 9} y1={cy}     x2={cx + 9} y2={cy}     stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
        <line x1={cx}     y1={cy - 9} x2={cx}     y2={cy + 9} stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${cx} ${cy}`}
          to={`360 ${cx} ${cy}`}
          dur={paused ? '9999s' : '0.72s'}
          repeatCount="indefinite"
        />
      </g>
      {/* Center hub */}
      <circle cx={cx} cy={cy} r={3.5} fill="#9ca3af" />
    </g>
  )
}

function Tree({ x }) {
  return (
    <g>
      {/* Trunk */}
      <rect x={x + 2} y={54} width={6} height={14} rx={1} fill="#92400e" />
      {/* Back crown layer (darker) */}
      <polygon points={`${x + 5},20 ${x - 7},55 ${x + 17},55`} fill="#14532d" />
      {/* Front crown layer (lighter) */}
      <polygon points={`${x + 5},30 ${x - 5},58 ${x + 15},58`} fill="#166534" />
    </g>
  )
}

function Building({ x }) {
  return (
    <g>
      {/* Main structure */}
      <rect x={x} y={30} width={30} height={38} rx={1} fill="#4b5563" />
      {/* Roof accent */}
      <rect x={x} y={28} width={30} height={4} rx={1} fill="#374151" />
      {/* Windows row 1 */}
      <rect x={x + 3}  y={35} width={9} height={6} rx={1} fill="#93c5fd" opacity={0.75} />
      <rect x={x + 17} y={35} width={9} height={6} rx={1} fill="#93c5fd" opacity={0.75} />
      {/* Windows row 2 */}
      <rect x={x + 3}  y={46} width={9} height={6} rx={1} fill="#93c5fd" opacity={0.5} />
      <rect x={x + 17} y={46} width={9} height={6} rx={1} fill="#93c5fd" opacity={0.5} />
      {/* Windows row 3 */}
      <rect x={x + 3}  y={57} width={9} height={6} rx={1} fill="#93c5fd" opacity={0.3} />
      <rect x={x + 17} y={57} width={9} height={6} rx={1} fill="#93c5fd" opacity={0.3} />
    </g>
  )
}

function Cloud({ x, y }) {
  return (
    <g opacity={0.85}>
      <ellipse cx={x + 18} cy={y + 10} rx={18} ry={9}  fill="white" />
      <ellipse cx={x + 30} cy={y + 8}  rx={14} ry={8}  fill="white" />
      <ellipse cx={x + 6}  cy={y + 10} rx={12} ry={7}  fill="white" />
    </g>
  )
}

// Background element layout — positions in [0, 360); duplicated for seamless loop
const BG_PERIOD = 360
const BG_ITEMS = [
  { type: 'tree',     x: 30  },
  { type: 'building', x: 120 },
  { type: 'tree',     x: 220 },
  { type: 'building', x: 290 },
  { type: 'cloud',    x: 10,  y: 4  },
  { type: 'cloud',    x: 200, y: 10 },
]

export default function DriveAnimation({ paused = false }) {
  const state = paused ? 'paused' : 'running'
  return (
    <div className="w-full overflow-hidden rounded-2xl" aria-hidden="true">
      <svg
        viewBox="0 0 360 110"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="da-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
          <linearGradient id="da-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          {/* Clip to viewport so background elements don't bleed */}
          <clipPath id="da-clip">
            <rect width="360" height="110" />
          </clipPath>
        </defs>

        {/* ── Sky ── */}
        <rect width="360" height="68" fill="url(#da-sky)" />

        {/* Sun */}
        <circle cx="322" cy="16" r="14" fill="#fde68a" />
        <circle cx="322" cy="16" r="11" fill="#fbbf24" />

        {/* ── Scrolling background (clouds + trees + buildings) ── */}
        <g clipPath="url(#da-clip)" style={{ animation: `da-bg 9s linear infinite`, animationPlayState: state, willChange: 'transform' }}>
          {BG_ITEMS.flatMap(({ type, x, y }, i) => {
            const items = []
            for (let cycle = 0; cycle < 2; cycle++) {
              const ox = x + cycle * BG_PERIOD
              if (type === 'tree')     items.push(<Tree     key={`${i}-${cycle}`} x={ox} />)
              if (type === 'building') items.push(<Building key={`${i}-${cycle}`} x={ox} />)
              if (type === 'cloud')    items.push(<Cloud    key={`${i}-${cycle}`} x={ox} y={y} />)
            }
            return items
          })}
        </g>

        {/* ── Grass strip ── */}
        <rect y="67" width="360" height="8" fill="#16a34a" opacity="0.6" />
        <rect y="67" width="360" height="3" fill="#15803d" opacity="0.5" />

        {/* ── Road ── */}
        <rect y="75" width="360" height="35" fill="url(#da-road)" />
        {/* Shoulder lines */}
        <line x1="0" y1="77" x2="360" y2="77" stroke="#6b7280" strokeWidth="1" opacity="0.4" />
        <line x1="0" y1="108" x2="360" y2="108" stroke="#6b7280" strokeWidth="1" opacity="0.3" />

        {/* ── Scrolling road dashes ── */}
        <g style={{ animation: 'da-road 0.48s linear infinite', animationPlayState: state, willChange: 'transform' }}>
          {Array.from({ length: 18 }, (_, i) => (
            <rect key={i} x={i * 50 - 20} y="89" width="28" height="4" rx="2" fill="white" opacity="0.5" />
          ))}
        </g>

        {/* ── Car (fixed center — camera locked) ── */}
        {/* translate(x, y): positions car centered at ~x=180, wheels touching road (y=75) */}
        <g transform="translate(123, -2)">

          {/* Ground shadow */}
          <ellipse cx="57" cy="77" rx="54" ry="4" fill="black" opacity="0.18" />

          {/* Rear bumper */}
          <rect x="1"   y="46" width="7"  height="14" rx="2" fill="#4c1d95" />
          {/* Front bumper */}
          <rect x="104" y="46" width="8"  height="14" rx="2" fill="#4c1d95" />

          {/* Main body */}
          <rect x="5" y="26" width="102" height="38" rx="6" fill="#7c3aed" />

          {/* Body highlight (top edge sheen) */}
          <rect x="5" y="26" width="102" height="6" rx="4" fill="#8b5cf6" opacity="0.6" />

          {/* Cabin / roof */}
          <path d="M 22 27 L 33 6 L 82 6 L 92 27 Z" fill="#6d28d9" />

          {/* Window glass */}
          <path d="M 36 26 L 44 8 L 78 8 L 86 26 Z" fill="#c4b5fd" opacity="0.8" />

          {/* Window center pillar */}
          <line x1="61" y1="8" x2="61" y2="26" stroke="#6d28d9" strokeWidth="3" />

          {/* Door line */}
          <line x1="61" y1="26" x2="61" y2="62" stroke="#6d28d9" strokeWidth="1.5" opacity="0.5" />

          {/* Rear taillight */}
          <rect x="3"   y="34" width="5" height="12" rx="2" fill="#f87171" opacity="0.9" />

          {/* Front headlight */}
          <rect x="104" y="32" width="6" height="10" rx="2" fill="#fde68a" />
          {/* Headlight glow hint */}
          <rect x="110" y="34" width="3"  height="6"  rx="1" fill="#fef3c7" opacity="0.6" />

          {/* Underbody */}
          <rect x="10" y="58" width="92" height="8" rx="3" fill="#5b21b6" />

          {/* Wheels — animateTransform pauses when parent SVG element has style trick */}
          <Wheel cx={23} cy={64} paused={paused} />
          <Wheel cx={89} cy={64} paused={paused} />
        </g>

        {/* ── Keyframes ── */}
        <style>{`
          @keyframes da-bg {
            from { transform: translateX(0px);    }
            to   { transform: translateX(-360px); }
          }
          @keyframes da-road {
            from { transform: translateX(0px);   }
            to   { transform: translateX(-50px); }
          }
        `}</style>
      </svg>
    </div>
  )
}
