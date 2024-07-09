import ts from 'typescript'

export function createImport(from: string, ...imports: string[]) {
  return ts.factory.createImportDeclaration(
    undefined,
    !!imports?.length
      ? ts.factory.createImportClause(
          false,
          undefined,
          ts.factory.createNamedImports(
            imports.map(item => {
              const [name, property] = item.split(':')
              return ts.factory.createImportSpecifier(
                false,
                property ? ts.factory.createIdentifier(property) : undefined,
                ts.factory.createIdentifier(name),
              )
            }),
          ),
        )
      : undefined,
    ts.factory.createStringLiteral(from),
    undefined,
  )
}

export function createTypeOnlyImport(from: string, ...imports: string[]) {
  return ts.factory.createImportDeclaration(
    undefined,
    !!imports?.length
      ? ts.factory.createImportClause(
          true,
          undefined,
          ts.factory.createNamedImports(
            imports.map(item => {
              const [name, property] = item.split(':')
              return ts.factory.createImportSpecifier(
                false,
                property ? ts.factory.createIdentifier(property) : undefined,
                ts.factory.createIdentifier(name),
              )
            }),
          ),
        )
      : undefined,
    ts.factory.createStringLiteral(from),
    undefined,
  )
}

export function createDefaultImport(from: string, name: string) {
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(false, ts.factory.createIdentifier(name), undefined),
    ts.factory.createStringLiteral(from),
    undefined,
  )
}
export function createNamespaceImport(from: string, name: string) {
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamespaceImport(ts.factory.createIdentifier(name)),
    ),
    ts.factory.createStringLiteral(from),
    undefined,
  )
}
