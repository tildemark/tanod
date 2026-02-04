import { getProcessById } from '@/actions/ropa'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { DeleteProcessButton } from '@/components/delete-process-button'

interface ProcessDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProcessDetailPage({ params }: ProcessDetailPageProps) {
  const { id } = await params
  const result = await getProcessById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const process = result.data

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REVIEW':
        return 'bg-yellow-100 text-yellow-800'
      case 'DRAFT':
        return 'bg-slate-100 text-slate-800'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  const getRiskColor = (risk: string | null) => {
    switch (risk) {
      case 'HIGH':
        return 'bg-red-100 text-red-800'
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800'
      case 'LOW':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {process.title}
            </h1>
            <p className="text-slate-600 mt-1">
              {process.department.name} • {process.department.org.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/ropa/${process.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <DeleteProcessButton processId={process.id} processTitle={process.title} />
        </div>
      </div>

      {/* Status and Risk */}
      <div className="flex gap-4">
        <div>
          <p className="text-sm text-slate-600 mb-1">Status</p>
          <Badge className={getStatusColor(process.status)} variant="secondary">
            {process.status}
          </Badge>
        </div>
        <div>
          <p className="text-sm text-slate-600 mb-1">Risk Level</p>
          <Badge className={getRiskColor(process.riskLevel)} variant="secondary">
            {process.riskLevel || 'Not Assessed'}
          </Badge>
        </div>
        <div>
          <p className="text-sm text-slate-600 mb-1">Last Updated</p>
          <p className="text-sm font-medium">
            {new Date(process.updatedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Description */}
      {process.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">{process.description}</p>
          </CardContent>
        </Card>
      )}

      {/* The 5 Pillars of ROPA */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Data Subjects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Subjects</CardTitle>
            <CardDescription>Who is affected by this processing?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {process.dataSubjects.map((subject: string) => (
                <Badge key={subject} variant="outline" className="text-slate-700">
                  {subject}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Categories</CardTitle>
            <CardDescription>What information is collected?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {process.dataCategories.map((category: string) => (
                <Badge key={category} variant="outline" className="text-slate-700">
                  {category}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lawful Basis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lawful Basis</CardTitle>
            <CardDescription>Legal ground for processing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium text-slate-900">{process.lawfulBasis}</p>
          </CardContent>
        </Card>

        {/* Retention Period */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Retention Period</CardTitle>
            <CardDescription>How long data is kept</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium text-slate-900">{process.retentionPeriod}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recipients & Access</CardTitle>
          <CardDescription>Who has access to this data?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {process.recipients.map((recipient: string) => (
              <Badge key={recipient} variant="outline" className="text-slate-700">
                {recipient}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Process ID:</span>
            <span className="font-mono text-slate-900">{process.id}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-slate-600">Created:</span>
            <span className="text-slate-900">
              {new Date(process.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Last Updated:</span>
            <span className="text-slate-900">
              {new Date(process.updatedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
