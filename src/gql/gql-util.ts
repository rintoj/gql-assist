import ts, { ModifierLike, factory, isCallExpression, isDecorator, isIdentifier } from 'typescript'
import { Context } from './context'

export function hasDecorator(node: ts.Node, name: string) {
  const modifiers = (node as any).modifiers as ModifierLike[]
  if (!modifiers?.length) return false
  return modifiers.filter(isDecorator).some((decorator) => {
    if (isCallExpression(decorator.expression) && isIdentifier(decorator.expression.expression)) {
      return decorator.expression.expression.text === name
    }
  })
}

export function addDecorator(
  node: ts.ClassDeclaration | ts.PropertyDeclaration,
  ...decorators: ts.Decorator[]
) {
  const names = decorators.map((d: any) => d.expression.expression.text)
  return {
    ...node,
    modifiers: [
      ...decorators,
      ...(node.modifiers ?? []).filter(
        (s: any) =>
          !s?.expression?.expression?.text || !names.includes(s.expression.expression.text)
      ),
    ],
  }
}

export function createObjectTypeDecorator(context: Context) {
  context.imports.push(createImport('@nestjs/graphql', 'ObjectType'))
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('ObjectType'), undefined, undefined)
  )
}

export function createFieldDecorator(node: ts.PropertyDeclaration, context: Context) {
  const argumentsArray: ts.Expression[] = []
  context.imports.push(createImport('@nestjs/graphql', 'Field'))
  if (node && ts.isIdentifier(node?.name) && node.name.text === 'id') {
    argumentsArray.push(
      factory.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        factory.createIdentifier('ID')
      )
    )
    context.imports.push(createImport('@nestjs/graphql', 'ID'))
  } else if (
    node?.type &&
    ts.isTypeReferenceNode(node?.type) &&
    ts.isIdentifier(node?.type.typeName)
  ) {
    argumentsArray.push(
      factory.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        factory.createIdentifier(node.type.typeName.text)
      )
    )
  }

  if (!node?.exclamationToken) {
    argumentsArray.push(
      factory.createObjectLiteralExpression(
        [
          factory.createPropertyAssignment(
            factory.createIdentifier('nullable'),
            factory.createTrue()
          ),
        ],
        false
      )
    )
  }
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('Field'), undefined, argumentsArray)
  )
}

export function createImport(from: string, ...imports: string[]) {
  return factory.createImportDeclaration(
    undefined,
    !!imports?.length
      ? factory.createImportClause(
          false,
          undefined,
          factory.createNamedImports(
            imports.map((item) =>
              factory.createImportSpecifier(false, undefined, factory.createIdentifier(item))
            )
          )
        )
      : undefined,
    factory.createStringLiteral(from),
    undefined
  )
}

export function addImports(
  sourceFile: ts.SourceFile,
  imports: ts.ImportDeclaration[]
): ts.SourceFile {
  const statements = [...imports, ...sourceFile.statements] as any
  return { ...sourceFile, statements }
}

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
          statement.importClause.namedBindings.elements.map((el) =>
            importStatements[importFrom].add(el.name.text)
          )
        }
      }
    }
    return statement
  })

  return {
    ...sourceFile,
    statements: [
      ...Object.keys(importStatements)
        .filter((fromFile) => !importStatements[fromFile].size)
        .sort()
        .map((fromFile) =>
          createImport(fromFile, ...Array.from(importStatements[fromFile]).sort())
        ),
      ...Object.keys(importStatements)
        .filter((fromFile) => !!importStatements[fromFile].size)
        .sort()
        .map((fromFile) =>
          createImport(fromFile, ...Array.from(importStatements[fromFile]).sort())
        ),
      ...sourceFile.statements.filter((statement) => !ts.isImportDeclaration(statement)),
    ] as any,
  }
}
