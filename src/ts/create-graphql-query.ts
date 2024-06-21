import * as gql from 'graphql'
import ts from 'typescript'

export function createGraphQLQuery(document: gql.DocumentNode, variable: ts.VariableDeclaration) {
  const query = gql.print(document)
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(variable.name.getText()),
          undefined,
          undefined,
          ts.factory.createTaggedTemplateExpression(
            ts.factory.createIdentifier('gql'),
            undefined,
            ts.factory.createNoSubstitutionTemplateLiteral(query, query),
          ),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  )
}
