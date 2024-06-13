import ts from 'typescript'

export function createImport(from: string, ...imports: string[]) {
  return ts.factory.createImportDeclaration(
    undefined,
    !!imports?.length
      ? ts.factory.createImportClause(
          false,
          undefined,
          ts.factory.createNamedImports(
            imports.map(item =>
              ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(item)),
            ),
          ),
        )
      : undefined,
    ts.factory.createStringLiteral(from),
    undefined,
  )
}
