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

// ─── Corner analysis ─────────────────────────────────────────────────────────
// Detects TWO kinds of corner damage:
//   1. Smooth white wear  — avg bright (>200) AND low variance (<30) = rubbed white
//   2. Ripped / torn      — high variance (>45) = jagged edges, exposed paper core
// A perfectly fine corner is NOT bright-white AND has moderate uniform variance.

function analyzeCorner(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  corner: 'tl' | 'tr' | 'bl' | 'br'
): { worn: boolean; severity: DamageRegion['severity']; brightness: number } {
  const size = Math.floor(Math.min(imgW, imgH) * 0.055)
  const x = corner.includes('r') ? imgW - size : 0
  const y = corner.includes('b') ? imgH - size : 0
  const samples = sampleBrightness(data, imgW, x, y, size, size)
  const avg = mean(samples)
  const dev = stdDev(samples)

  // Type 1: smooth whitening (NM→LP wear)
  const smoothWear = avg > 195 && dev < 35

  // Type 2: ripped/torn/crushed — chaotic pixel variance
  const tornOrCrushed = dev > 45

  const worn = smoothWear || tornOrCrushed

  let severity: DamageRegion['severity']
  if (tornOrCrushed) {
    severity = dev > 70 ? 'major' : dev > 55 ? 'moderate' : 'minor'
  } else {
    severity = avg > 228 ? 'major' : avg > 212 ? 'moderate' : 'minor'
  }

  return { worn, severity, brightness: avg }
}

// ─── Edge analysis ───────────────────────────────────────────────────────────
// High variance along a thin strip = nicks, tears, fraying.
// Threshold lowered so heavy ripping is caught as major.

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

  // Lowered from 55 → 45 so heavy tears are always caught
  const damaged = dev > 45
  const severity: DamageRegion['severity'] = dev > 70 ? 'major' : dev > 55 ? 'moderate' : 'minor'
  return { damaged, severity }
}

// ─── Surface analysis ────────────────────────────────────────────────────────
// High variance across the main body = scratches, creases, tears.
// Threshold lowered from 65 → 55 to catch heavy damage.

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

  const scratched = dev > 55
  const severity: DamageRegion['severity'] = dev > 78 ? 'major' : dev > 65 ? 'moderate' : 'minor'
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
    { key: 'tl' as const, label: 'Top-left corner',     xPct: 0,    yPct: 0 },
    { key: 'tr' as const, label: 'Top-right corner',    xPct: 94.5, yPct: 0 },
    { key: 'bl' as const, label: 'Bottom-left corner',  xPct: 0,    yPct: 94.5 },
    { key: 'br' as const, label: 'Bottom-right corner', xPct: 94.5, yPct: 94.5 },
  ]

  let wornCorners = 0
  for (const c of corners) {
    const result = analyzeCorner(data, w, h, c.key)
    if (result.worn) {
      wornCorners++
      damageRegions.push({
        x: c.xPct, y: c.yPct, width: 5.5, height: 5.5,
        type: 'corner', severity: result.severity, label: c.label,
      })
    }
  }

  if (wornCorners === 0) reasoning.push('All four corners appear sharp and undamaged')
  else if (wornCorners === 4) reasoning.push('All four corners show damage — heavy wear or tearing detected')
  else reasoning.push(`${wornCorners} corner${wornCorners > 1 ? 's' : ''} show whitening, wear, or tearing`)

  // ── Edges ────────────────────────────────────────────────────────────
  const edgeMap = [
    { key: 'top' as const,    label: 'Top edge',    xPct: 5,  yPct: 0,  wPct: 90, hPct: 3 },
    { key: 'bottom' as const, label: 'Bottom edge', xPct: 5,  yPct: 97, wPct: 90, hPct: 3 },
    { key: 'left' as const,   label: 'Left edge',   xPct: 0,  yPct: 5,  wPct: 3,  hPct: 90 },
    { key: 'right' as const,  label: 'Right edge',  xPct: 97, yPct: 5,  wPct: 3,  hPct: 90 },
  ]

  let damagedEdges = 0
  for (const e of edgeMap) {
    const result = analyzeEdge(data, w, h, e.key)
    if (result.damaged) {
      damagedEdges++
      damageRegions.push({
        x: e.xPct, y: e.yPct, width: e.wPct, height: e.hPct,
        type: 'edge', severity: result.severity, label: e.label,
      })
    }
  }

  if (damagedEdges > 0)
    reasoning.push(`${damagedEdges} edge${damagedEdges > 1 ? 's' : ''} show nicks, tears, or wear`)

  // ── Surface ──────────────────────────────────────────────────────────
  const surface = analyzeSurface(data, w, h)
  if (surface.scratched) {
    damageRegions.push({
      x: 8, y: 12, width: 84, height: 70,
      type: surface.severity === 'major' ? 'crease' : 'scratch',
      severity: surface.severity,
      label: surface.severity === 'major' ? 'Heavy surface damage / creasing' : 'Light surface scratches',
    })
    reasoning.push(
      surface.severity === 'major' ? 'Significant surface damage or crease detected'
        : surface.severity === 'moderate' ? 'Moderate surface scratching'
        : 'Light surface scratching visible'
    )
  } else {
    reasoning.push('Surface appears clean with no major scratches')
  }

  // ── Grade calculation ─────────────────────────────────────────────────
  // Start at 8 — most cards being held up to a camera are NM, not gem mint.
  // Heavier deductions than before so truly trashed cards actually bottom out.
  let grade = 8

  const majorDmg  = damageRegions.filter(r => r.severity === 'major').length
  const modDmg    = damageRegions.filter(r => r.severity === 'moderate').length
  const minorDmg  = damageRegions.filter(r => r.severity === 'minor').length

  grade -= majorDmg  * 3.0   // was 2.5
  grade -= modDmg    * 1.5   // was 1.2
  grade -= minorDmg  * 0.5   // was 0.4

  // Clamp 1–9, round to nearest 0.5
  grade = Math.max(1, Math.min(9, Math.round(grade * 2) / 2))

  const labels: Record<number, string> = {
    9: 'Mint', 8.5: 'Near Mint-Mint+', 8: 'Near Mint-Mint',
    7: 'Near Mint', 6: 'Excellent-Near Mint', 5: 'Excellent',
    4: 'Very Good-Excellent', 3: 'Very Good', 2: 'Good', 1: 'Poor',
  }

  const label = labels[grade] ?? 'Fair'
  const shouldSend = grade >= 8

  const signals = damageRegions.length
  const confidence = signals === 0 ? 0.55 : signals <= 2 ? 0.70 : 0.82

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
