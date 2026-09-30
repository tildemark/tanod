import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ReportIncidentDialog } from '@/components/report-incident-dialog'
import { getIncidentsByOrg } from '@/actions/incident'
import { AlertTriangle, Bell, ShieldAlert, Eye } from 'lucide-react'

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-600 text-white'
    case 'HIGH':
      return 'bg-red-100 text-red-800'
    case 'MEDIUM':
      return 'bg-orange-100 text-orange-800'
    case 'LOW':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-slate-100 text-slate-800'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'RESOLVED':
      return 'bg-green-100 text-green-800'
    case 'NOTIFYING':
      return 'bg-yellow-100 text-yellow-800'
    case 'ASSESSING':
      return 'bg-blue-100 text-blue-800'
    case 'REPORTED':
      return 'bg-slate-100 text-slate-800'
    default:
      return 'bg-slate-100 text-slate-800'
  }
}

export default async function BreachMonitorPage() {
  const result = await getIncidentsByOrg('default-org')
  const incidents = result.data || []

  const openIncidents = incidents.filter((i: any) => i.status !== 'RESOLVED')
  const criticalIncidents = incidents.filter((i: any) => i.severity === 'CRITICAL')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Breach Monitor</h1>
          <p className="text-slate-600 mt-1">
            Track, triage, and manage data breach incidents
          </p>
        </div>
        <ReportIncidentDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openIncidents.length}</div>
            <p className="text-xs text-slate-500">
              {criticalIncidents.length > 0
                ? `${criticalIncidents.length} critical`
                : 'No critical incidents'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notification Window</CardTitle>
            <Bell className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">72 hrs</div>
            <p className="text-xs text-slate-500">NPC notification SLA</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <ShieldAlert className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.length}</div>
            <p className="text-xs text-slate-500">All-time tracked</p>
          </CardContent>
        </Card>
      </div>

      {incidents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No incidents reported</CardTitle>
            <CardDescription>
              When a breach occurs, report it here to start the 72-hour NPC notification countdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
              Define incident response roles and responsibilities.
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
              Set up breach notification templates for the NPC and affected data subjects.
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
              Configure escalation timelines and approvals.
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
              Integrate monitoring sources and alerting channels.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>All reported breach incidents and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidents.map((incident: any) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{incident.title}</h3>
                      <Badge className={getSeverityColor(incident.severity)} variant="secondary">
                        {incident.severity}
                      </Badge>
                      <Badge className={getStatusColor(incident.status)} variant="secondary">
                        {incident.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      Occurred:{' '}
                      {new Date(incident.occurrenceDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {incident.impactedIndividuals && (
                        <span className="ml-4">
                          Impact: {incident.impactedIndividuals.toLocaleString()} individuals
                        </span>
                      )}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Breach Notification Settings</CardTitle>
          <CardDescription>
            Configure NPC email and notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/breach-settings">
            <Button variant="outline" className="gap-2">
              Configure breach settings
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
