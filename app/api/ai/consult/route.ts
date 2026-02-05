import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const silipUrl = process.env.NEXT_PUBLIC_SILIP_API_URL || 'https://silip.sanchez.ph/api'
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const response = await fetch(`${silipUrl}/consult`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json(
        {
          answer:
            'If consent is not practical, consider legitimate interests or legal obligation; document the purpose, data minimization, and retention period aligned with Philippine Data Privacy Act requirements.',
          source: 'RuleBased',
          error: `SILIP API error: ${response.status}`,
        },
        { status: 200 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      answer: data.answer || data.response || 'No response from SILIP',
      source: 'SILIP',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        answer:
          'Start with a lawful basis (consent, contract, legal obligation, vital interests, or legitimate interests). Ensure purpose limitation, data minimization, and a clear retention period under the Philippine Data Privacy Act.',
        source: 'RuleBased',
        error: message,
      },
      { status: 200 }
    )
  }
}
