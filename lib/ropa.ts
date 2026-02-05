export function formatTrackingCode(processId: string, createdAt: Date) {
  const date = new Date(createdAt)
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const normalized = processId.replace(/[^a-z0-9]/gi, '').toUpperCase()
  const idSegment = normalized.length >= 8 ? normalized.slice(0, 8) : normalized.padEnd(8, 'X')
  return `ROPA-${idSegment}-${stamp}`
}
