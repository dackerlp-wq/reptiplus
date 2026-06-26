'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
        { key: 'shipping_zasilkovna_price', label: 'Zásilkovna — cena (Kč)' },
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
