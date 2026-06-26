import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'new' | 'sale' | 'outofstock' | 'instock' | 'lowstock' | 'default'
  className?: string
}

const variants = {
  new: 'bg-forest text-white',
  sale: 'bg-gold text-charcoal',
  outofstock: 'bg-gray-400 text-white',
  instock: 'bg-sage-dark text-charcoal',
  lowstock: 'bg-amber-500 text-white',
  default: 'bg-cream-dark text-charcoal',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}
