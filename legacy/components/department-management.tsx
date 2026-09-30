'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { departmentAdminSchema, type DepartmentAdminFormData } from '@/lib/schemas'
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2, Edit2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Department {
  id: string
  name: string
  description?: string | null
  _count?: { processes: number }
}

interface DepartmentManagementProps {
  orgId: string
  departments: Department[]
  onSuccess?: () => void
}

export function DepartmentManagement({
  orgId,
  departments,
  onSuccess,
}: DepartmentManagementProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentAdminFormData>({
    resolver: zodResolver(departmentAdminSchema),
    defaultValues: {
      name: '',
      description: '',
      orgId,
    },
  })

  const onSubmit = async (data: DepartmentAdminFormData) => {
    setIsLoading(true)
    setMessage(null)

    try {
      let result

      if (editingDept) {
        result = await updateDepartment(editingDept.id, {
          name: data.name,
          description: data.description,
        })
      } else {
        result = await createDepartment({
          name: data.name,
          description: data.description,
          orgId,
        })
      }

      if (result.success) {
        setMessage({
          type: 'success',
          text: editingDept ? 'Department updated!' : 'Department created!',
        })
        reset()
        setEditingDept(null)
        setIsOpen(false)
        onSuccess?.()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save department' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (deptId: string) => {
    setIsLoading(true)
    try {
      const result = await deleteDepartment(deptId)

      if (result.success) {
        setMessage({ type: 'success', text: 'Department deleted!' })
        setDeleteConfirmId(null)
        onSuccess?.()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete department' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingDept(null)
    reset({ name: '', description: '', orgId })
    setIsOpen(true)
  }

  const openEditDialog = (dept: Department) => {
    setEditingDept(dept)
    reset({
      name: dept.name,
      description: dept.description || '',
      orgId,
    })
    setIsOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Departments</CardTitle>
          <CardDescription>Manage your organization's departments</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
              <DialogDescription>
                {editingDept
                  ? 'Update department details'
                  : 'Add a new department to your organization'}
              </DialogDescription>
            </DialogHeader>

            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Department Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g. Human Resources, IT"
                  disabled={isLoading}
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Brief description of the department"
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingDept ? 'Update Department' : 'Create Department'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {departments.length === 0 ? (
          <p className="text-center py-8 text-slate-500">
            No departments yet. Create one to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">{dept.name}</h4>
                  {dept.description && (
                    <p className="text-sm text-slate-600 mt-1">{dept.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {dept._count?.processes && dept._count.processes > 0 && (
                      <Badge variant="outline">
                        {dept._count.processes} process{dept._count.processes !== 1 ? 'es' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(dept)}
                    disabled={isLoading}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirmId(dept.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirmId && (
          <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Department</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this department? This action cannot be undone.
                  {departments.find(d => d.id === deleteConfirmId)?._count?.processes ? (
                    <p className="text-red-600 font-semibold mt-2">
                      This department has processes. Delete them first.
                    </p>
                  ) : null}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3 justify-end">
                <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (deleteConfirmId) handleDelete(deleteConfirmId)
                  }}
                  disabled={isLoading}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  )
}
