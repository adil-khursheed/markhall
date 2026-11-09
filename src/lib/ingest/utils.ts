export function relationId(value: unknown): number | string {
  if (value && typeof value === 'object' && 'id' in value) {
    return (value as { id: number | string }).id
  }
  return value as number | string
}
