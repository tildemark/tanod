'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createIncident } from '@/actions/incident'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const defaultForm = {
  title: '',
  occurrenceDate: '',
  severity: '',
  impactedIndividuals: '',
  systemsAffected: '',
  summary: '',
}

type FormState = typeof defaultForm

export function ReportIncidentDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm(defaultForm)
      setErrors({})
      setSubmitted(false)
      setIsSubmitting(false)
    }
  }, [open])

  const isValid = useMemo(() => {
    return Boolean(form.title && form.occurrenceDate && form.severity)
  }, [form])

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: Partial<Record<keyof FormState, string>> = {}
    if (!form.title.trim()) nextErrors.title = 'Incident title is required.'
    if (!form.occurrenceDate) nextErrors.occurrenceDate = 'Occurrence date is required.'
    if (!form.severity) nextErrors.severity = 'Select a severity level.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)

    const result = await createIncident({
      title: form.title,
      occurrenceDate: form.occurrenceDate,
      severity: form.severity,
      impactedIndividuals: form.impactedIndividuals,
      systemsAffected: form.systemsAffected,
      summary: form.summary,
    })

    setIsSubmitting(false)

    if (result.success) {
      setSubmitted(true)
    } else {
      setErrors({ title: result.error || 'Failed to create incident' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          Report Incident
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        {submitted ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Incident reported</DialogTitle>
              <DialogDescription>
                Your incident has been recorded for internal review.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="font-medium">Next steps</p>
                <p>
                  Notify the DPO, assign an incident owner, and confirm whether NPC
                  notification is required within 72 hours.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button onClick={() => setSubmitted(false)}>Report another</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Report an incident</DialogTitle>
              <DialogDescription>
                Capture the initial breach details so the DPO can triage quickly.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="incident-title">Incident title</Label>
              <Input
                id="incident-title"
                placeholder="Unauthorized access to payroll database"
                value={form.title}
                onChange={(event) => handleChange('title', event.target.value)}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="incident-date">Occurrence date</Label>
                <Input
                  id="incident-date"
                  type="date"
                  value={form.occurrenceDate}
                  onChange={(event) => handleChange('occurrenceDate', event.target.value)}
                />
                {errors.occurrenceDate && (
                  <p className="text-xs text-red-500">{errors.occurrenceDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Severity level</Label>
                <Select
                  value={form.severity}
                  onValueChange={(value) => handleChange('severity', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
                {errors.severity && (
                  <p className="text-xs text-red-500">{errors.severity}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="impacted">Estimated impacted individuals</Label>
                <Input
                  id="impacted"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.impactedIndividuals}
                  onChange={(event) => handleChange('impactedIndividuals', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="systems">Systems affected</Label>
                <Input
                  id="systems"
                  placeholder="HRIS, payroll, email"
                  value={form.systemsAffected}
                  onChange={(event) => handleChange('systemsAffected', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Incident summary</Label>
              <Textarea
                id="summary"
                placeholder="Describe what happened and what data was exposed..."
                value={form.summary}
                onChange={(event) => handleChange('summary', event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting
                  </span>
                ) : (
                  'Submit incident'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
