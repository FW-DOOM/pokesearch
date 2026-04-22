import { useRef, useCallback } from 'react'

interface Props {
  src: string
  alt: string
  className?: string
  rarity?: string
  disabled?: boolean
}

function getRarityGlow(rarity?: string): string {
  const r = rarity?.toLowerCase() ?? ''
  if (r.includes('secret') || r.includes('special')) return '0 0 30px rgba(255,215,0,0.6), 0 0 60px rgba(255,215,0,0.3)'
  if (r.includes('hyper') || r.includes('rainbow')) return '0 0 30px rgba(180,100,255,0.7), 0 0 60px rgba(100,200,255,0.4)'
  if (r.includes('ultra') || r.includes('vmax') || r.includes('vstar')) return '0 0 25px rgba(130,80,255,0.6), 0 0 50px rgba(130,80,255,0.25)'
  if (r.includes('rare holo') || r.includes('holo')) return '0 0 20px rgba(80,160,255,0.5), 0 0 40px rgba(80,160,255,0.2)'
  if (r.includes('rare')) return '0 0 15px rgba(255,180,50,0.4)'
  return ''
}

function getRarityGradient(rarity?: string): string {
  const r = rarity?.toLowerCase() ?? ''
  if (r.includes('secret') || r.includes('special')) return 'conic-gradient(from var(--holo-angle,0deg), #ff0000, #ff8800, #ffff00, #00ff00, #00ffff, #0088ff, #8800ff, #ff0088, #ff0000)'
  if (r.includes('hyper') || r.includes('rainbow')) return 'linear-gradient(var(--holo-angle,135deg), #ff00cc, #3300ff, #00ccff, #00ff99, #ffff00, #ff9900, #ff0066)'
  if (r.includes('ultra') || r.includes('vmax') || r.includes('vstar')) return 'linear-gradient(var(--holo-angle,135deg), rgba(130,80,255,0.7), rgba(80,200,255,0.7), rgba(255,80,200,0.5))'
  if (r.includes('holo')) return 'linear-gradient(var(--holo-angle,135deg), rgba(80,160,255,0.5), rgba(255,200,80,0.4), rgba(80,255,180,0.4))'
  return ''
}

export default function HoloCard({ src, alt, className = '', rarity, disabled = false }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const glowStyle = getRarityGlow(rarity)
  const gradient = getRarityGradient(rarity)
  const isHolo = !!gradient

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (disabled || !isHolo || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width   // 0..1
    const y = (clientY - rect.top) / rect.height    // 0..1
    const rotateY = (x - 0.5) * 22
    const rotateX = (0.5 - y) * 18
    const angle = Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI)
    cardRef.current.style.setProperty('--rx', `${rotateX}deg`)
    cardRef.current.style.setProperty('--ry', `${rotateY}deg`)
    cardRef.current.style.setProperty('--holo-angle', `${angle + 90}deg`)
    cardRef.current.style.setProperty('--shine-x', `${x * 100}%`)
    cardRef.current.style.setProperty('--shine-y', `${y * 100}%`)
    cardRef.current.style.setProperty('--opacity', '1')
  }, [disabled, isHolo])

  const handleLeave = useCallback(() => {
    if (!cardRef.current) return
    cardRef.current.style.setProperty('--rx', '0deg')
    cardRef.current.style.setProperty('--ry', '0deg')
    cardRef.current.style.setProperty('--opacity', '0')
  }, [])

  return (
    <div
      ref={cardRef}
      className={`relative select-none ${className}`}
      style={{
        transform: 'rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.08s ease-out',
        willChange: 'transform',
        perspective: '600px',
        boxShadow: glowStyle || undefined,
        borderRadius: '8px',
      }}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseLeave={handleLeave}
      onTouchMove={(e) => {
        const t = e.touches[0]
        if (t) handleMove(t.clientX, t.clientY)
      }}
      onTouchEnd={handleLeave}
    >
      <img src={src} alt={alt} className="w-full h-full object-contain rounded-lg block" draggable={false} />

      {isHolo && (
        <>
          {/* Rainbow shimmer layer */}
          <div
            className="absolute inset-0 rounded-lg pointer-events-none mix-blend-color-dodge"
            style={{
              background: gradient,
              opacity: 'var(--opacity, 0)',
              transition: 'opacity 0.2s',
            }}
          />
          {/* Specular shine spot */}
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              background: 'radial-gradient(circle at var(--shine-x,50%) var(--shine-y,50%), rgba(255,255,255,0.35) 0%, transparent 60%)',
              opacity: 'var(--opacity, 0)',
              transition: 'opacity 0.15s',
              mixBlendMode: 'overlay',
            }}
          />
        </>
      )}
    </div>
  )
}
