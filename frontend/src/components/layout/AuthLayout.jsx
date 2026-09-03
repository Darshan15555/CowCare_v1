export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left panel — brand identity, hidden on small screens */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-pasture-950 via-pasture-800 to-pasture-700 px-12 py-16 text-pasture-50 md:flex md:w-[42%] md:flex-col md:justify-between">
        {/* Layered color blobs for depth - hide (soil/tan) and serum (clinical
            teal) echo the chemistry/agriculture motifs from the brief */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #b5793a, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 animate-pulse rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3e6e8e, transparent 70%)', animationDuration: '6s' }}
        />

        {/* Subtle scientific grid — chemistry/data motif, used with restraint */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(244,247,239,0.9) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pasture-50/10 text-lg">
              🐄
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">CowCare</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="font-display text-4xl font-medium leading-[1.15] text-white">
            Every cow deserves a health record that follows her.
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-pasture-100/80">
            One permanent ID connects a cow to her farmer and every veterinarian who
            ever treats her — so no history is lost between visits.
          </p>

          {/* Three-persona relationship */}
          <div className="flex items-center gap-3 pt-2 text-sm">
            <PersonaChip emoji="🐄" label="Cow" />
            <Connector />
            <PersonaChip emoji="👨‍🌾" label="Farmer" />
            <Connector />
            <PersonaChip emoji="👩‍⚕️" label="Vet" />
          </div>
        </div>

        <p className="relative font-data text-xs text-pasture-100/50">
          CW-IND-KA-000124 · permanent · never reused
        </p>
      </div>

      {/* Right panel — the actual form */}
      <div className="flex flex-1 items-center justify-center bg-mist-50 px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

function PersonaChip({ emoji, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-pasture-100/30 bg-pasture-50/10 text-base">
        {emoji}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-pasture-100/60">{label}</span>
    </div>
  );
}

function Connector() {
  return <span className="h-px w-6 bg-pasture-100/30" />;
}
