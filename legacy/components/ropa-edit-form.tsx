'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { processSchema, type ProcessFormData, DATA_SUBJECTS, DATA_CATEGORIES, LAWFUL_BASIS, RECIPIENTS } from '@/lib/schemas'
import { updateProcess } from '@/actions/ropa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Lightbulb } from 'lucide-react'
import { useSilipConsult } from '@/hooks/useSilipConsult'

interface Department {
  id: string
  name: string
}

interface Process {
  id: string
  deptId: string
  title: string
  description: string | null
  dataSubjects: string[]
  dataCategories: string[]
  lawfulBasis: string
  recipients: string[]
  retentionPeriod: string
  status: string
  riskLevel: string | null
}

interface RopaEditFormProps {
  departments: Department[]
  process: Process
}

export function RopaEditForm({ departments, process }: RopaEditFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState('basics')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { answer, loading, error, consult } = useSilipConsult()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ProcessFormData>({
    resolver: zodResolver(processSchema),
    mode: 'onChange',
    defaultValues: {
      deptId: process.deptId,
      title: process.title,
      description: process.description || '',
      dataSubjects: process.dataSubjects,
      dataCategories: process.dataCategories,
      lawfulBasis: process.lawfulBasis,
      recipients: process.recipients,
      retentionPeriod: process.retentionPeriod,
      status: process.status as 'DRAFT' | 'REVIEW' | 'APPROVED',
      riskLevel: process.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | undefined,
    },
  })

  const [selectedDataSubjects, setSelectedDataSubjects] = useState<string[]>(process.dataSubjects)
  const [selectedDataCategories, setSelectedDataCategories] = useState<string[]>(process.dataCategories)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(process.recipients)
  const processTitle = watch('title')

  const handleTitleBlur = () => {
    if (processTitle && processTitle.length >= 3) {
      consult(processTitle)
    }
  }

  const toggleSelection = (item: string, list: string[], setList: (list: string[]) => void, field: 'dataSubjects' | 'dataCategories' | 'recipients') => {
    const newList = list.includes(item)
      ? list.filter((i) => i !== item)
      : [...list, item]
    setList(newList)
    setValue(field, newList)
  }

  const onSubmit = async (data: ProcessFormData) => {
    setIsSubmitting(true)
    try {
      // Remove riskLevel from update as it's calculated, not user-set
      const updateData = { ...data }
      delete (updateData as any).riskLevel
      
      const result = await updateProcess(process.id, updateData)
      if (result.success) {
        router.push(`/ropa/${process.id}`)
      } else {
        alert(result.error || 'Failed to update process')
      }
    } catch (error) {
      console.error('Submission error:', error)
      alert('An error occurred while updating the process')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basics">1. Basics</TabsTrigger>
          <TabsTrigger value="data">2. Data</TabsTrigger>
          <TabsTrigger value="purpose">3. Purpose & Basis</TabsTrigger>
          <TabsTrigger value="security">4. Security</TabsTrigger>
        </TabsList>

        {/* Step 1: Basics */}
        <TabsContent value="basics" className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="title">Process Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Employee Payroll Processing"
              {...register('title')}
              onBlur={handleTitleBlur}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deptId">Department *</Label>
            <Select defaultValue={process.deptId} onValueChange={(value) => setValue('deptId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.deptId && (
              <p className="text-sm text-red-600">{errors.deptId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the processing activity"
              rows={3}
              {...register('description')}
            />
          </div>

          {(loading || answer || error) && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  Compliance Tip from SILIP
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Consulting Philippine Data Privacy laws...
                  </div>
                ) : error ? (
                  <p className="text-sm text-red-600">{error}</p>
                ) : (
                  <p className="text-sm text-slate-700">{answer}</p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button type="button" onClick={() => setCurrentStep('data')}>
              Next: Data
            </Button>
          </div>
        </TabsContent>

        {/* Step 2: Data */}
        <TabsContent value="data" className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Data Subjects *</Label>
            <p className="text-sm text-slate-600">Select the types of individuals whose data you process</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {DATA_SUBJECTS.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => toggleSelection(subject, selectedDataSubjects, setSelectedDataSubjects, 'dataSubjects')}
                  className={`p-3 text-sm rounded-md border transition-colors ${
                    selectedDataSubjects.includes(subject)
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
            {errors.dataSubjects && (
              <p className="text-sm text-red-600">{errors.dataSubjects.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Data Categories *</Label>
            <p className="text-sm text-slate-600">What types of information are collected?</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {DATA_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleSelection(category, selectedDataCategories, setSelectedDataCategories, 'dataCategories')}
                  className={`p-3 text-sm rounded-md border transition-colors ${
                    selectedDataCategories.includes(category)
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            {errors.dataCategories && (
              <p className="text-sm text-red-600">{errors.dataCategories.message}</p>
            )}
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setCurrentStep('basics')}>
              Back
            </Button>
            <Button type="button" onClick={() => setCurrentStep('purpose')}>
              Next: Purpose
            </Button>
          </div>
        </TabsContent>

        {/* Step 3: Purpose & Basis */}
        <TabsContent value="purpose" className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="lawfulBasis">Lawful Basis *</Label>
            <p className="text-sm text-slate-600">Under what legal ground are you processing this data?</p>
            <Select defaultValue={process.lawfulBasis} onValueChange={(value) => setValue('lawfulBasis', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select lawful basis" />
              </SelectTrigger>
              <SelectContent>
                {LAWFUL_BASIS.map((basis) => (
                  <SelectItem key={basis} value={basis}>
                    {basis}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.lawfulBasis && (
              <p className="text-sm text-red-600">{errors.lawfulBasis.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="retentionPeriod">Retention Period *</Label>
            <p className="text-sm text-slate-600">How long will you keep this data?</p>
            <Input
              id="retentionPeriod"
              placeholder="e.g., 5 years after separation"
              {...register('retentionPeriod')}
            />
            {errors.retentionPeriod && (
              <p className="text-sm text-red-600">{errors.retentionPeriod.message}</p>
            )}
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setCurrentStep('data')}>
              Back
            </Button>
            <Button type="button" onClick={() => setCurrentStep('security')}>
              Next: Security
            </Button>
          </div>
        </TabsContent>

        {/* Step 4: Security */}
        <TabsContent value="security" className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Recipients *</Label>
            <p className="text-sm text-slate-600">Who has access to this data?</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {RECIPIENTS.map((recipient) => (
                <button
                  key={recipient}
                  type="button"
                  onClick={() => toggleSelection(recipient, selectedRecipients, setSelectedRecipients, 'recipients')}
                  className={`p-3 text-sm rounded-md border transition-colors ${
                    selectedRecipients.includes(recipient)
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {recipient}
                </button>
              ))}
            </div>
            {errors.recipients && (
              <p className="text-sm text-red-600">{errors.recipients.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              defaultValue={process.status}
              onValueChange={(value) => setValue('status', value as 'DRAFT' | 'REVIEW' | 'APPROVED')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="REVIEW">Under Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setCurrentStep('purpose')}>
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update ROPA Entry'
              )}
            </Button>
          </div>
          {Object.keys(errors).length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 font-semibold">Please fix the following errors:</p>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {Object.entries(errors).map(([key, error]) => (
                  <li key={key}>{error?.message as string}</li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </form>
  )
}
