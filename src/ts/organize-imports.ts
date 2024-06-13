import ts from 'typescript'
import { createImport } from './create-import'

export function organizeImports(sourceFile: ts.SourceFile): ts.SourceFile {
  const importStatements: { [id: string]: Set<string> } = {}
  sourceFile.statements.map((statement: any) => {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const importFrom = statement.moduleSpecifier.text
      if (!importStatements[importFrom]) {
        importStatements[importFrom] = new Set()
      }
      if (statement.importClause) {
        if (statement.importClause.name && ts.isIdentifier(statement.importClause.name)) {
          importStatements[importFrom].add(statement.importClause.name.text)
        } else if (
          statement.importClause.namedBindings &&
          ts.isNamedImports(statement.importClause.namedBindings)
        ) {
          statement.importClause.namedBindings.elements.map(el =>
            importStatements[importFrom].add(el.name.text),
          )
        }
      }
    }
    return statement
  })

  const sortedFileNameMap = Object.keys(importStatements)
    .filter(fromFile => !!importStatements[fromFile].size)
    .map(from => ({ from, firstImport: Array.from(importStatements[from]).sort()[0] }))

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
        .filter(fromFile => !importStatements[fromFile].size)
        .sort()
        .map(fromFile => createImport(fromFile, ...Array.from(importStatements[fromFile]).sort())),
      ...sortedFileNames.map(fromFile =>
        createImport(fromFile, ...Array.from(importStatements[fromFile]).sort()),
      ),
      ...sourceFile.statements.filter(statement => !ts.isImportDeclaration(statement)),
    ] as any,
  }
}
