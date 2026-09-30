import { getDepartmentsByOrg } from '@/actions/ropa'
import { RopaForm } from '@/components/ropa-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewRopaPage() {
  // Fetch departments for the default organization
  const result = await getDepartmentsByOrg('default-org')
  const departments = result.data || []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Create New ROPA Entry
        </h1>
        <p className="text-slate-600 mt-1">
          Follow the wizard to document your data processing activity
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ROPA Wizard</CardTitle>
          <CardDescription>
            Complete all steps to create a compliant record of processing activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RopaForm departments={departments} />
        </CardContent>
      </Card>
    </div>
  )
}
