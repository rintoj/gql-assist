import { toCamelCase, toClassName } from 'name-util'
import { ById } from 'tsds-tools'
import { toString } from './to-string'
import { singular } from 'pluralize'

export class NameTracker<T> {
  private readonly nameMap: ById<string> = {}
  private readonly hashMap: ById<string> = {}

  constructor(
    private readonly toName: (item: T) => string,
    private readonly hash?: (item: T) => string,
    private readonly options?: { prefix?: boolean },
  ) {}

  next(item: T, ...hits: string[]): string {
    const name = this.toName(item)
    const hash = this.hash?.(item)
    if (hash && this.hashMap[hash]) return this.hashMap[hash]
    let index = 0
    let nextName = name
    while (this.nameMap[nextName]) {
      if (!!this.options?.prefix) {
        nextName = toString(
          singular(toCamelCase(hits[index++])),
          toClassName(name),
          index > hits.length && index - hits.length,
        )
      } else {
        nextName = toString(
          singular(toCamelCase(name)),
          toClassName(hits[index++]),
          index > hits.length && index - hits.length,
        )
      }
    }
    this.nameMap[nextName] = hash ?? nextName

    if (hash) {
      this.hashMap[hash] = nextName
    }
    return nextName
  }
}
