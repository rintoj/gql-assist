import { toCamelCase, toClassName } from 'name-util'
import { singular } from 'pluralize'
import { ById } from 'tsds-tools'
import { toString } from './to-string'

export class NameTracker<T> {
  private readonly nameMap: ById<string> = {}
  private readonly hashMap: ById<string> = {}

  constructor(private readonly options?: { prefix?: boolean }) {}

  next(hash: string, name: string, ...hits: Array<string | undefined>): string {
    if (this.hashMap[hash]) return this.hashMap[hash]
    let index = 0
    let nextName = name
    while (this.nameMap[nextName]) {
      if (!!this.options?.prefix) {
        nextName = toString(
          singular(toCamelCase(hits[index++] ?? '')),
          toClassName(nextName),
          index > hits.length && index - hits.length,
        )
      } else {
        nextName = toString(
          singular(toCamelCase(nextName)),
          toClassName(hits[index++] ?? ''),
          index > hits.length && index - hits.length,
        )
      }
    }
    this.nameMap[nextName] = hash ?? nextName
    this.hashMap[hash] = nextName
    return nextName
  }
}
