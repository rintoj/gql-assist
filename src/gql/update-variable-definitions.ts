import * as gql from 'graphql'

export function updateVariableDefinitions(
  node: gql.OperationDefinitionNode,
  variableDefinitions: ReadonlyArray<gql.VariableDefinitionNode>,
) {
  return { ...node, variableDefinitions }
}
