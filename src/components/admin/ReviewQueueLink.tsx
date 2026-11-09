import Link from 'next/link'

export function ReviewQueueLink() {
  return <Link href="?where[status][equals]=in_review">Review queue</Link>
}

export default ReviewQueueLink
