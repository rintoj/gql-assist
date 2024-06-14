import ts from 'typescript'
import { GQLType } from './extract-gql-types'

export function createEnum({ name, fields }: GQLType) {
  return ts.factory.createEnumDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(name),
    fields.map(field =>
      ts.factory.createEnumMember(
        ts.factory.createIdentifier(field.name),
        ts.factory.createStringLiteral(field.type as string),
      ),
    ),
  )
}
