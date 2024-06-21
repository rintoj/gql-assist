import { ById } from 'tsds-tools'
import { toString } from './to-string'

export class NameTracker<T> {
  private readonly nameMap: ById<string> = {}
  private readonly hashMap: ById<string> = {}

  constructor(
    private readonly toName: (item: T) => string,
    private readonly hash?: (item: T) => string,
  ) {}

  next(item: T, ...hits: string[]): string {
    const name = this.toName(item)
    const hash = this.hash?.(item)
    if (hash && this.hashMap[hash]) return this.hashMap[hash]

    let index = 0
    let nextName = name
    while (this.nameMap[nextName]) {
      nextName = toString(name, hits[index++], index > hits.length && index - hits.length)
    }
    this.nameMap[nextName] = hash ?? nextName

    if (hash) {
      this.hashMap[hash] = nextName
    }
    return nextName
  }
}
