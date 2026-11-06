type MarkhallMarkProps = {
  checkColor?: string
  className?: string
}

export function MarkhallMark({ checkColor = 'var(--paper-light)', className = '' }: MarkhallMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        fill="none"
        height="53"
        stroke="currentColor"
        strokeWidth="3"
        width="53"
        x="5.5"
        y="5.5"
      />
      <g fill="none" stroke="currentColor">
        <rect height="13" opacity="0.32" strokeWidth="1.5" width="13" x="15.5" y="15.5" />
        <rect height="13" opacity="0.55" strokeWidth="1.5" width="13" x="35.5" y="15.5" />
        <rect height="13" opacity="0.55" strokeWidth="1.5" width="13" x="15.5" y="35.5" />
      </g>
      <rect fill="currentColor" height="14" width="14" x="35" y="35" />
      <path
        d="M38.5 42.5 41.5 45.5 46.5 37.5"
        fill="none"
        stroke={checkColor}
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="3"
      />
    </svg>
  )
}
