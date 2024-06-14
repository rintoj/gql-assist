import ts from 'typescript'

const hooks = ['useQuery', 'useMutation', 'useSubscription']

export function identifyLibrary(sourceFile: ts.SourceFile) {
  const imports = sourceFile.statements.find((s): s is ts.ImportDeclaration =>
    ts.isImportDeclaration(s) &&
    s.importClause?.namedBindings &&
    ts.isNamedImports(s.importClause?.namedBindings)
      ? !!s.importClause?.namedBindings?.elements.find(e =>
          ts.isIdentifier(e.name) ? hooks.includes(e.name.text) : false,
        )
      : false,
  )
  return imports?.moduleSpecifier && ts.isStringLiteral(imports?.moduleSpecifier)
    ? imports?.moduleSpecifier.text
    : undefined
}
