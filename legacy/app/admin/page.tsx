import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getOrganization } from '@/actions/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Building2, Users } from 'lucide-react'
import Link from 'next/link'

async function AdminContent() {
  const result = await getOrganization()

  if (!result.success || !result.data) {
    redirect('/ropa')
  }

  const org = result.data
  const deptCount = org.departments?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Administration</h1>
          <p className="text-slate-600 mt-2">Manage your organization and departments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{org.name}</p>
            <p className="text-sm text-slate-600 mt-1">{org.industry || 'Not specified'}</p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link href="/admin/settings">
                <Settings className="h-4 w-4 mr-2" />
                Edit Settings
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{deptCount}</p>
            <p className="text-sm text-slate-600 mt-1">
              {deptCount === 1 ? '1 department' : `${deptCount} departments`}
            </p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link href="/admin/departments">Manage Departments</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">DPO Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-900">{org.dpoName || 'Not specified'}</p>
            <p className="text-sm text-slate-600 mt-2">{org.dpoEmail || 'No email'}</p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link href="/admin/settings">Update</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Departments List */}
      {deptCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Departments</CardTitle>
            <CardDescription>Latest departments in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {org.departments?.slice(0, 5).map((dept) => (
                <div key={dept.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{dept.name}</p>
                    {dept.description && (
                      <p className="text-sm text-slate-600">{dept.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {deptCount > 5 && (
              <Button asChild variant="outline" className="w-full mt-4">
                <Link href="/admin/departments">View All Departments</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/ropa">View All Processes</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/admin/settings">Organization Settings</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/admin/departments">Department Management</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/">Back to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <p className="text-slate-600">Loading administration panel...</p>
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  )
}
