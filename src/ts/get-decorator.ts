import ts from 'typescript'

export function getAllDecorators(node: ts.Node) {
  const modifiers = (node as any).modifiers as ts.ModifierLike[]
  if (!modifiers?.length) return
  return modifiers.filter(modifier => ts.isDecorator(modifier))
}

export function getDecorator(node: ts.Node, name: string) {
  const modifiers = (node as any).modifiers as ts.ModifierLike[]
  if (!modifiers?.length) return
  for (const decorator of modifiers) {
    if (
      ts.isDecorator(decorator) &&
      ts.isCallExpression(decorator.expression) &&
      ts.isIdentifier(decorator.expression.expression) &&
      decorator.expression.expression.text === name
    ) {
      return decorator
    }
  }
}

export function hasDecorator(node: ts.Node, name: string) {
  return getDecorator(node, name) !== undefined
}
