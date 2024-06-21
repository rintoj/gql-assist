import * as gql from 'graphql'

export function createArgumentDefinition(arg: gql.GraphQLArgument): gql.VariableDefinitionNode {
  return {
    kind: gql.Kind.VARIABLE_DEFINITION,
    variable: {
      kind: gql.Kind.VARIABLE,
      name: { kind: gql.Kind.NAME, value: arg.name },
    },
    type: arg.astNode?.type as gql.TypeNode,
  }
}
