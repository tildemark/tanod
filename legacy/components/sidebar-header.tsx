'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Organization {
  logo?: string | null
  name: string
}

export function SidebarHeader() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await fetch('/api/organization')
        if (response.ok) {
          const data = await response.json()
          setOrganization({
            logo: data.logo || null,
            name: data.name || 'TANOD',
          })
        }
      } catch (error) {
        console.error('Failed to fetch organization:', error)
        setOrganization({ logo: null, name: 'TANOD' })
      } finally {
        setLoading(false)
      }
    }

    fetchOrganization()
  }, [])

  if (loading) {
    return (
      <div className="mb-6 px-4 h-24 bg-slate-200 rounded animate-pulse" />
    )
  }

  return (
    <div className="mb-6 px-4 text-center">
      {organization?.logo ? (
        <>
          <div className="relative h-16 w-full mb-2">
            <Image
              src={organization.logo}
              alt="Company Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-sm font-bold tracking-tight text-slate-800 line-clamp-2">
            {organization.name}
          </h2>
        </>
      ) : (
        <>
          <div className="flex justify-center mb-3">
            <Image
              src="/tanod-logo.svg"
              alt="TANOD Logo"
              width={48}
              height={48}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">TANOD</h1>
          <p className="text-xs text-slate-600">DPO Compliance Platform</p>
        </>
      )}
    </div>
  )
}
