import ts from 'typescript'
import { GQLType } from '../generator/hook/extract-gql-types'
import { createArrayType } from './create-type'

export function createInterface({ name, originalName, fields }: GQLType, allowUndefined?: boolean) {
  return ts.factory.createInterfaceDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(name),
    undefined,
    undefined,
    [
      ...fields.map(field => {
        return ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(field.name),
          field.isNonNull ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          createType(field.type as string, !!field.isArray, allowUndefined),
        )
      }),
      originalName
        ? ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier('__typename'),
            ts.factory.createToken(ts.SyntaxKind.QuestionToken),
            ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(originalName)),
          )
        : undefined,
    ].filter(i => !!i) as any,
  )
}

function toJSType(type: string) {
  switch (type) {
    case 'ID':
      return ts.SyntaxKind.StringKeyword
    case 'String':
      return ts.SyntaxKind.StringKeyword
    case 'Int':
      return ts.SyntaxKind.NumberKeyword
    case 'Float':
      return ts.SyntaxKind.NumberKeyword
    case 'Boolean':
      return ts.SyntaxKind.BooleanKeyword
  }
}

function createType(type: string, isArray: boolean, allowUndefined?: boolean) {
  const jsType = toJSType(type) as any
  let targetType = jsType
    ? ts.factory.createKeywordTypeNode(jsType)
    : ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type), undefined)

  if (isArray) {
    targetType = ts.factory.createArrayTypeNode(targetType)
  }

  if (allowUndefined) {
    return ts.factory.createUnionTypeNode([
      targetType,
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
    ])
  }
  return targetType
}
