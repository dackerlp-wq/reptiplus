import Link from 'next/link'
import Image from 'next/image'

interface LogoProps {
  locale: string
  className?: string
}

export default function Logo({ locale, className = '' }: LogoProps) {
  return (
    <Link href={`/${locale}`} className={`flex items-center shrink-0 ${className}`}>
      <Image
        src="/logo.svg"
        alt="Repti Plus"
        width={120}
        height={48}
        className="h-12 w-auto"
        priority
      />
    </Link>
  )
}
