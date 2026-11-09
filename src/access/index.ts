import type { Access, FieldAccess } from 'payload'

export const adminOnly: Access = ({ req }) => req.user?.role === 'admin'

export const adminFieldOnly: FieldAccess = ({ req }) => req.user?.role === 'admin'

export const loggedIn: Access = ({ req }) => Boolean(req.user)

export const adminOrPublished: Access = ({ req }) =>
  req.user?.role === 'admin' ? true : { status: { equals: 'published' } }

export const ownerOrAdmin =
  (ownerField = 'user'): Access =>
  ({ req }) => {
    if (!req.user) return false
    if (req.user.role === 'admin') return true
    return { [ownerField]: { equals: req.user.id } }
  }
