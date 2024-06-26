import * as gql from 'graphql'
import { createName } from './create-name'
import { createVariable } from './create-variable'

export function createInputValueDefinition(
  name: string,
  variableName?: string,
): gql.InputValueDefinitionNode {
  return {
    kind: gql.Kind.INPUT_VALUE_DEFINITION,
    name: createName(name),
    type: createVariable(variableName ?? name) as any,
  }
}
