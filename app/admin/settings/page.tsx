import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getOrganization } from '@/actions/admin'
import { OrganizationForm } from '@/components/organization-form'

async function SettingsContent() {
  const result = await getOrganization()

  if (!result.success || !result.data) {
    redirect('/ropa')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Organization Settings</h1>
        <p className="text-slate-600 mt-2">
          Manage your organization's information, contact details, and settings
        </p>
      </div>

      <OrganizationForm organization={result.data} />
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <p className="text-slate-600">Loading settings...</p>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  )
}
