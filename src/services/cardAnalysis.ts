export interface DamageRegion {
  x: number
  y: number
  width: number
  height: number
  type: 'corner' | 'edge' | 'scratch' | 'crease'
  severity: 'minor' | 'moderate' | 'major'
  label: string
}

export interface PSAEstimation {
  grade: number
  label: string
  confidence: number
  shouldSend: boolean
  reasoning: string[]
  damageRegions: DamageRegion[]
}

export interface FakeDetection {
  isSuspect: boolean
  confidence: number
  flags: string[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sampleBrightness(data: Uint8ClampedArray, imgW: number, x: number, y: number, w: number, h: number): number[] {
  const samples: number[] = []
  const step = Math.max(1, Math.floor(Math.min(w, h) / 8))
  for (let py = y; py < y + h; py += step) {
    for (let px = x; px < x + w; px += step) {
      const idx = (py * imgW + px) * 4
      samples.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3)
    }
  }
  return samples
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  return Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length)
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

// Corner wear shows as BRIGHT (white) pixels where the edge should be dark/colored.
// A worn corner has high average brightness in that tiny region.
function analyzeCorner(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  corner: 'tl' | 'tr' | 'bl' | 'br'
): { worn: boolean; severity: DamageRegion['severity']; brightness: number } {
  const size = Math.floor(Math.min(imgW, imgH) * 0.055) // ~5.5% of shorter dimension
  const x = corner.includes('r') ? imgW - size : 0
  const y = corner.includes('b') ? imgH - size : 0
  const samples = sampleBrightness(data, imgW, x, y, size, size)
  const avg = mean(samples)
  const dev = stdDev(samples)

  // Worn corners are bright (whitened) AND have low variance (uniform white smear)
  const worn = avg > 200 && dev < 30
  const severity: DamageRegion['severity'] = avg > 230 ? 'major' : avg > 215 ? 'moderate' : 'minor'
  return { worn, severity, brightness: avg }
}

// Edge wear: look for high variance along a thin strip (fraying/nicks)
function analyzeEdge(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  edge: 'top' | 'bottom' | 'left' | 'right'
): { damaged: boolean; severity: DamageRegion['severity'] } {
  const strip = Math.floor(Math.min(imgW, imgH) * 0.03)
  const cornerSkip = Math.floor(Math.min(imgW, imgH) * 0.06)
  let x = 0, y = 0, w = 0, h = 0
  if (edge === 'top')    { x = cornerSkip; y = 0; w = imgW - cornerSkip * 2; h = strip }
  if (edge === 'bottom') { x = cornerSkip; y = imgH - strip; w = imgW - cornerSkip * 2; h = strip }
  if (edge === 'left')   { x = 0; y = cornerSkip; w = strip; h = imgH - cornerSkip * 2 }
  if (edge === 'right')  { x = imgW - strip; y = cornerSkip; w = strip; h = imgH - cornerSkip * 2 }

  const samples = sampleBrightness(data, imgW, x, y, w, h)
  const dev = stdDev(samples)
  // A clean edge has LOW variance (uniform color). Nicks/wear = high variance spikes.
  const damaged = dev > 55
  const severity: DamageRegion['severity'] = dev > 75 ? 'major' : dev > 63 ? 'moderate' : 'minor'
  return { damaged, severity }
}

// Surface scratches: look for bright streaks across the main body
function analyzeSurface(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number
): { scratched: boolean; severity: DamageRegion['severity'] } {
  const margin = Math.floor(Math.min(imgW, imgH) * 0.12)
  const cx = margin, cy = margin
  const cw = imgW - margin * 2, ch = imgH - margin * 2
  const samples = sampleBrightness(data, imgW, cx, cy, cw, ch)
  const dev = stdDev(samples)
  // High surface variance = scratches/creases. Threshold higher than edges to avoid false positives.
  const scratched = dev > 65
  const severity: DamageRegion['severity'] = dev > 85 ? 'major' : dev > 73 ? 'moderate' : 'minor'
  return { scratched, severity }
}

// ─── Main export ────────────────────────────────────────────────────────────

export async function analyzeCardImage(canvas: HTMLCanvasElement): Promise<PSAEstimation> {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas context')

  const w = canvas.width
  const h = canvas.height
  const { data } = ctx.getImageData(0, 0, w, h)

  const reasoning: string[] = []
  const damageRegions: DamageRegion[] = []

  // ── Corners ──────────────────────────────────────────────────────────
  const corners = [
    { key: 'tl' as const, label: 'Top-left corner',     xPct: 0,       yPct: 0 },
    { key: 'tr' as const, label: 'Top-right corner',    xPct: 94.5,    yPct: 0 },
    { key: 'bl' as const, label: 'Bottom-left corner',  xPct: 0,       yPct: 94.5 },
    { key: 'br' as const, label: 'Bottom-right corner', xPct: 94.5,    yPct: 94.5 },
  ]

  let wornCorners = 0
  for (const c of corners) {
    const result = analyzeCorner(data, w, h, c.key)
    if (result.worn) {
      wornCorners++
      damageRegions.push({ x: c.xPct, y: c.yPct, width: 5.5, height: 5.5, type: 'corner', severity: result.severity, label: c.label })
    }
  }

  if (wornCorners === 0) reasoning.push('All four corners appear sharp and undamaged')
  else reasoning.push(`${wornCorners} corner${wornCorners > 1 ? 's' : ''} show whitening/wear`)

  // ── Edges ────────────────────────────────────────────────────────────
  const edgeMap = [
    { key: 'top' as const,    label: 'Top edge',    xPct: 5, yPct: 0,    wPct: 90, hPct: 3 },
    { key: 'bottom' as const, label: 'Bottom edge', xPct: 5, yPct: 97,   wPct: 90, hPct: 3 },
    { key: 'left' as const,   label: 'Left edge',   xPct: 0, yPct: 5,    wPct: 3,  hPct: 90 },
    { key: 'right' as const,  label: 'Right edge',  xPct: 97, yPct: 5,   wPct: 3,  hPct: 90 },
  ]

  let damagedEdges = 0
  for (const e of edgeMap) {
    const result = analyzeEdge(data, w, h, e.key)
    if (result.damaged) {
      damagedEdges++
      damageRegions.push({ x: e.xPct, y: e.yPct, width: e.wPct, height: e.hPct, type: 'edge', severity: result.severity, label: e.label })
    }
  }

  if (damagedEdges > 0) reasoning.push(`${damagedEdges} edge${damagedEdges > 1 ? 's' : ''} show nicks or wear`)

  // ── Surface ──────────────────────────────────────────────────────────
  const surface = analyzeSurface(data, w, h)
  if (surface.scratched) {
    damageRegions.push({ x: 8, y: 12, width: 84, height: 70, type: surface.severity === 'major' ? 'crease' : 'scratch', severity: surface.severity, label: surface.severity === 'major' ? 'Surface crease or heavy scratching' : 'Light surface scratches' })
    reasoning.push(surface.severity === 'major' ? 'Significant surface damage detected' : 'Light surface scratching')
  } else {
    reasoning.push('Surface appears clean with no major scratches')
  }

  // ── Grade calculation ─────────────────────────────────────────────
  // Start from 9 — a card in hand is probably not gem mint.
  // Deduct based on confirmed damage only.
  let grade = 9

  const majorDmg = damageRegions.filter(r => r.severity === 'major').length
  const modDmg   = damageRegions.filter(r => r.severity === 'moderate').length
  const minorDmg = damageRegions.filter(r => r.severity === 'minor').length

  grade -= majorDmg  * 2.5
  grade -= modDmg    * 1.2
  grade -= minorDmg  * 0.4

  // Clamp and round to nearest 0.5
  grade = Math.max(1, Math.min(9, Math.round(grade * 2) / 2))

  const labels: Record<number, string> = {
    9: 'Mint', 8.5: 'Near Mint-Mint+', 8: 'Near Mint-Mint',
    7: 'Near Mint', 6: 'Excellent-Near Mint', 5: 'Excellent',
    4: 'Very Good-Excellent', 3: 'Very Good', 2: 'Good', 1: 'Poor',
  }

  const label = labels[grade] ?? 'Fair'
  // Worth sending if PSA 8+ AND card has real value (check done in CardDetails)
  const shouldSend = grade >= 8

  // Confidence: lower when few damage signals found (harder to be sure)
  const signals = damageRegions.length
  const confidence = signals === 0 ? 0.55 : signals <= 2 ? 0.70 : 0.80

  reasoning.push('Note: For official grading, always consult a PSA-certified submission.')

  return { grade, label, confidence, shouldSend, reasoning, damageRegions }
}

export function detectFake(card: { name: string; rarity?: string }): FakeDetection {
  const flags: string[] = []
  const highValueTargets = ['charizard', 'pikachu', 'mewtwo', 'umbreon', 'rayquaza', 'lugia', 'mew', 'gengar', 'eevee']
  const isHighValue = highValueTargets.some(n => card.name?.toLowerCase().includes(n))

  if (isHighValue) {
    flags.push('High-demand card — commonly counterfeited. Compare holo pattern and font weight against a verified copy.')
    flags.push('Check card weight (authentic ≈ 1.75g) and back texture — fakes often feel slicker or thicker.')
  }

  const r = card.rarity?.toLowerCase() ?? ''
  if (r.includes('secret') || r.includes('rainbow') || r.includes('gold')) {
    flags.push('Secret rares are frequent targets for counterfeiting. Verify the card number matches the set total.')
  }

  return { isSuspect: false, confidence: 0.5, flags }
}
