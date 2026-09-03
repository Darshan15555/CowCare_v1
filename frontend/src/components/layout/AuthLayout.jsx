import { Shield, ClipboardList, Stethoscope, Users, Lock, ShieldCheck, FlaskConical, HeartPulse } from 'lucide-react';
import MolecularBg from '../common/MolecularBg';
import heroCow from '../../assets/hero_cow_pasture.jpg';
import stethoscopeAccent from '../../assets/stethoscope_accent.jpg';

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-[#faf8f3]">
      {/* ========================================================================= */}
      {/* LEFT PANEL — Deep Forest Green Hero & Brand Story                        */}
      {/* ========================================================================= */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#102014] via-[#162c1d] to-[#0e1a11] text-white lg:w-[52%] xl:w-[50%] min-h-[580px] lg:min-h-screen lg:max-h-screen">
        {/* Atmospheric Floating Molecular Structures */}
        <MolecularBg
          className="absolute -top-10 right-0 w-[420px] h-[420px] lg:w-[500px] lg:h-[500px] opacity-35"
          color="#d5b060"
        />
        <MolecularBg
          className="absolute top-1/3 -left-20 w-[280px] h-[280px] opacity-15"
          color="#a8c49d"
        />

        {/* Top Branding */}
        <div className="relative z-10 px-8 pt-6 lg:px-12 lg:pt-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c5a059]/40 bg-[#172e1e]/80 shadow-inner">
              <span className="text-xl">🐄</span>
            </div>
            <div>
              <span className="font-display text-2xl font-bold tracking-tight text-white">
                CowCare
              </span>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#d5b060]">
                Health Records. Better Care.
              </p>
            </div>
          </div>
        </div>

        {/* Hero Headline & Value Proposition */}
        <div className="relative z-10 px-8 py-4 lg:px-12 lg:py-4 space-y-4">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[40px] xl:text-[46px] font-semibold leading-[1.16] text-white tracking-tight">
            Every cow has a story.<br />
            CowCare keeps her<br />
            <span className="text-[#d8ab4e] italic font-serif">health</span> history safe.
          </h1>

          <p className="max-w-md text-xs sm:text-sm leading-relaxed text-[#dbe5d8]/90 font-normal">
            One permanent ID connects a cow to her farmer and every veterinarian who
            ever treats her — so no history is lost between visits.
          </p>

          {/* Elegant gold accent divider line */}
          <div className="h-[2px] w-12 bg-[#c5a059]/90" />

          {/* 4 Feature Circular Badges */}
          <div className="grid grid-cols-4 gap-2 pt-1 max-w-lg">
            <FeaturePill
              icon={Shield}
              label="Permanent Cow ID"
            />
            <FeaturePill
              icon={ClipboardList}
              label="Complete Health History"
            />
            <FeaturePill
              icon={Stethoscope}
              label="Smarter Treatment"
            />
            <FeaturePill
              icon={Users}
              label="Farmer & Vet Connected"
            />
          </div>
        </div>

        {/* Realistic Cow in Pasture Photo Container */}
        <div className="relative w-full overflow-hidden shrink-0">
          {/* Soft gradient blend into dark green */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#162c1d] via-[#162c1d]/60 to-transparent z-10" />

          <img
            src={heroCow}
            alt="Dairy cow grazing in green morning pasture"
            className="h-52 sm:h-60 lg:h-64 xl:h-72 w-full object-cover object-center brightness-95 contrast-[1.03]"
          />

          {/* Floating Security Badge over pasture */}
          <div className="absolute bottom-4 left-6 lg:left-12 z-20">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-[#0e1c12]/75 backdrop-blur-md px-3.5 py-2 text-xs text-[#f1f5ee] shadow-lg">
              <Lock size={13} className="text-[#d5b060]" />
              <span className="font-medium tracking-wide">
                Secure. Private. Built for better animal care.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL — Warm Ivory Background with Subtle Stethoscope Flatlay       */}
      {/* ========================================================================= */}
      <div className="relative flex flex-1 flex-col justify-between overflow-hidden bg-[#faf8f3] px-6 py-10 lg:px-12 lg:py-14">
        {/* Faint Stethoscope & Leaves Flatlay along the right border */}
        <div className="pointer-events-none absolute -right-4 top-0 bottom-0 w-72 lg:w-96 overflow-hidden opacity-[0.88] select-none hidden md:block">
          <img
            src={stethoscopeAccent}
            alt=""
            className="h-full w-full object-cover object-right"
          />
          {/* Subtle gradient to softly dissolve the image leftwards into warm ivory */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#faf8f3] via-[#faf8f3]/50 to-transparent" />
        </div>

        {/* Faint subtle scientific/molecular structure background in ivory */}
        <MolecularBg
          className="absolute -bottom-10 -left-10 w-[380px] h-[380px] opacity-[0.07]"
          color="#3c573f"
        />

        {/* Form Container (Children) */}
        <div className="relative z-10 mx-auto w-full max-w-md my-auto">
          {children}
        </div>

        {/* Bottom Trust & Science Indicators */}
        <div className="relative z-10 mx-auto w-full max-w-md pt-8 mt-6 border-t border-[#e8e3d5]">
          <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-2">
              <ShieldCheck size={18} className="text-[#204028] shrink-0 mt-0.5" />
              <span className="text-[11px] font-medium text-[#465343] leading-tight">
                Your data is protected
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-2">
              <FlaskConical size={18} className="text-[#204028] shrink-0 mt-0.5" />
              <span className="text-[11px] font-medium text-[#465343] leading-tight">
                Science backed health records
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-2">
              <HeartPulse size={18} className="text-[#204028] shrink-0 mt-0.5" />
              <span className="text-[11px] font-medium text-[#465343] leading-tight">
                Better care, healthier cows
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center text-center group">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-white shadow-sm transition-transform duration-200 group-hover:scale-105 group-hover:bg-white/15">
        <Icon size={19} className="text-white/95" />
      </div>
      <span className="mt-2 text-[11px] font-medium text-[#e4ede1]/90 leading-tight">
        {label}
      </span>
    </div>
  );
}
