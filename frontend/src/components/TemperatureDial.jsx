const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function TemperatureDial({ celsius }) {
  const normalized = clamp((celsius + 30) / 80, 0, 1);
  const angle = -120 + normalized * 240;
  const rotation = `rotate(${angle} 100 100)`;

  return (
    <div className="dial-card">
      <div className="dial-header">
        <span>Thermal Gauge</span>
        <strong>{celsius.toFixed(1)}°C</strong>
      </div>

      <svg viewBox="0 0 200 200" className="dial-svg" aria-hidden="true">
        <defs>
          <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--dial-start)" />
            <stop offset="50%" stopColor="var(--dial-mid)" />
            <stop offset="100%" stopColor="var(--dial-end)" />
          </linearGradient>
        </defs>

        <path
          d="M 30 140 A 80 80 0 0 1 170 140"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M 30 140 A 80 80 0 0 1 170 140"
          fill="none"
          stroke="url(#dialGradient)"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={`${normalized * 252} 252`}
        />
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="42"
          stroke="#fff7df"
          strokeWidth="6"
          strokeLinecap="round"
          transform={rotation}
        />
        <circle cx="100" cy="100" r="10" fill="#fff7df" />
      </svg>

      <div className="dial-scale">
        <span>-30°C</span>
        <span>50°C</span>
      </div>
    </div>
  );
}
