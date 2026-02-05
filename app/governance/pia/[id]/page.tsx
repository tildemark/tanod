import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPiaAssessmentById } from '@/actions/pia'
import { PIA_SECTIONS } from '@/lib/pia'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PiaReportDownloadButton } from '@/components/pia-report-download-button'

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

export default async function PiaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getPiaAssessmentById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const pia = result.data
  const answers = (pia.answers || {}) as Record<string, any>
  const riskRegister = (() => {
    try {
      return JSON.parse(answers.risk_register || '[]') as Array<Record<string, string>>
    } catch {
      return []
    }
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/governance/pia">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{pia.title}</h1>
            <p className="text-slate-600 mt-1">{pia.owner || 'No owner specified'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PiaReportDownloadButton piaId={pia.id} />
          <Badge variant="secondary" className={statusColor(pia.status)}>
            {pia.status}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>PIA metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Description</span>
            <span className="text-slate-900">{pia.description || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Created</span>
            <span className="text-slate-900">{new Date(pia.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Last updated</span>
            <span className="text-slate-900">{new Date(pia.updatedAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {PIA_SECTIONS.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.description && <CardDescription>{section.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-3">
            {section.id === 'risk' && riskRegister.length > 0 && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Risk register</p>
                {riskRegister.map((risk) => (
                  <div key={risk.id} className="rounded-md border border-slate-200 bg-white p-4 space-y-2">
                    <p className="text-sm font-semibold text-slate-900">{risk.title}</p>
                    <p className="text-xs text-slate-600">Context: {risk.context || 'N/A'}</p>
                    <p className="text-xs text-slate-600">Likelihood: {risk.likelihood} • Impact: {risk.impact} • Overall: {risk.overall}</p>
                    <p className="text-xs text-slate-600">Existing controls: {risk.existingControls || 'N/A'}</p>
                    <p className="text-xs text-slate-600">Recommended controls: {risk.recommendedControls || 'N/A'}</p>
                    <p className="text-xs text-slate-600">Responsibility: {risk.responsibility || 'N/A'} • Target: {risk.targetDate || 'N/A'}</p>
                  </div>
                ))}
              </div>
            )}
            {section.questions.map((question) => (
              <div key={question.id} className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">{question.label}</p>
                <p className="text-sm text-slate-700">
                  {Array.isArray(answers[question.id])
                    ? (answers[question.id] as string[]).join(', ')
                    : (answers[question.id] as string) || 'Not provided'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
