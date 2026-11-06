'use client'

import { useState } from 'react'

import { HairlineFigure, type HairlineSpec } from './HairlineFigure'
import register from './hairline/figures/register'
import roll from './hairline/figures/roll'
import sitting from './hairline/figures/sitting'

export type FigureName = 'roll' | 'sitting' | 'register'

const FIGURES: Record<FigureName, HairlineSpec> = {
  register: register as unknown as HairlineSpec,
  roll: roll as unknown as HairlineSpec,
  sitting: sitting as unknown as HairlineSpec,
}

type StoryPlateProps = {
  ariaLabel: string
  body: string
  figureName: FigureName
  figureTitle: string
  hint: string
  readLabel: string
  title: string
}

function formatRead(read: string) {
  return read === 'rest' ? 'Rest' : read.charAt(0).toUpperCase() + read.slice(1)
}

export function StoryPlate({
  ariaLabel,
  body,
  figureName,
  figureTitle,
  hint,
  readLabel,
  title,
}: StoryPlateProps) {
  const [read, setRead] = useState('rest')

  return (
    <article className="landing-beat">
      <div className="landing-beat-plate hairline-plate hairline-plate-paper">
        <div className="landing-plate-head">
          <span className="landing-plate-label">{figureTitle}</span>
          <span>{hint}</span>
        </div>
        <HairlineFigure
          figure={FIGURES[figureName]}
          intensity={0.55}
          label={ariaLabel}
          onRead={setRead}
        />
        <div aria-hidden="true" className="hairline-caption">
          <span className="hairline-caption-label">{readLabel}</span>
          <span className="hairline-caption-value">{formatRead(read)}</span>
        </div>
      </div>
      <div className="landing-beat-copy">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </article>
  )
}
