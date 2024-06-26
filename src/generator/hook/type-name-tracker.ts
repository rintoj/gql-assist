import { toClassName } from 'name-util'
import { singular } from 'pluralize'
import { ById } from 'tsds-tools'
import { className } from '../../util/to-string'

export class TypeNameTracker {
  private readonly nameMap: ById<string> = {}
  private readonly hashMap: ById<string> = {}

  next(hash: string, name: string, ...hits: Array<string | undefined>): string {
    if (this.hashMap[hash]) return this.hashMap[hash]
    let index = 0
    let nextName = name
    while (this.nameMap[nextName]) {
      nextName = className(
        singular(nextName),
        hits[index++] ?? '',
        index > hits.length ? index - hits.length : (undefined as any),
      )
    }
    this.nameMap[nextName] = hash ?? nextName
    this.hashMap[hash] = nextName
    return toClassName(nextName)
  }
}
