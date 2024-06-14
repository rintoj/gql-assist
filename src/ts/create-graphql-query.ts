import ts from 'typescript'

export function createGraphQLQuery(query: string, variableName = 'query') {
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(variableName),
          undefined,
          undefined,
          ts.factory.createTaggedTemplateExpression(
            ts.factory.createIdentifier('gql'),
            undefined,
            ts.factory.createNoSubstitutionTemplateLiteral(query),
          ),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  )
}
