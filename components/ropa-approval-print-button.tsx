'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { generateRopaApprovalForm } from '@/actions/ropa'
import { Printer } from 'lucide-react'

interface RopaApprovalPrintButtonProps {
  processId: string
}

export function RopaApprovalPrintButton({ processId }: RopaApprovalPrintButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePrint = async () => {
    setIsLoading(true)
    try {
      const result = await generateRopaApprovalForm(processId)
      if (!result.success || !result.base64 || !result.fileName) {
        throw new Error(result.error || 'Failed to generate approval form')
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
      alert(error instanceof Error ? error.message : 'Failed to generate approval form')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handlePrint} disabled={isLoading}>
      <Printer className="h-4 w-4 mr-2" />
      {isLoading ? 'Preparing...' : 'Download Review & Approval Form'}
    </Button>
  )
}
