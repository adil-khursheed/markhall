import type { CollectionAfterChangeHook } from 'payload'

/**
 * Records which admin changed the review status, so every published item
 * carries a reviewer identity without extra UI work.
 */
export const stampReviewer: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
  collection,
}) => {
  if (operation !== 'update' || !req.user || req.user.role !== 'admin') return doc
  if (doc.status === previousDoc.status || doc.reviewedBy) return doc

  await req.payload.update({
    collection: collection.slug,
    id: doc.id,
    data: { reviewedBy: req.user.id },
    depth: 0,
    overrideAccess: true,
    context: { skipEmbedQueue: true },
    req,
  })

  return doc
}
