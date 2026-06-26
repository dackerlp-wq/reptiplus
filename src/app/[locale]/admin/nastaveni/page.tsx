'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'
import { useEurRateInfo } from '@/hooks/useEurRate'
import { RefreshCw, TrendingUp, Clock, AlertCircle, CheckCircle } from 'lucide-react'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const eurInfo = useEurRateInfo()

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      setSettings(data.settings || {})
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    })
    if (res.ok) toast('Nastavení uloženo', 'success')
    else toast('Chyba při ukládání', 'error')
    setSaving(false)
  }

  const SETTINGS_GROUPS = [
    {
      title: 'Základní informace',
      items: [
        { key: 'shop_name', label: 'Název obchodu' },
        { key: 'shop_email', label: 'E-mail obchodu' },
        { key: 'shop_phone', label: 'Telefon' },
      ]
    },
    {
      title: 'Doprava',
      items: [
        { key: 'free_shipping_threshold', label: 'Doprava zdarma od (Kč)' },
        { key: 'shipping_packeta_price', label: 'Packeta — cena (Kč)' },
        { key: 'shipping_ppl_price', label: 'PPL — cena (Kč)' },
        { key: 'shipping_personal_price', label: 'Osobní odběr — cena (Kč)' },
      ]
    },
    {
      title: 'Daně',
      items: [
        { key: 'vat_rate', label: 'Sazba DPH (%)' },
      ]
    }
  ]

  if (loading) return <div className="text-gray-soft">Načítám...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Nastavení</h1>
        <Button loading={saving} onClick={handleSave}>Uložit nastavení</Button>
      </div>

      <div className="space-y-6">
        {/* Exchange rate info block */}
        <div className="bg-white rounded-xl border border-cream-dark p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-forest" />
            Směnný kurz EUR/CZK
          </h2>
          {eurInfo ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="bg-sage/30 rounded-xl px-5 py-3 text-center">
                  <p className="text-xs text-gray-soft mb-1">Aktuální kurz</p>
                  <p className="text-2xl font-bold text-forest">1 EUR = {eurInfo.rate.toFixed(3)} CZK</p>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {eurInfo.isFallback ? (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-forest shrink-0" />
                    )}
                    <span className="text-gray-soft">Zdroj:</span>
                    <span className="font-medium">
                      {eurInfo.isFallback
                        ? 'Záložní pevný kurz (API nedostupné)'
                        : <a href="https://frankfurter.app" target="_blank" rel="noopener" className="text-forest hover:underline">frankfurter.app</a>
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-soft shrink-0" />
                    <span className="text-gray-soft">Stáří cache:</span>
                    <span className="font-medium">
                      {eurInfo.cacheAgeMinutes === 0
                        ? 'Právě aktualizováno'
                        : `${eurInfo.cacheAgeMinutes} min`
                      }
                    </span>
                    <span className="text-gray-soft text-xs">(obnovuje se každé 4 hodiny)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <RefreshCw className="w-4 h-4 text-gray-soft shrink-0" />
                    <span className="text-gray-soft">Načteno:</span>
                    <span className="font-medium">
                      {new Date(eurInfo.fetchedAt).toLocaleString('cs-CZ')}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-soft bg-cream rounded-lg p-3">
                Kurz se automaticky aktualizuje z <strong>frankfurter.app</strong> (Evropská centrální banka) každé 4 hodiny.
                Zobrazuje se jako primární cena pro anglické a německé jazykové verze eshopu.
                Při fakturaci se vždy používá cena v CZK.
              </p>
            </div>
          ) : (
            <div className="text-gray-soft text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Načítám kurz...
            </div>
          )}
        </div>

        {SETTINGS_GROUPS.map(group => (
          <div key={group.title} className="bg-white rounded-xl border border-cream-dark p-6">
            <h2 className="font-bold mb-4">{group.title}</h2>
            <div className="grid grid-cols-2 gap-4">
              {group.items.map(item => (
                <Input
                  key={item.key}
                  id={item.key}
                  label={item.label}
                  value={settings[item.key] || ''}
                  onChange={e => setSettings(s => ({ ...s, [item.key]: e.target.value }))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
