'use client'

import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

function BlockMarkdown({ text }: { text: string }) {
  return (
    <div className="tutor-markdown">
      <ReactMarkdown rehypePlugins={[rehypeKatex]} remarkPlugins={[remarkMath]}>
        {text}
      </ReactMarkdown>
    </div>
  )
}

/** One finished answer block. Memoised so older blocks never re-render. */
export const Block = memo(BlockMarkdown)
