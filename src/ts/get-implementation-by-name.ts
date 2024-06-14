import ts from 'typescript'

export function getImplementationByName(node: ts.ClassDeclaration, name: string) {
  const heritageClause = node.heritageClauses?.find(
    clause =>
      !!clause.types.find(
        type =>
          ts.isExpressionWithTypeArguments(type) &&
          ts.isIdentifier(type.expression) &&
          type.expression.text === name,
      ),
  )
  return heritageClause?.types.find(
    type =>
      ts.isExpressionWithTypeArguments(type) &&
      ts.isIdentifier(type.expression) &&
      type.expression.text === name,
  )
}
