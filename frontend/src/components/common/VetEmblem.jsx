export default function VetEmblem({ size = 52, className = '' }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-full border border-[#ded8cb] bg-[#fbf9f5] shadow-xs ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1d3b25"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Veterinary Cross with subtle rounded corners */}
        <path d="M9 3h6a1 1 0 0 1 1 1v4h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4v4a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-4H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h4V4a1 1 0 0 1 1-1z" />
        {/* Inner subtle leaf / pulse curve */}
        <path d="M12 8v8" stroke="#3b6b47" strokeWidth="1.5" />
        <path d="M8 12h8" stroke="#3b6b47" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
