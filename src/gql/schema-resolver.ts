import { existsSync, readFileSync } from 'fs-extra'
import * as gql from 'graphql'
import { resolve } from 'path'
import { toNonNullArray } from 'tsds-tools'
import { GQLAssistConfig } from '../config'

export function resolveSchemaFile(
  file: string | undefined,
  folders: string[],
  config: GQLAssistConfig,
) {
  const possibleFileNames = toNonNullArray([...config.reactHook.schema].flat())
  return folders
    .flatMap(folder => {
      if (file) return resolve(folder, file)
      return possibleFileNames.map(fileName => resolve(folder, fileName))
    })
    .find(path => existsSync(path))
}

export function loadSchema(file: string) {
  const content = readFileSync(file, 'utf8')
  return gql.buildSchema(content)
}

export function parseSchema(content: string) {
  return gql.buildSchema(content)
}
