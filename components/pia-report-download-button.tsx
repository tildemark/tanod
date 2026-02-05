'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { generatePiaReport } from '@/actions/pia'
import { Download } from 'lucide-react'

interface PiaReportDownloadButtonProps {
  piaId: string
}

export function PiaReportDownloadButton({ piaId }: PiaReportDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      const result = await generatePiaReport(piaId)
      if (!result.success || !result.base64 || !result.fileName) {
        throw new Error(result.error || 'Failed to generate report')
      }

      const bytes = Uint8Array.from(atob(result.base64), (char) => char.charCodeAt(0))
      const blob = new Blob([bytes], { type: result.mimeType || 'application/pdf' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = result.fileName
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to generate report')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={isLoading}>
      <Download className="h-4 w-4 mr-2" />
      {isLoading ? 'Preparing...' : 'Download PIA Report'}
    </Button>
  )
}
