import { PiaForm } from '@/components/pia-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PiaNewPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">New Privacy Impact Assessment</h1>
        <p className="text-slate-600 mt-1">Use the Philippine DPA-focused template to document processing risks</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PIA Form</CardTitle>
          <CardDescription>Complete each section before submitting for review</CardDescription>
        </CardHeader>
        <CardContent>
          <PiaForm orgId="default-org" />
        </CardContent>
      </Card>
    </div>
  )
}
