import { getAIStatus } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function GET() {
  const status = getAIStatus()
  return NextResponse.json(status)
}
