import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  height?: string;
}

export default function GrassHeader({ children, height = 'h-40' }: Props) {
  return (
    <div className={`relative ${height} overflow-hidden bg-am-grass`}>
      {/* Alternating stripe overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(90deg, transparent 0px, transparent 40px, rgba(0,0,0,0.13) 40px, rgba(0,0,0,0.13) 80px)',
        }}
      />

      {/* Court lines SVG */}
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Baseline (bottom) */}
        <line x1="5%" y1="92%" x2="95%" y2="92%" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
        {/* Service line */}
        <line x1="5%" y1="60%" x2="95%" y2="60%" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
        {/* Center line */}
        <line x1="50%" y1="60%" x2="50%" y2="92%" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
        {/* Left sideline */}
        <line x1="5%"  y1="30%" x2="5%"  y2="92%" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
        {/* Right sideline */}
        <line x1="95%" y1="30%" x2="95%" y2="92%" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      </svg>

      {/* Bottom fade */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 20%, rgba(0,0,0,0.72) 100%)',
        }}
      />

      {/* Content sits on top of the fade */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
        {children}
      </div>
    </div>
  );
}
