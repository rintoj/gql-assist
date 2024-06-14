export function conditional<T>(
  value: boolean | undefined,
  ifTrue: T | ((...args: any[]) => T),
  ifFalse: T | ((...args: any[]) => T),
) {
  if (value === true) return typeof ifTrue === 'function' ? (ifTrue as any)() : ifTrue
  return typeof ifFalse === 'function' ? (ifFalse as any)() : ifFalse
}
