import * as gql from 'graphql'

export function updateName<T>(node: T, name: string) {
  return { ...node, name: { kind: gql.Kind.NAME, value: name } } as T
}
