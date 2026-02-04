import Link from 'next/link'
import { getProcessesByOrg } from '@/actions/ropa'
import { ProcessTable } from '@/components/process-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ArrowUpRight, ShieldAlert } from 'lucide-react'

const riskOrder = (risk: string | null) => {
  switch (risk) {
    case 'HIGH':
      return 3
    case 'MEDIUM':
      return 2
    case 'LOW':
      return 1
    default:
      return 0
  }
}

export default async function RiskAssessmentPage() {
  const result = await getProcessesByOrg('default-org')
  const processes = result.data || []

  const highRisk = processes.filter((process) => process.riskLevel === 'HIGH')
  const mediumRisk = processes.filter((process) => process.riskLevel === 'MEDIUM')
  const lowRisk = processes.filter((process) => process.riskLevel === 'LOW')

  const total = processes.length
  const highPercent = total ? Math.round((highRisk.length / total) * 100) : 0
  const mediumPercent = total ? Math.round((mediumRisk.length / total) * 100) : 0
  const lowPercent = total ? Math.round((lowRisk.length / total) * 100) : 0

  const rankedProcesses = [...processes].sort(
    (a, b) => riskOrder(b.riskLevel) - riskOrder(a.riskLevel)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Risk Assessment</h1>
          <p className="text-slate-600 mt-1">
            Monitor and prioritize high-risk processing activities
          </p>
        </div>
        <Link href="/ropa/new">
          <Button className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Assess New Process
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processes</CardTitle>
            <ShieldAlert className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-slate-500">Tracked for risk scoring</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <div className="h-3 w-3 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highRisk.length}</div>
            <p className="text-xs text-slate-500">{highPercent}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <div className="h-3 w-3 rounded-full bg-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{mediumRisk.length}</div>
            <p className="text-xs text-slate-500">{mediumPercent}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <div className="h-3 w-3 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{lowRisk.length}</div>
            <p className="text-xs text-slate-500">{lowPercent}% of total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Snapshot of your current risk profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-red-500"
                style={{ width: `${highPercent}%` }}
                aria-label="High risk proportion"
              />
              <div
                className="bg-orange-500"
                style={{ width: `${mediumPercent}%` }}
                aria-label="Medium risk proportion"
              />
              <div
                className="bg-blue-500"
                style={{ width: `${lowPercent}%` }}
                aria-label="Low risk proportion"
              />
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                High Risk
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Medium Risk
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Low Risk
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>Focus on the highest impact next steps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <ArrowUpRight className="mt-0.5 h-4 w-4 text-red-500" />
              Review all HIGH risk processes within 30 days.
            </div>
            <div className="flex items-start gap-2">
              <ArrowUpRight className="mt-0.5 h-4 w-4 text-orange-500" />
              Validate retention schedules for MEDIUM risk processes.
            </div>
            <div className="flex items-start gap-2">
              <ArrowUpRight className="mt-0.5 h-4 w-4 text-blue-500" />
              Confirm lawful basis documentation is complete.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Processes Ranked by Risk</CardTitle>
          <CardDescription>
            Start with the highest-risk processing activities first
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProcessTable processes={rankedProcesses} />
        </CardContent>
      </Card>
    </div>
  )
}
