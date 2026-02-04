import Link from 'next/link'
import { getProcessesByOrg } from '@/actions/ropa'
import { ProcessTable } from '@/components/process-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen, Plus } from 'lucide-react'

export default async function RopaListPage() {
  const result = await getProcessesByOrg('default-org')
  const processes = result.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My ROPA</h1>
          <p className="text-slate-600 mt-1">
            Manage all Records of Processing Activities in one place
          </p>
        </div>
        <Link href="/ropa/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New ROPA Entry
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processes</CardTitle>
            <FolderOpen className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processes.length}</div>
            <p className="text-xs text-slate-500">Across all departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processes.filter((process) => process.status === 'APPROVED').length}
            </div>
            <p className="text-xs text-slate-500">Ready for audit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft & Review</CardTitle>
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processes.filter((process) => process.status !== 'APPROVED').length}
            </div>
            <p className="text-xs text-slate-500">Needs final validation</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Processes</CardTitle>
          <CardDescription>
            Filter, search, and review every processing activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProcessTable processes={processes} />
        </CardContent>
      </Card>
    </div>
  )
}
