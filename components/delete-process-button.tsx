'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'

interface DeleteProcessButtonProps {
  processId: string
  processTitle: string
}

export function DeleteProcessButton({ processId, processTitle }: DeleteProcessButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
      <DeleteConfirmationDialog
        processId={processId}
        processTitle={processTitle}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
