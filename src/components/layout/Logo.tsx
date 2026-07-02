import Link from 'next/link'

interface LogoProps {
  locale: string
  className?: string
}

export default function Logo({ locale, className = '' }: LogoProps) {
  return (
    <Link href={`/${locale}`} className={`flex items-center gap-2.5 shrink-0 ${className}`}>
      {/* Icon mark */}
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#58B82A"/>
        {/* Gecko footprint — central pad + 4 toes */}
        {/* Central pad */}
        <circle cx="20" cy="20" r="4.2" fill="white"/>
        {/* Top toe */}
        <circle cx="20" cy="10.5" r="2.8" fill="white"/>
        <rect x="18.8" y="10.5" width="2.4" height="9.5" rx="1.2" fill="white"/>
        {/* Bottom toe */}
        <circle cx="20" cy="29.5" r="2.8" fill="white"/>
        <rect x="18.8" y="20" width="2.4" height="9.5" rx="1.2" fill="white"/>
        {/* Left toe */}
        <circle cx="10.5" cy="20" r="2.8" fill="white"/>
        <rect x="10.5" y="18.8" width="9.5" height="2.4" rx="1.2" fill="white"/>
        {/* Right toe */}
        <circle cx="29.5" cy="20" r="2.8" fill="white"/>
        <rect x="20" y="18.8" width="9.5" height="2.4" rx="1.2" fill="white"/>
      </svg>
      {/* Wordmark */}
      <div className="flex flex-col leading-none">
        <span className="font-black text-xl tracking-[0.12em] uppercase" style={{ color: '#2D2D2D', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
          REPTI<span style={{ color: '#58B82A' }}> PLUS</span>
        </span>
      </div>
    </Link>
  )
}
