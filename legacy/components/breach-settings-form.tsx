'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrganization } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface Organization {
  id: string
  npcNotificationEmail: string | null
  breachNotificationHours: number | null
}

interface BreachSettingsFormProps {
  organization: Organization
}

export function BreachSettingsForm({ organization }: BreachSettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState(
    organization.npcNotificationEmail || 'privacy.complaints@privacy.gov.ph'
  )
  const [hours, setHours] = useState(
    organization.breachNotificationHours?.toString() || '72'
  )
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await updateOrganization(organization.id, {
      npcNotificationEmail: email,
      breachNotificationHours: parseInt(hours),
    })

    setIsLoading(false)

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to update settings')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="npc-email">NPC Notification Email</Label>
        <Input
          id="npc-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="privacy.complaints@privacy.gov.ph"
          required
        />
        <p className="text-xs text-slate-500">
          Official email address for reporting breaches to the National Privacy Commission
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notification-hours">Notification Window (hours)</Label>
        <Input
          id="notification-hours"
          type="number"
          min="1"
          max="168"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          required
        />
        <p className="text-xs text-slate-500">
          Number of hours within which NPC must be notified (default: 72 hours)
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save settings
      </Button>
    </form>
  )
}
