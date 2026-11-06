import { MarkhallMark } from './MarkhallMark'

type WordmarkProps = {
  className?: string
  tone?: 'paper' | 'ink'
}

export function Wordmark({ className = '', tone = 'paper' }: WordmarkProps) {
  return (
    <span className={`wordmark ${className}`.trim()}>
      <span aria-hidden="true" className="wordmark-mark">
        <MarkhallMark checkColor={tone === 'ink' ? 'var(--ink)' : 'var(--paper-light)'} />
      </span>
      <span className="wordmark-text">Markhall</span>
    </span>
  )
}
