import ts from 'typescript'

export function addDecorator<
  T extends
    | ts.ClassDeclaration
    | ts.PropertyDeclaration
    | ts.MethodDeclaration
    | ts.ParameterDeclaration
    | undefined,
>(node: T, ...decorators: ts.Decorator[]): T {
  if (!node) return node
  const names = decorators.map((d: any) => d.expression.expression.text)
  return {
    ...node,
    modifiers: [
      ...decorators,
      ...(node.modifiers ?? []).filter(
        (s: any) =>
          !s?.expression?.expression?.text || !names.includes(s.expression.expression.text),
      ),
    ],
  }
}
