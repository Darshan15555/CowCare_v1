export default function MolecularBg({ className = '', color = '#d4af37', opacity = 0.25 }) {
  return (
    <svg
      className={`pointer-events-none select-none ${className}`}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke={color} strokeWidth="1.2" strokeOpacity={opacity}>
        {/* Hexagon 1 (Benzene / Molecular Core) */}
        <polygon points="120,60 160,82 160,128 120,150 80,128 80,82" fill="none" />
        <circle cx="120" cy="60" r="3.5" fill={color} fillOpacity={opacity * 1.5} />
        <circle cx="160" cy="82" r="3.5" fill={color} fillOpacity={opacity * 1.5} />
        <circle cx="160" cy="128" r="3.5" fill={color} fillOpacity={opacity * 1.5} />
        <circle cx="120" cy="150" r="3.5" fill={color} fillOpacity={opacity * 1.5} />
        <circle cx="80" cy="128" r="3.5" fill={color} fillOpacity={opacity * 1.5} />
        <circle cx="80" cy="82" r="3.5" fill={color} fillOpacity={opacity * 1.5} />

        {/* Inner ring */}
        <circle cx="120" cy="105" r="22" strokeDasharray="4 3" fill="none" />

        {/* Bond branches */}
        <line x1="160" y1="82" x2="205" y2="60" />
        <circle cx="205" cy="60" r="3" fill={color} fillOpacity={opacity * 1.5} />
        <line x1="205" y1="60" x2="245" y2="82" />
        <circle cx="245" cy="82" r="3" fill={color} fillOpacity={opacity * 1.5} />

        <line x1="160" y1="128" x2="200" y2="150" />
        <circle cx="200" cy="150" r="3.5" fill={color} fillOpacity={opacity * 1.5} />
        <line x1="200" y1="150" x2="200" y2="195" />
        <circle cx="200" cy="195" r="3" fill={color} fillOpacity={opacity * 1.5} />

        {/* Second hexagon linked */}
        <polygon points="200,195 240,218 240,264 200,286 160,264 160,218" fill="none" />
        <circle cx="240" cy="218" r="3" fill={color} fillOpacity={opacity * 1.5} />
        <circle cx="240" cy="264" r="3" fill={color} fillOpacity={opacity * 1.5} />
        <circle cx="200" cy="286" r="3" fill={color} fillOpacity={opacity * 1.5} />
        <circle cx="160" cy="264" r="3" fill={color} fillOpacity={opacity * 1.5} />
        <circle cx="160" cy="218" r="3" fill={color} fillOpacity={opacity * 1.5} />

        {/* Distant delicate nodes */}
        <line x1="240" y1="218" x2="280" y2="195" strokeDasharray="3 3" />
        <circle cx="280" cy="195" r="2.5" fill={color} fillOpacity={opacity} />

        <line x1="80" y1="128" x2="45" y2="150" />
        <circle cx="45" cy="150" r="2.5" fill={color} fillOpacity={opacity} />
        <line x1="45" y1="150" x2="45" y2="190" />
        <circle cx="45" cy="190" r="2" fill={color} fillOpacity={opacity} />

        {/* Floating secondary cluster */}
        <polygon points="360,110 395,130 395,170 360,190 325,170 325,130" fill="none" />
        <circle cx="360" cy="110" r="3" fill={color} fillOpacity={opacity * 1.2} />
        <circle cx="395" cy="130" r="3" fill={color} fillOpacity={opacity * 1.2} />
        <circle cx="395" cy="170" r="3" fill={color} fillOpacity={opacity * 1.2} />
        <circle cx="360" cy="190" r="3" fill={color} fillOpacity={opacity * 1.2} />
        <circle cx="325" cy="170" r="3" fill={color} fillOpacity={opacity * 1.2} />
        <circle cx="325" cy="130" r="3" fill={color} fillOpacity={opacity * 1.2} />
        <line x1="395" y1="130" x2="435" y2="110" />
        <circle cx="435" cy="110" r="2.5" fill={color} fillOpacity={opacity} />
      </g>
    </svg>
  );
}
