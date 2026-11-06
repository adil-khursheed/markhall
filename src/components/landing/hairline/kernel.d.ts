export const HL: {
  inject: (root: Document | ShadowRoot) => void
  tour: (
    stage: HTMLElement,
    stops: ([number, number] | null)[],
    onStop?: (index: number) => void,
  ) => { stop: () => void }
}
