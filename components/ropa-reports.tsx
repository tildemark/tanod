'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Department {
  name: string
}

interface ProcessReportItem {
  id: string
  title: string
  status: string
  riskLevel: string | null
  lawfulBasis: string
  retentionPeriod: string
  dataSubjects: string[]
  dataCategories: string[]
  recipients: string[]
  updatedAt: string | Date
  department?: Department | null
}

interface RopaReportsProps {
  processes: ProcessReportItem[]
}

const STATUS_ORDER = ['DRAFT', 'REVIEW', 'APPROVED']
const STATUS_COLORS = ['#f59e0b', '#6366f1', '#10b981']
const RISK_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'UNASSESSED']
const RISK_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#94a3b8']

function formatDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function toCsvValue(value: string) {
  const needsQuotes = /[",\n]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

export function RopaReports({ processes }: RopaReportsProps) {
  const hasData = processes.length > 0

  const statusData = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      name: status,
      value: processes.filter((process) => process.status === status).length,
    }))
  }, [processes])

  const riskData = useMemo(() => {
    return RISK_ORDER.map((risk) => ({
      name: risk,
      value: processes.filter((process) => (process.riskLevel || 'UNASSESSED') === risk).length,
    }))
  }, [processes])

  const departmentData = useMemo(() => {
    const counts = new Map<string, number>()
    processes.forEach((process) => {
      const name = process.department?.name || 'Unassigned'
      counts.set(name, (counts.get(name) || 0) + 1)
    })

    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
  }, [processes])

  const exportRows = useMemo(() => {
    return processes.map((process) => ({
      Title: process.title,
      Department: process.department?.name || 'Unassigned',
      Status: process.status,
      Risk: process.riskLevel || 'UNASSESSED',
      LawfulBasis: process.lawfulBasis,
      RetentionPeriod: process.retentionPeriod,
      DataSubjects: process.dataSubjects.join('; '),
      DataCategories: process.dataCategories.join('; '),
      Recipients: process.recipients.join('; '),
      UpdatedAt: formatDate(process.updatedAt),
    }))
  }, [processes])

  const handleExportCsv = () => {
    const headers = Object.keys(exportRows[0] || {})
    const csvLines = [headers.join(',')]

    exportRows.forEach((row) => {
      const line = headers.map((header) => toCsvValue(String((row as Record<string, string>)[header] || '')))
      csvLines.push(line.join(','))
    })

    const csvContent = csvLines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ropa-report-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ROPA Report')
    XLSX.writeFile(workbook, `ropa-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('ROPA Report', 14, 16)

    const headers = Object.keys(exportRows[0] || {})
    const body = exportRows.map((row) => headers.map((header) => (row as Record<string, string>)[header] || ''))

    autoTable(doc, {
      head: [headers],
      body,
      startY: 24,
      styles: {
        fontSize: 8,
      },
    })

    doc.save(`ropa-report-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ROPA Reports</CardTitle>
        <CardDescription>Static charts and export-ready summaries</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={!hasData}>Export Excel</Button>
          <Button variant="outline" onClick={handleExportCsv} disabled={!hasData}>Export CSV</Button>
          <Button variant="outline" onClick={handleExportPdf} disabled={!hasData}>Export PDF</Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90}>
                    {statusData.map((entry, index) => (
                      <Cell key={`status-${entry.name}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Levels</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value">
                    {riskData.map((entry, index) => (
                      <Cell key={`risk-${entry.name}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Processes by Department</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
