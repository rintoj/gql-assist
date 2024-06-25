import { toCamelCase, toClassName } from 'name-util'
import { singular } from 'pluralize'
import { ById } from 'tsds-tools'
import { toString } from '../../util/to-string'

export class ParameterNameTracker {
  private readonly nameMap: ById<boolean> = {}

  next(name: string, ...hits: Array<string | undefined>): string {
    if (!this.nameMap[name]) {
      this.nameMap[name] = true
      return name
    }
    let index = 0
    let nextName = name
    while (this.nameMap[nextName]) {
      nextName = toString(
        singular(toCamelCase(hits[index++] ?? '')),
        toClassName(nextName),
        index > hits.length && index - hits.length,
      )
    }
    this.nameMap[nextName] = true
    return nextName
  }
}
