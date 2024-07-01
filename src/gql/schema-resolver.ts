import { readFileSync } from 'fs-extra'
import * as gql from 'graphql'

export function loadSchema(file: string) {
  const content = readFileSync(file, 'utf8')
  return gql.buildSchema(content)
}

export function parseSchema(content: string) {
  return gql.buildSchema(content)
}
