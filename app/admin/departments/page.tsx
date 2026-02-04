import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getOrganization } from '@/actions/admin'
import { DepartmentManagement } from '@/components/department-management'

async function DepartmentsContent() {
  const result = await getOrganization()

  if (!result.success || !result.data) {
    redirect('/ropa')
  }

  const org = result.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Department Management</h1>
        <p className="text-slate-600 mt-2">
          Create, edit, and manage departments in your organization
        </p>
      </div>

      <DepartmentManagement
        orgId={org.id}
        departments={org.departments || []}
      />
    </div>
  )
}

export default function DepartmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <p className="text-slate-600">Loading departments...</p>
        </div>
      }
    >
      <DepartmentsContent />
    </Suspense>
  )
}
