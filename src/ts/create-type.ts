import { toNonNullArray } from 'tsds-tools'
import ts, { factory } from 'typescript'

export function createType(...types: Array<string | undefined>): ts.TypeNode | undefined {
  if (types.length > 1) {
    return factory.createUnionTypeNode(toNonNullArray(types.map(type => createType(type))))
  }
  const [type] = types
  switch (type) {
    case 'string':
      return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
    case 'number':
      return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
    case 'boolean':
      return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
    case 'undefined':
      return factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
    case 'null':
      return factory.createLiteralTypeNode(factory.createNull())
  }
  if (type) return factory.createTypeReferenceNode(factory.createIdentifier(type), undefined)
}

export function createArrayType(...types: Array<string | undefined>) {
  const type = createType(...types)
  if (type) return ts.factory.createArrayTypeNode(type)
}

export function createReferenceType(name: string) {
  return factory.createTypeReferenceNode(factory.createIdentifier(name), undefined)
}

export function createPromiseType(...types: string[]) {
  const innerType = createType(...types)
  if (!innerType) return
  return factory.createTypeReferenceNode(factory.createIdentifier('Promise'), [innerType])
}

export function createStringType() {
  return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
}
