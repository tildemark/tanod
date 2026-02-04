import { getDepartmentsByOrg, getProcessById } from '@/actions/ropa'
import { notFound } from 'next/navigation'
import { RopaEditForm } from '@/components/ropa-edit-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ProcessEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProcessEditPage({ params }: ProcessEditPageProps) {
  const { id } = await params
  const result = await getProcessById(id)
  const deptResult = await getDepartmentsByOrg('default-org')

  if (!result.success || !result.data) {
    notFound()
  }

  const process = result.data
  const departments = deptResult.data || []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/ropa/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Edit ROPA Entry
          </h1>
          <p className="text-slate-600 mt-1">
            Update the processing activity details
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ROPA Wizard</CardTitle>
          <CardDescription>
            Modify the details of this processing activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RopaEditForm departments={departments} process={process} />
        </CardContent>
      </Card>
    </div>
  )
}
