import ts from 'typescript'
import { createDefaultImport, createImport, createNamespaceImport } from './create-import'

export function organizeImports(sourceFile: ts.SourceFile): ts.SourceFile {
  const importStatements: {
    [id: string]: { names: Set<string>; isDefault?: boolean; isNamespaceImport?: boolean }
  } = {}
  sourceFile.statements.map((statement: any) => {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const importFrom = statement.moduleSpecifier.text
      if (!importStatements[importFrom]) {
        importStatements[importFrom] = { names: new Set() }
      }
      if (statement.importClause) {
        if (statement.importClause.name && ts.isIdentifier(statement.importClause.name)) {
          importStatements[importFrom].names.add(statement.importClause.name.text)
          importStatements[importFrom].isDefault = true
        } else if (
          statement.importClause.namedBindings &&
          ts.isNamespaceImport(statement.importClause.namedBindings) &&
          ts.isIdentifier(statement.importClause.namedBindings.name)
        ) {
          importStatements[importFrom].names.add(statement.importClause.namedBindings.name.text)
          importStatements[importFrom].isNamespaceImport = true
        } else if (
          statement.importClause.namedBindings &&
          ts.isNamedImports(statement.importClause.namedBindings)
        ) {
          statement.importClause.namedBindings.elements.map(el =>
            importStatements[importFrom].names.add(
              [el.name.text, el.propertyName?.text].filter(Boolean).join(':'),
            ),
          )
        }
      }
    }
    return statement
  })

  const sortedFileNameMap = Object.keys(importStatements)
    .filter(fromFile => !!importStatements[fromFile].names.size)
    .map(from => ({ from, firstImport: Array.from(importStatements[from].names).sort()[0] }))

  const sortImport = (a: any, b: any) => {
    const value = a.from.localeCompare(b.from)
    if (value === 0) return a.firstImport.localeCompare(b.firstImport)
    return value
  }

  const sortedFileNames = [
    sortedFileNameMap.filter(item => item.from.startsWith('@')).sort(sortImport),
    sortedFileNameMap
      .filter(item => !item.from.startsWith('@') && !item.from.startsWith('.'))
      .sort(sortImport),
    sortedFileNameMap.filter(item => item.from.startsWith('.')).sort(sortImport),
  ]
    .flat()
    .map(item => item.from)

  return {
    ...sourceFile,
    statements: [
      ...Object.keys(importStatements)
        .filter(fromFile => !importStatements[fromFile].names.size)
        .sort()
        .map(fromFile => createImport(fromFile)),
      ...sortedFileNames.map(fromFile => {
        const importStatement = importStatements[fromFile]
        if (importStatement.isDefault) {
          return createDefaultImport(fromFile, Array.from(importStatement.names)[0])
        } else if (importStatement.isNamespaceImport) {
          return createNamespaceImport(fromFile, Array.from(importStatement.names)[0])
        }
        return createImport(fromFile, ...Array.from(importStatement.names).sort())
      }),
      ...sourceFile.statements.filter(statement => !ts.isImportDeclaration(statement)),
    ] as any,
  }
}
