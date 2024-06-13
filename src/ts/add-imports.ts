import ts from 'typescript'

export function addImports(
  sourceFile: ts.SourceFile,
  imports: ts.ImportDeclaration[],
): ts.SourceFile {
  const statements = [...imports, ...sourceFile.statements] as any
  return { ...sourceFile, statements }
}
