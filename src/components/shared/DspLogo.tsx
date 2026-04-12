import type { DspType } from '@/types';

interface DspLogoProps {
  dsp: DspType;
  size?: number;
}

/** DV360 — Google Display & Video 360 green "play" icon */
function DV360Icon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 2193 2428" fill="none">
      <path d="M1731 949c142-86 328-41 414 101 87 143 41 328-101 415l-11 6L461 2377c-143 87-328 41-415-101-86-143-41-328 102-415l11-6L1731 949z" fill="#81C995"/>
      <path d="M601 304C602 137 467 2 301 1c-21 0-43 2-64 7C97 42-2 170 0 315v1798l600 11V304z" fill="#34A853"/>
      <path d="M1737 1473c146 75 324 27 412-111 84-142 38-326-104-410l-3-2L459 43C318-42 135 3 50 144l-6 11c-84 143-36 327 107 411l3 1 1583 906z" fill="#5BB974"/>
      <path d="M2031 1475L601 2274v-687l1135-633c150-83 340-29 424 122 8 14 14 28 20 43 42 139-21 288-149 356z" fill="#81C995"/>
      <circle cx="301" cy="2128" r="300" fill="#1E8E3E"/>
    </svg>
  );
}

/** Microsoft Advertising — Microsoft 4-color window */
function MicrosoftAdvIcon({ size }: { size: number }) {
  const s = size;
  const gap = s * 0.04;
  const half = (s - gap) / 2;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <rect x="0" y="0" width={half} height={half} rx="1" fill="#F25022"/>
      <rect x={half + gap} y="0" width={half} height={half} rx="1" fill="#7FBA00"/>
      <rect x="0" y={half + gap} width={half} height={half} rx="1" fill="#00A4EF"/>
      <rect x={half + gap} y={half + gap} width={half} height={half} rx="1" fill="#FFB900"/>
    </svg>
  );
}

/** StackAdapt — abstract "S" mark in blue */
function StackAdaptIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M8 6c0-1.1.9-2 2-2h7a2 2 0 011.7 3l-5.4 9h8.7a2 2 0 011.7 3l-7 12A2 2 0 0113 30v-9H9a2 2 0 01-1.7-3l7-12H8.7A2 2 0 018 6z" fill="#0062FF"/>
    </svg>
  );
}

/** Amazon DSP — Amazon smile/arrow */
function AmazonDSPIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M4.8 21.6c4.4 3.2 10.2 5.1 15.4 5.1 3.7 0 7.9-.8 11.7-2.4.6-.3 1-.1.5.6-1.4 2-4.8 3.4-8.6 3.4-5.4 0-11.3-2-15.7-5.4-.7-.6-.2-1.3.5-.9l-.1-.1.3-.3z" fill="#FF9900"/>
      <path d="M26.8 20c-.6-.8-4.2-.4-5.8-.2-.5.1-.6-.4-.1-.7 2.8-2 7.5-1.4 8-0.7.6.7-.2 5.5-2.8 7.8-.4.3-.8.2-.6-.3.6-1.4 1.9-4.7 1.3-5.9z" fill="#FF9900"/>
      <path d="M21.1 5.8V4.6c0-.2.1-.4.4-.4h6.6c.2 0 .4.1.4.4v1c0 .2-.2.5-.5.9l-3.4 4.9c1.3 0 2.6.2 3.7.8.3.1.3.4.4.6v1.3c0 .2-.3.5-.5.4-2.2-1.2-5.2-1.3-7.6 0-.2.1-.5-.2-.5-.4v-1.2c0-.3 0-.7.3-1.1l4-5.7h-3.4c-.2 0-.4-.2-.4-.4v.1z" fill="currentColor"/>
      <path d="M8.2 15.1h-2c-.2 0-.3-.2-.3-.3V4.6c0-.2.2-.4.4-.4h1.9c.2 0 .3.2.4.3v1.4c.5-1.2 1.4-1.8 2.7-1.8 1.3 0 2.1.6 2.7 1.8.5-1.2 1.6-1.8 2.8-1.8.9 0 1.8.4 2.3 1.2.6.9.5 2.2.5 3.3v6.2c0 .2-.2.4-.4.4h-2c-.2 0-.3-.2-.3-.4V8.4c0-.4 0-1.5-.1-1.9-.1-.7-.6-0.9-1.1-0.9-.5 0-1 .3-1.2.8-.2.5-.2 1.3-.2 2v6.4c0 .2-.2.4-.4.4h-2c-.2 0-.3-.2-.3-.4V8.4c0-1.2.2-2.9-1.2-2.9-1.4 0-1.4 1.7-1.4 2.9v6.4c-.1.2-.2.3-.4.3z" fill="currentColor"/>
    </svg>
  );
}

export function DspLogo({ dsp, size = 26 }: DspLogoProps) {
  switch (dsp) {
    case 'dv360': return <DV360Icon size={size} />;
    case 'xandr': return <MicrosoftAdvIcon size={size} />;
    case 'stackadapt': return <StackAdaptIcon size={size} />;
    case 'amazondsp': return <AmazonDSPIcon size={size} />;
    default: return null;
  }
}