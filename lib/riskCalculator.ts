import { analyzeProcessWithAI } from '@/lib/ai'

export interface RiskAssessmentResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  score: number
  reasoning: string
  isAI: boolean
  recommendations?: string[]
}

/**
 * Rule-based risk calculation (fallback)
 * Scores each factor independently
 */
export function calculateRiskScoreRuleBased(
  dataCategories: string[],
  dataSubjects: string[],
  retentionPeriod: string,
  recipients: string[]
): { score: number; breakdown: Record<string, number> } {
  let score = 0
  const breakdown: Record<string, number> = {}

  // 1. Data Sensitivity (0-3)
  const sensitiveCategories = [
    'Biometric Data',
    'Health Information',
    'Financial Information',
    'Government IDs',
  ]
  const hasSensitive = dataCategories.some((cat) =>
    sensitiveCategories.some((s) => cat.includes(s))
  )
  breakdown['dataSensitivity'] = hasSensitive ? 3 : 1
  score += breakdown['dataSensitivity']

  // 2. Data Categories Count (0-2)
  breakdown['categoriesCount'] = dataCategories.length >= 5 ? 2 : dataCategories.length >= 3 ? 1 : 0
  score += breakdown['categoriesCount']

  // 3. Data Subjects Count (0-2)
  breakdown['subjectsCount'] = dataSubjects.length >= 4 ? 2 : dataSubjects.length >= 2 ? 1 : 0
  score += breakdown['subjectsCount']

  // 4. Retention Period (0-2)
  const retentionYears = parseInt(retentionPeriod.match(/\d+/)?.[0] || '0')
  breakdown['retentionPeriod'] = retentionYears > 5 ? 2 : retentionYears > 1 ? 1 : 0
  score += breakdown['retentionPeriod']

  // 5. Recipients Count (0-2)
  breakdown['recipients'] = recipients.length >= 5 ? 2 : recipients.length >= 3 ? 1 : 0
  score += breakdown['recipients']

  return { score, breakdown }
}

export function scoreToRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score <= 2) return 'LOW'
  if (score <= 6) return 'MEDIUM'
  return 'HIGH'
}

/**
 * Main risk assessment function
 * Uses AI when available, falls back to rule-based
 */
export async function assessProcessRisk(
  title: string,
  description: string | null,
  dataCategories: string[],
  dataSubjects: string[],
  retentionPeriod: string,
  recipients: string[]
): Promise<RiskAssessmentResult> {
  try {
    // Try AI analysis first
    const aiResult = await analyzeProcessWithAI(
      title,
      description,
      dataCategories,
      dataSubjects
    )

    if (aiResult.isAI && aiResult.success) {
      try {
        const analysis = JSON.parse(aiResult.message)
        return {
          riskLevel: analysis.riskLevel,
          score: analysis.riskLevel === 'HIGH' ? 8 : analysis.riskLevel === 'MEDIUM' ? 4 : 1,
          reasoning: analysis.reasoning,
          isAI: true,
          recommendations: analysis.recommendations,
        }
      } catch {
        // Fall through to rule-based
      }
    }

    // Rule-based fallback
    const { score, breakdown } = calculateRiskScoreRuleBased(
      dataCategories,
      dataSubjects,
      retentionPeriod,
      recipients
    )

    const riskLevel = scoreToRiskLevel(score)

    const reasoning = `Rule-based assessment: ${Object.entries(breakdown)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')} (total=${score})`

    return {
      riskLevel,
      score,
      reasoning,
      isAI: false,
    }
  } catch (error) {
    console.error('Risk assessment error:', error)

    // Ultimate fallback: conservative estimate
    return {
      riskLevel: 'MEDIUM',
      score: 4,
      reasoning: 'Default medium risk assessment',
      isAI: false,
    }
  }
}

/**
 * Calculate risk for multiple processes
 */
export async function assessMultipleProcessRisks(
  processes: Array<{
    id: string
    title: string
    description: string | null
    dataCategories: string[]
    dataSubjects: string[]
    retentionPeriod: string
    recipients: string[]
  }>
): Promise<Record<string, RiskAssessmentResult>> {
  const results: Record<string, RiskAssessmentResult> = {}

  for (const process of processes) {
    results[process.id] = await assessProcessRisk(
      process.title,
      process.description,
      process.dataCategories,
      process.dataSubjects,
      process.retentionPeriod,
      process.recipients
    )
  }

  return results
}
