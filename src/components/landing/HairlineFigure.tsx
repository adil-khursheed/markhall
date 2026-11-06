'use client'

import { useEffect, useRef } from 'react'

import { HL } from './hairline/kernel'

export type HairlineSpec = {
  name: string
  range: [number, number, number]
  tour: ([number, number] | null)[]
  mount: (
    context: {
      stage: HTMLElement
      svg: SVGSVGElement
      read: { textContent: string }
    },
    value: number,
  ) => { set: (value: number) => void; destroy: () => void }
}

type HairlineFigureProps = {
  className?: string
  figure: HairlineSpec
  intensity?: number
  label: string
  onRead?: (text: string) => void
  play?: boolean
}

const SVG_NS = 'http://www.w3.org/2000/svg'

function valueFor(range: [number, number, number], intensity: number) {
  const t = Math.max(0, Math.min(1, intensity))
  const [low, mid, high] = range
  return t <= 0.5 ? low + (t / 0.5) * (mid - low) : mid + ((t - 0.5) / 0.5) * (high - mid)
}

export function HairlineFigure({
  className = '',
  figure,
  intensity = 0.5,
  label,
  onRead,
  play = false,
}: HairlineFigureProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const readRef = useRef(onRead)

  useEffect(() => {
    readRef.current = onRead
  }, [onRead])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const doc = stage.ownerDocument
    HL.inject(doc)
    stage.setAttribute('data-hairline', figure.name)
    stage.setAttribute('data-hairline-theme', 'light')
    stage.setAttribute('role', 'img')
    stage.setAttribute('aria-label', label)

    const svg = doc.createElementNS(SVG_NS, 'svg') as SVGSVGElement
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('viewBox', '0 0 400 320')
    stage.appendChild(svg)

    const live = doc.createElement('span')
    live.setAttribute('data-hairline-live', '')
    live.setAttribute('aria-live', 'polite')
    stage.appendChild(live)

    let text = ''
    const read = {
      get textContent() {
        return text
      },
      set textContent(next: string) {
        const value = next ?? ''
        if (value === text) return
        text = value
        live.textContent = value
        readRef.current?.(value)
      },
    }

    const engine = figure.mount({ stage, svg, read }, valueFor(figure.range, intensity))
    const touring = play ? HL.tour(stage, figure.tour) : null

    return () => {
      touring?.stop()
      engine.destroy()
      svg.remove()
      live.remove()
      stage.removeAttribute('data-hairline')
      stage.removeAttribute('data-hairline-theme')
      stage.removeAttribute('role')
      stage.removeAttribute('aria-label')
    }
  }, [figure, intensity, label, play])

  return <div className={`hairline-stage ${className}`.trim()} ref={stageRef} />
}
