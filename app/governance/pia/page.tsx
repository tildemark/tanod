import Link from 'next/link'
import { getPiaAssessmentsByOrg } from '@/actions/pia'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const statusColor = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100 text-green-800'
    case 'REVIEW':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-slate-100 text-slate-800'
  }
}

export default async function PiaListPage() {
  const result = await getPiaAssessmentsByOrg('default-org')
  const items = result.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy Impact Assessments</h1>
          <p className="text-slate-600 mt-1">Governance workspace for Philippine DPA compliance</p>
        </div>
        <Link href="/governance/pia/new">
          <Button>Create PIA</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active PIAs</CardTitle>
          <CardDescription>{items.length} assessment(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-slate-600">No PIAs yet. Create your first assessment.</p>
          ) : (
            <div className="space-y-3">
              {items.map((pia) => (
                <Link key={pia.id} href={`/governance/pia/${pia.id}`} className="block">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{pia.title}</p>
                      <p className="text-xs text-slate-600">Updated {new Date(pia.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="secondary" className={statusColor(pia.status)}>
                      {pia.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
