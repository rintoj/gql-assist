import ts from 'typescript'
import { GQLType } from '../generator/hook/extract-gql-types'

export function createUnion({ name, fields }: GQLType) {
  return ts.factory.createTypeAliasDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(name),
    undefined,
    ts.factory.createUnionTypeNode(
      fields.map(field =>
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(field.name), undefined),
      ),
    ),
  )
}
