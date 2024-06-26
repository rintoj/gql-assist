import * as gql from 'graphql'

export function createName(name: string): gql.NameNode {
  return { kind: gql.Kind.NAME, value: name }
}
