import ts from 'typescript'

export function updateStatements(node: ts.SourceFile, statements: ts.Statement[]): ts.SourceFile {
  return { ...node, statements: statements as any }
}
