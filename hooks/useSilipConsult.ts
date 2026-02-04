'use client'

import { useState, useCallback } from 'react'

interface SilipResponse {
  answer: string
  loading: boolean
  error: string | null
}

export function useSilipConsult() {
  const [response, setResponse] = useState<SilipResponse>({
    answer: '',
    loading: false,
    error: null,
  })

  const consult = useCallback(async (processTitle: string) => {
    if (!processTitle || processTitle.length < 3) {
      return
    }

    setResponse({ answer: '', loading: true, error: null })

    try {
      const silipUrl = process.env.NEXT_PUBLIC_SILIP_API_URL || 'https://silip.sanchez.ph/api'
      const prompt = `What is the lawful basis under the Philippine Data Privacy Act for ${processTitle}? Provide a brief, practical answer for a Data Protection Officer.`

      const res = await fetch(`${silipUrl}/consult`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: prompt }),
      })

      if (!res.ok) {
        throw new Error('Failed to fetch from SILIP API')
      }

      const data = await res.json()

      setResponse({
        answer: data.answer || 'No response from SILIP',
        loading: false,
        error: null,
      })
    } catch (error) {
      setResponse({
        answer: '',
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      })
    }
  }, [])

  const reset = useCallback(() => {
    setResponse({ answer: '', loading: false, error: null })
  }, [])

  return { ...response, consult, reset }
}
