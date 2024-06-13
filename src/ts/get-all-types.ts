import { toClassName } from 'name-util'
import ts from 'typescript'

export function getAllTypes(
  node:
    | ts.TypeNode
    | ts.LiteralExpression
    | ts.NullLiteral
    | ts.BooleanLiteral
    | ts.PrefixUnaryExpression
    | undefined,
): string[] {
  if (!node) return []
  if (node.kind === ts.SyntaxKind.StringKeyword) return ['string']
  if (node.kind === ts.SyntaxKind.NumberKeyword) return ['number']
  if (node.kind === ts.SyntaxKind.BooleanKeyword) return ['boolean']
  if (node.kind === ts.SyntaxKind.UndefinedKeyword) return ['undefined']
  if (node.kind === ts.SyntaxKind.NullKeyword) return ['null']
  if (
    ts.isTypeReferenceNode(node) &&
    ts.isIdentifier(node.typeName) &&
    node.typeName.text === 'Promise' &&
    node.typeArguments?.[0]
  ) {
    return ['Promise', ...getAllTypes(node.typeArguments[0])]
  }
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    return [node.typeName.text]
  }
  if (ts.isUnionTypeNode(node)) {
    return node.types.flatMap(getAllTypes)
  }
  if (ts.isLiteralTypeNode(node)) {
    return getAllTypes(node.literal)
  }
  if (ts.isFunctionTypeNode(node)) {
    return getAllTypes(node.type)
  }
  if (ts.isArrayTypeNode(node)) {
    return getAllTypes(node.elementType).map(i => `[${toClassName(i)}]`)
  }
  throw new Error(`parseType: Failed to process ${ts.SyntaxKind[node.kind]}`)
}
