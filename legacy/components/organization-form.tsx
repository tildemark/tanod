'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { organizationAdminSchema, type OrganizationAdminFormData } from '@/lib/schemas'
import { updateOrganization } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Upload, X } from 'lucide-react'
import Image from 'next/image'

interface OrganizationFormProps {
  organization: any
  onSuccess?: () => void
}

export function OrganizationForm({ organization, onSuccess }: OrganizationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>(organization.logo || '')

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<OrganizationAdminFormData>({
    resolver: zodResolver(organizationAdminSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo || '',
      address: organization.address || '',
      city: organization.city || '',
      country: organization.country || '',
      phone: organization.phone || '',
      email: organization.email || '',
      website: organization.website || '',
      dpoName: organization.dpoName || '',
      dpoEmail: organization.dpoEmail || '',
      industry: organization.industry || '',
      employeeCount: organization.employeeCount?.toString() || '',
      description: organization.description || '',
    },
  })

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()
      setValue('logo', data.url)
      setLogoPreview(data.url)
      setMessage({ type: 'success', text: 'Logo uploaded successfully!' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload logo',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveLogo = () => {
    setValue('logo', '')
    setLogoPreview('')
  }

  const onSubmit = async (data: OrganizationAdminFormData) => {
    setIsLoading(true)
    setMessage(null)

    try {
      const result = await updateOrganization(organization.id, data)

      if (result.success) {
        setMessage({ type: 'success', text: 'Organization updated successfully!' })
        onSuccess?.()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update organization' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>Manage your company information and details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Message Display */}
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

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Your Company Name"
                  disabled={isLoading}
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  {...register('slug')}
                  placeholder="your-company"
                  disabled={isLoading}
                />
                {errors.slug && <p className="text-sm text-red-600 mt-1">{errors.slug.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of your organization"
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  {...register('industry')}
                  placeholder="e.g. Technology, Healthcare"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="employeeCount">Employee Count</Label>
                <Input
                  id="employeeCount"
                  {...register('employeeCount')}
                  type="number"
                  placeholder="Number of employees"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Contact Information</h3>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="Street address"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder="City"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  {...register('country')}
                  placeholder="Country"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+63 2 1234 5678"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="contact@company.com"
                  disabled={isLoading}
                />
                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                {...register('website')}
                placeholder="https://example.com"
                disabled={isLoading}
              />
              {errors.website && <p className="text-sm text-red-600 mt-1">{errors.website.message}</p>}
            </div>
          </div>

          {/* DPO Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Data Protection Officer</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dpoName">DPO Name</Label>
                <Input
                  id="dpoName"
                  {...register('dpoName')}
                  placeholder="Data Protection Officer name"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="dpoEmail">DPO Email</Label>
                <Input
                  id="dpoEmail"
                  type="email"
                  {...register('dpoEmail')}
                  placeholder="dpo@company.com"
                  disabled={isLoading}
                />
                {errors.dpoEmail && (
                  <p className="text-sm text-red-600 mt-1">{errors.dpoEmail.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Logo</h3>

            {logoPreview && (
              <div className="relative w-full border rounded-lg p-4 bg-slate-50">
                <div className="relative h-24 w-full">
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    fill
                    className="object-contain"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={isUploading || isLoading}
                  className="mt-2 w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove Logo
                </Button>
              </div>
            )}

            <div>
              <Label htmlFor="logo-file" className="cursor-pointer">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 hover:bg-slate-50 transition-colors">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">
                    Click to upload logo or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              </Label>
              <input
                id="logo-file"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isUploading || isLoading}
                className="hidden"
              />
            </div>

            <div>
              <Label htmlFor="logo-url">Or paste logo URL</Label>
              <Input
                id="logo-url"
                {...register('logo')}
                placeholder="https://example.com/logo.png"
                disabled={isLoading || isUploading}
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter a URL to your company logo image
              </p>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLoading ? 'Saving...' : 'Save Organization'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
