'use client'

import { useState } from 'react'
import { Riffle } from '@lucasmarkes/hairline/react'

type HairlinePlateProps = {
  className?: string
  play?: boolean
  tone?: 'paper' | 'ink'
}

export function HairlinePlate({ className = '', play = false, tone = 'paper' }: HairlinePlateProps) {
  const [read, setRead] = useState('rest')
  const caption = read === 'rest' ? 'Rest' : /^\d+$/.test(read) ? `Seat ${read}` : read

  return (
    <div className={`hairline-plate hairline-plate-${tone} ${className}`.trim()}>
      <Riffle
        aria-label="Roll call: eight numbered seat cards. Hover a card or use the arrow keys to call a seat."
        className="hairline-stage"
        intensity={0.55}
        onRead={setRead}
        play={play}
        theme="light"
      />
      <div aria-hidden="true" className="hairline-caption">
        <span className="hairline-caption-label">Roll call</span>
        <span className="hairline-caption-value">{caption}</span>
      </div>
    </div>
  )
}
