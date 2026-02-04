import { getOrganization } from '@/actions/admin'
import { BreachSettingsForm } from '@/components/breach-settings-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function BreachSettingsPage() {
  const result = await getOrganization('default-org')
  const organization = result.data

  if (!organization) {
    return <div>Organization not found</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Breach Notification Settings
        </h1>
        <p className="text-slate-600 mt-1">
          Configure NPC notification email and breach response settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>NPC Notification Configuration</CardTitle>
          <CardDescription>
            Set up the email address and timeframe for notifying the National Privacy Commission
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BreachSettingsForm organization={organization} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Breach Notification</CardTitle>
          <CardDescription>Philippine Data Privacy Act requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            Under the <strong>Data Privacy Act of 2012</strong>, personal information controllers
            must notify the National Privacy Commission within 72 hours upon knowledge of a
            personal data breach.
          </p>
          <p>
            The notification must include the nature of the breach, personal data involved,
            recommended actions, and measures taken by the organization.
          </p>
          <p className="text-xs text-slate-500">
            Reference: NPC Circular 16-03 - Security Incident Management Framework
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
