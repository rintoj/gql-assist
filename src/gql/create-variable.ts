import * as gql from 'graphql'
import { createName } from './create-name'

export function createVariable(name: string): gql.VariableNode {
  return { kind: gql.Kind.VARIABLE, name: createName(name) }
}
