'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { piaSchema, type PiaFormData } from '@/lib/schemas'
import { createPiaAssessment } from '@/actions/pia'
import { PIA_SECTIONS, RISK_LIBRARY, RISK_IMPACT, RISK_LIKELIHOOD } from '@/lib/pia'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface RiskEntry {
  id: string
  title: string
  context: string
  likelihood: string
  impact: string
  overall: string
  existingControls: string
  recommendedControls: string
  responsibility: string
  targetDate: string
}

interface PiaFormProps {
  orgId: string
}

export function PiaForm({ orgId }: PiaFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [retentionValue, setRetentionValue] = useState('')
  const [retentionUnit, setRetentionUnit] = useState('years')
  const [riskRegister, setRiskRegister] = useState<RiskEntry[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PiaFormData>({
    resolver: zodResolver(piaSchema),
    defaultValues: {
      orgId,
      status: 'DRAFT',
      answers: {},
    },
  })

  const answers = (watch('answers') || {}) as Record<string, string | string[]>

  const computeOverallRisk = (likelihood: string, impact: string) => {
    const score = (value: string) => (value === 'High' ? 3 : value === 'Medium' ? 2 : 1)
    const total = score(likelihood) + score(impact)
    if (total >= 5) return 'High'
    if (total >= 3) return 'Medium'
    return 'Low'
  }

  const syncRiskRegister = (next: RiskEntry[]) => {
    setRiskRegister(next)
    setValue('answers.risk_register', JSON.stringify(next), { shouldDirty: true })
  }

  const addRisk = (title: string) => {
    if (riskRegister.some((risk) => risk.title === title)) return
    const entry: RiskEntry = {
      id: crypto.randomUUID(),
      title,
      context: '',
      likelihood: 'Medium',
      impact: 'Medium',
      overall: 'Medium',
      existingControls: '',
      recommendedControls: '',
      responsibility: '',
      targetDate: '',
    }
    syncRiskRegister([...riskRegister, entry])
  }

  const addCustomRisk = () => {
    const title = prompt('Enter a custom risk')
    if (title) {
      addRisk(title)
    }
  }

  const updateRisk = (id: string, field: keyof RiskEntry, value: string) => {
    const next = riskRegister.map((risk) => {
      if (risk.id !== id) return risk
      const updated = { ...risk, [field]: value }
      updated.overall = computeOverallRisk(updated.likelihood, updated.impact)
      return updated
    })
    syncRiskRegister(next)
  }

  const removeRisk = (id: string) => {
    syncRiskRegister(riskRegister.filter((risk) => risk.id !== id))
  }

  const toggleOption = (questionId: string, value: string, multi?: boolean) => {
    if (multi) {
      const current = Array.isArray(answers[questionId]) ? (answers[questionId] as string[]) : []
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
      setValue(`answers.${questionId}`, next, { shouldDirty: true })
    } else {
      setValue(`answers.${questionId}`, value, { shouldDirty: true })
    }
  }

  const updateRetention = (value: string, unit: string) => {
    setRetentionValue(value)
    setRetentionUnit(unit)
    if (value) {
      setValue('answers.retention', `${value} ${unit}`, { shouldDirty: true })
    } else {
      setValue('answers.retention', '', { shouldDirty: true })
    }
  }

  const onSubmit = async (data: PiaFormData) => {
    setIsSubmitting(true)
    try {
      const result = await createPiaAssessment(data)
      if (result.success && result.data) {
        router.push(`/governance/pia/${result.data.id}`)
      } else {
        alert(result.error || 'Failed to create PIA')
      }
    } catch (error) {
      console.error('PIA submission error:', error)
      alert('An error occurred while creating the PIA')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register('orgId')} />
      <input type="hidden" {...register('status')} />
      <Card>
        <CardHeader>
          <CardTitle>PIA Overview</CardTitle>
          <CardDescription>Capture the core metadata for this assessment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">PIA Title *</Label>
            <Input id="title" placeholder="e.g., Customer Onboarding Platform" {...register('title')} />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Brief summary of the processing" rows={3} {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Process Owner</Label>
            <Input id="owner" placeholder="Department or responsible person" {...register('owner')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select defaultValue="DRAFT" onValueChange={(value) => setValue('status', value as PiaFormData['status'])}>
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
        </CardContent>
      </Card>

      {PIA_SECTIONS.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.description && <CardDescription>{section.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {section.id === 'risk' && (
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Risk register</p>
                    <p className="text-xs text-slate-600">Click to add common risks, then add context and controls.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={addCustomRisk}>Add custom risk</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RISK_LIBRARY.map((risk) => (
                    <Button
                      key={risk}
                      type="button"
                      variant="outline"
                      onClick={() => addRisk(risk)}
                      className="text-xs"
                    >
                      {risk}
                    </Button>
                  ))}
                </div>

                {riskRegister.length === 0 ? (
                  <p className="text-xs text-slate-500">No risks selected yet.</p>
                ) : (
                  <div className="space-y-4">
                    {riskRegister.map((risk) => (
                      <div key={risk.id} className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{risk.title}</p>
                          <Button type="button" variant="ghost" onClick={() => removeRisk(risk.id)}>Remove</Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Context / scenario</Label>
                            <Textarea
                              placeholder="Add context for this risk"
                              rows={3}
                              value={risk.context}
                              onChange={(event) => updateRisk(risk.id, 'context', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Existing controls</Label>
                            <Textarea
                              placeholder="Current safeguards in place"
                              rows={3}
                              value={risk.existingControls}
                              onChange={(event) => updateRisk(risk.id, 'existingControls', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Recommended controls</Label>
                            <Textarea
                              placeholder="Planned enhancements"
                              rows={3}
                              value={risk.recommendedControls}
                              onChange={(event) => updateRisk(risk.id, 'recommendedControls', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Responsibility</Label>
                            <Input
                              placeholder="Owner of the action"
                              value={risk.responsibility}
                              onChange={(event) => updateRisk(risk.id, 'responsibility', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Target date</Label>
                            <Input
                              type="date"
                              value={risk.targetDate}
                              onChange={(event) => updateRisk(risk.id, 'targetDate', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Likelihood</Label>
                            <Select
                              value={risk.likelihood}
                              onValueChange={(value) => updateRisk(risk.id, 'likelihood', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RISK_LIKELIHOOD.map((value) => (
                                  <SelectItem key={value} value={value}>{value}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Impact</Label>
                            <Select
                              value={risk.impact}
                              onValueChange={(value) => updateRisk(risk.id, 'impact', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RISK_IMPACT.map((value) => (
                                  <SelectItem key={value} value={value}>{value}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Overall risk</Label>
                            <Input value={risk.overall} readOnly />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {section.questions.map((question) => (
              <div key={question.id} className="space-y-2">
                <Label htmlFor={question.id}>{question.label}</Label>
                {question.id === 'retention' ? (
                  <div className="flex flex-col gap-2">
                    {question.placeholder && (
                      <p className="text-sm text-slate-600">{question.placeholder}</p>
                    )}
                    <div className="flex gap-3">
                      <Input
                        id="retention_value"
                        type="number"
                        min="1"
                        placeholder="e.g., 5"
                        value={retentionValue}
                        onChange={(event) => updateRetention(event.target.value, retentionUnit)}
                      />
                      <Select
                        value={retentionUnit}
                        onValueChange={(value) => updateRetention(retentionValue, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                          <SelectItem value="years">Years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : question.options && question.options.length > 0 ? (
                  <div className="space-y-2">
                    {question.placeholder && (
                      <p className="text-sm text-slate-600">{question.placeholder}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {question.options.map((item) => {
                        const selected = Array.isArray(answers[question.id])
                          ? (answers[question.id] as string[]).includes(item)
                          : answers[question.id] === item

                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleOption(question.id, item, question.multi)}
                            className={`p-3 text-sm rounded-md border transition-colors ${
                              selected
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            {item}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : question.multiline ? (
                  <Textarea
                    id={question.id}
                    placeholder={question.placeholder}
                    rows={3}
                    {...register(`answers.${question.id}`)}
                  />
                ) : (
                  <Input
                    id={question.id}
                    placeholder={question.placeholder}
                    {...register(`answers.${question.id}`)}
                  />
                )}
                {question.help && <p className="text-xs text-slate-500">{question.help}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Create PIA'
          )}
        </Button>
      </div>
    </form>
  )
}
