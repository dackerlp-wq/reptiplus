'use client'

interface Props {
  labels: { featured: string; new: string; sale: string }
}

export default function HomeProductNav({ labels }: Props) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const offset = 80 // header height
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className="flex gap-1 bg-cream-dark rounded-xl p-1">
      <button
        onClick={() => scrollTo('sekce-doporucene')}
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-soft hover:text-charcoal hover:bg-white/70 transition-colors"
      >
        {labels.featured}
      </button>
      <button
        onClick={() => scrollTo('sekce-novinky')}
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-soft hover:text-charcoal hover:bg-white/70 transition-colors"
      >
        {labels.new}
      </button>
      <button
        onClick={() => scrollTo('sekce-sleva')}
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-soft hover:text-charcoal hover:bg-white/70 transition-colors"
      >
        {labels.sale}
      </button>
    </div>
  )
}
