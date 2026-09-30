/**
 * TANOD AI Module - Risk Assessment using SILIP (Philippine Legal AI)
 * 
 * Hybrid approach:
 * 1. Primary: SILIP API (Philippine legal expertise, source citations, NPC-aligned)
 * 2. Fallback: Rule-based scoring (when SILIP unavailable)
 * 
 * No external API keys required - SILIP is free and Philippines-focused
 */

export interface AIConfig {
  enabled: boolean
  silipUrl: string
}

export interface AIResponse {
  success: boolean
  message: string
  isAI: boolean // false = fallback
  error?: string
  source?: string // SILIP or RuleBased
}

const getAIConfig = (): AIConfig => {
  return {
    enabled: process.env.AI_ENABLED !== 'false',
    silipUrl: process.env.NEXT_PUBLIC_SILIP_API_URL || 'https://silip.sanchez.ph/api',
  }
}

let isSilipAvailable = true

export async function analyzeProcessWithAI(
  title: string,
  description: string | null,
  dataCategories: string[],
  dataSubjects: string[]
): Promise<AIResponse> {
  const config = getAIConfig()

  // Check if AI is enabled
  if (!config.enabled || !isSilipAvailable) {
    return {
      success: true,
      message: 'Using rule-based analysis (SILIP unavailable)',
      isAI: false,
      source: 'RuleBased',
    }
  }

  try {
    // Use SILIP to analyze the processing activity
    const prompt = `As a Philippine Data Protection Officer expert, analyze this data processing activity under RA 10173 and provide risk assessment.

Process Title: ${title}
Description: ${description || 'No description provided'}
Data Categories: ${dataCategories.join(', ')}
Data Subjects: ${dataSubjects.join(', ')}

Provide:
1. Risk Level (LOW/MEDIUM/HIGH)
2. Key compliance requirements
3. Data protection recommendations
4. Retention period guidance

Format as JSON:
{
  "riskLevel": "LOW|MEDIUM|HIGH",
  "reasoning": "brief explanation",
  "requirements": ["req 1", "req 2"],
  "recommendations": ["rec 1", "rec 2"]
}`

    const response = await fetch(`${config.silipUrl}/consult`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: prompt }),
      timeout: 10000,
    })

    if (!response.ok) {
      throw new Error(`SILIP API error: ${response.status}`)
    }

    const data = await response.json()

    // Extract the answer and try to parse as JSON
    const answer = data.answer || data.response || ''
    const jsonMatch = answer.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0])
      return {
        success: true,
        message: JSON.stringify(analysis),
        isAI: true,
        source: 'SILIP',
      }
    }

    return {
      success: true,
      message: `Using rule-based analysis (SILIP response parsing failed)`,
      isAI: false,
      source: 'RuleBased',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error('SILIP Analysis Error:', errorMessage)

    // Mark SILIP as temporarily unavailable
    isSilipAvailable = false
    console.warn('⚠️ SILIP unavailable, switching to rule-based analysis')

    return {
      success: true,
      message: 'Using rule-based analysis (SILIP unavailable)',
      isAI: false,
      error: errorMessage,
      source: 'RuleBased',
    }
  }
}

export function resetAIStatus() {
  isSilipAvailable = true
  console.log('✅ AI status reset - SILIP reconnection attempted')
}

export function getAIStatus() {
  const config = getAIConfig()
  return {
    enabled: config.enabled,
    silipAvailable: isSilipAvailable,
    silipUrl: config.silipUrl,
    provider: 'SILIP (Philippine Legal AI)',
  }
}
