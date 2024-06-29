import * as gql from 'graphql'

export function createArgumentDefinition(
  arg: gql.GraphQLArgument,
  name?: string,
): gql.VariableDefinitionNode {
  return {
    kind: gql.Kind.VARIABLE_DEFINITION,
    variable: {
      kind: gql.Kind.VARIABLE,
      name: { kind: gql.Kind.NAME, value: name ?? arg.name },
    },
    type: arg.astNode?.type as gql.TypeNode,
  }
}
