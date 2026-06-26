'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

export default function RegisterPage() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      toast('Registrace úspěšná!', 'success')
      router.push(`/${locale}/ucet`)
    } else {
      toast(data.error, 'error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-forest rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <h1 className="text-2xl font-bold">{t('register')}</h1>
        </div>
        <div className="bg-white rounded-2xl border border-cream-dark p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input id="firstName" label={t('first_name')} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
              <Input id="lastName" label={t('last_name')} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
            </div>
            <Input id="email" label={t('email')} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            <Input id="phone" label="Telefon" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input id="password" label={t('password')} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              {t('submit_register')}
            </Button>
          </form>
          <p className="text-sm text-center text-gray-soft mt-4">
            {t('have_account')}{' '}
            <Link href={`/${locale}/prihlaseni`} className="text-forest font-medium hover:underline">
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
