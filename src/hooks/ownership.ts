import type { CollectionBeforeChangeHook } from 'payload'

export const setOwner =
  (field = 'user'): CollectionBeforeChangeHook =>
  ({ data, operation, req }) => {
    if (operation === 'create' && req.user && req.user.role !== 'admin') {
      data[field] = req.user.id
    }
    return data
  }
