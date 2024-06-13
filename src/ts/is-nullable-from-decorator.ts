import ts from 'typescript'

export function isNullableFromDecorator(
  node: ts.PropertyDeclaration | ts.MethodDeclaration | ts.ParameterDeclaration,
): boolean {
  for (const decorator of node.modifiers ?? []) {
    if (
      ts.isDecorator(decorator) &&
      ts.isCallExpression(decorator.expression) &&
      ts.isIdentifier(decorator.expression.expression)
    ) {
      const object = decorator.expression.arguments?.find(i => ts.isObjectLiteralExpression(i))
      if (object && ts.isObjectLiteralExpression(object)) {
        const nullable = object.properties.find(
          prop =>
            ts.isPropertyAssignment(prop) &&
            ts.isIdentifier(prop.name) &&
            prop.name.text === 'nullable',
        )
        return nullable && ts.isPropertyAssignment(nullable)
          ? nullable.initializer.kind === ts.SyntaxKind.TrueKeyword
          : false
      }
    }
  }
  return false
}
