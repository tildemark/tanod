'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export function AIStatus() {
  const [status, setStatus] = useState<{
    enabled: boolean
    silipAvailable: boolean
    silipUrl: string
    provider: string
    loading: boolean
  }>({
    enabled: false,
    silipAvailable: false,
    silipUrl: '',
    provider: 'SILIP',
    loading: true,
  })

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/ai/status')
        const data = await response.json()
        setStatus({ ...data, loading: false })
      } catch {
        setStatus((prev) => ({ ...prev, loading: false }))
      }
    }

    checkStatus()
  }, [])

  if (status.loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Checking AI...</span>
      </div>
    )
  }

  if (!status.enabled) {
    return (
      <Badge variant="outline" className="gap-2">
        <AlertCircle className="h-3 w-3" />
        AI Disabled
      </Badge>
    )
  }

  if (!status.silipAvailable) {
    return (
      <Badge variant="destructive" className="gap-2">
        <AlertCircle className="h-3 w-3" />
        Using Rule-Based
      </Badge>
    )
  }

  return (
    <Badge variant="default" className="gap-2 bg-blue-600">
      <CheckCircle2 className="h-3 w-3" />
      SILIP Ready
    </Badge>
  )
}
