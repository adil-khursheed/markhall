import type { Field } from 'payload'

export const boardField: Field = {
  name: 'board',
  type: 'select',
  required: true,
  index: true,
  options: [
    { label: 'CBSE', value: 'cbse' },
    { label: 'ICSE', value: 'icse' },
    { label: 'UP Board', value: 'up' },
  ],
}

export const classLevelField: Field = {
  name: 'classLevel',
  type: 'number',
  required: true,
  min: 6,
  max: 12,
  index: true,
}

export const languageField: Field = {
  name: 'language',
  type: 'select',
  defaultValue: 'en',
  options: [
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' },
  ],
}

export const statusField: Field = {
  name: 'status',
  type: 'select',
  defaultValue: 'draft',
  index: true,
  options: [
    { label: 'Draft', value: 'draft' },
    { label: 'In review', value: 'in_review' },
    { label: 'Published', value: 'published' },
    { label: 'Rejected', value: 'rejected' },
  ],
}
