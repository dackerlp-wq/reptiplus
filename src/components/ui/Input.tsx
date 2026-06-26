import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className, label, error, id, ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-charcoal">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full px-3 py-2 rounded-lg border border-cream-dark bg-white text-charcoal placeholder-gray-soft',
          'focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest',
          'transition-colors duration-150',
          error && 'border-red-500 focus:ring-red-500/30 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
})

Input.displayName = 'Input'
