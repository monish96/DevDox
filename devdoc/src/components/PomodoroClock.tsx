import { useMemo } from 'react'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function PomodoroClock(props: {
  /** Remaining milliseconds */
  remainingMs: number
  /** Total milliseconds for the focus session */
  totalMs: number
  /** Light theme? */
  isLight: boolean
  /** Render the red second hand */
  showSecondHand?: boolean
}) {
  const total = Math.max(1, props.totalMs)
  const remaining = clamp(props.remainingMs, 0, total)
  const elapsed = total - remaining

  const minuteAngle = (elapsed / total) * 360 - 90
  const secondAngle = ((elapsed / 1000) % 60) * 6 - 90

  const ticks = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const a = (i / 60) * Math.PI * 2
      const isMajor = i % 5 === 0
      const r1 = 88
      const r2 = isMajor ? 74 : 80
      const x1 = 100 + Math.cos(a) * r1
      const y1 = 100 + Math.sin(a) * r1
      const x2 = 100 + Math.cos(a) * r2
      const y2 = 100 + Math.sin(a) * r2
      return { i, x1, y1, x2, y2, isMajor }
    })
  }, [])

  const progressRing = useMemo(() => {
    const r = 86
    const c = 2 * Math.PI * r
    const p = clamp(elapsed / total, 0, 1)
    const dash = c * p
    const gap = c - dash
    return { r, c, dash, gap }
  }, [elapsed, total])

  return (
    <div className={`pomoClock ${props.isLight ? 'pomoClockLight' : 'pomoClockDark'}`.trim()}>
      <svg viewBox="0 0 200 200" width="100%" height="100%" aria-label="Pomodoro clock">
        <defs>
          <radialGradient id="faceLight" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#f3f6ff" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="faceDark" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#1a2030" stopOpacity="1" />
            <stop offset="100%" stopColor="#0c0f18" stopOpacity="1" />
          </radialGradient>
          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000" floodOpacity="0.35" />
          </filter>
          <filter id="innerShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feOffset dx="0" dy="2" />
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in2="SourceAlpha" operator="out" result="inverse" />
            <feColorMatrix
              in="inverse"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0.35 0"
              result="shadow"
            />
            <feComposite in="shadow" in2="SourceGraphic" operator="over" />
          </filter>
        </defs>

        {/* Outer container */}
        <circle cx="100" cy="100" r="96" fill="rgba(255,255,255,0.06)" />

        {/* Face */}
        <circle
          cx="100"
          cy="100"
          r="90"
          fill={props.isLight ? 'url(#faceLight)' : 'url(#faceDark)'}
          filter="url(#softShadow)"
        />
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="transparent"
          stroke={props.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}
          strokeWidth="2"
          filter="url(#innerShadow)"
        />

        {/* Progress ring */}
        <g transform="rotate(-90 100 100)">
          <circle
            cx="100"
            cy="100"
            r={progressRing.r}
            fill="transparent"
            stroke={props.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}
            strokeWidth="4"
          />
          <circle
            cx="100"
            cy="100"
            r={progressRing.r}
            fill="transparent"
            stroke={props.isLight ? 'rgba(116,199,255,0.65)' : 'rgba(116,199,255,0.55)'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${progressRing.dash} ${progressRing.gap}`}
          />
        </g>

        {/* Ticks */}
        <g>
          {ticks.map((t) => (
            <line
              key={t.i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={props.isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.25)'}
              strokeWidth={t.isMajor ? 2.2 : 1.2}
              strokeLinecap="round"
              opacity={t.isMajor ? 0.8 : 0.55}
            />
          ))}
        </g>

        {/* Numbers */}
        <g
          fontFamily="system-ui, -apple-system, Segoe UI, Inter, sans-serif"
          fontSize="16"
          fontWeight="700"
          fill={props.isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)'}
        >
          <text x="100" y="38" textAnchor="middle">
            12
          </text>
          <text x="162" y="106" textAnchor="middle">
            3
          </text>
          <text x="100" y="174" textAnchor="middle">
            6
          </text>
          <text x="38" y="106" textAnchor="middle">
            9
          </text>
        </g>

        {/* Minute hand (elapsed progress) */}
        <g transform={`rotate(${minuteAngle} 100 100)`} filter="url(#softShadow)">
          <line x1="100" y1="100" x2="155" y2="100" stroke={props.isLight ? '#5e6472' : '#cfd6e6'} strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Second hand */}
        {props.showSecondHand ? (
          <g transform={`rotate(${secondAngle} 100 100)`}>
            <line x1="100" y1="104" x2="170" y2="100" stroke="#d21f2b" strokeWidth="2" strokeLinecap="round" />
          </g>
        ) : null}

        {/* Center cap */}
        <circle cx="100" cy="100" r="7" fill={props.isLight ? '#d9dde6' : '#c7cedf'} stroke={props.isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.25)'} strokeWidth="1" />
        <circle cx="100" cy="100" r="3" fill="#d21f2b" opacity="0.85" />
      </svg>
    </div>
  )
}


