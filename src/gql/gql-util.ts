import { toNonNullArray } from 'tsds-tools'
import ts, { ModifierLike, factory, isCallExpression, isIdentifier } from 'typescript'
import { config } from '../config'
import { Context } from './context'

export function getComment(node: ts.Node) {
  return (node as any)?.jsDoc
    ?.map((doc: { comment?: string }) => doc.comment)
    .filter((comment: string | undefined) => !!comment)
    .join('\n')
}

export function getCommentFromDecorator(node: ts.Node, name: string) {
  const decorator = getDecorator(node, name)
  if (!decorator || !ts.isDecorator(decorator)) return
  if (isCallExpression(decorator.expression)) {
    const option = decorator.expression.arguments.find(ts.isObjectLiteralExpression)
    if (option) {
      const description = option.properties
        .filter(ts.isPropertyAssignment)
        .find(prop => (ts.isIdentifier(prop.name) ? prop.name.text === 'description' : false))
      return description?.initializer && ts.isStringLiteral(description?.initializer)
        ? description?.initializer.text
        : undefined
    }
  }
}

export function conditional<T>(
  value: boolean | undefined,
  ifTrue: T | ((...args: any[]) => T),
  ifFalse: T | ((...args: any[]) => T),
) {
  if (value === true) return typeof ifTrue === 'function' ? (ifTrue as any)() : ifTrue
  return typeof ifFalse === 'function' ? (ifFalse as any)() : ifFalse
}

export function hasImplementationByName(node: ts.ClassDeclaration, name: string) {
  return !!getImplementationByName(node, name)
}

export function getImplementationByName(node: ts.ClassDeclaration, name: string) {
  const heritageClause = node.heritageClauses?.find(
    clause =>
      !!clause.types.find(
        type =>
          ts.isExpressionWithTypeArguments(type) &&
          ts.isIdentifier(type.expression) &&
          type.expression.text === name,
      ),
  )
  return heritageClause?.types.find(
    type =>
      ts.isExpressionWithTypeArguments(type) &&
      ts.isIdentifier(type.expression) &&
      type.expression.text === name,
  )
}

export function getTypeFromDecorator(node: ts.Node, name: string) {
  const decorator = getDecorator(node, name)
  if (!decorator || !ts.isDecorator(decorator)) return
  if (isCallExpression(decorator.expression)) {
    const arrowFunction = decorator.expression.arguments.find(ts.isArrowFunction)
    if (arrowFunction && ts.isIdentifier(arrowFunction.body)) {
      return arrowFunction.body.text
    } else if (
      arrowFunction &&
      ts.isArrayLiteralExpression(arrowFunction.body) &&
      ts.isIdentifier(arrowFunction.body.elements?.[0])
    ) {
      return `[${arrowFunction.body.elements[0].text}]`
    }
  }
}

export function hasDecorator(node: ts.Node, name: string) {
  return getDecorator(node, name) !== undefined
}

export function getDecorator(node: ts.Node, name: string) {
  const modifiers = (node as any).modifiers as ModifierLike[]
  if (!modifiers?.length) return
  for (const decorator of modifiers) {
    if (
      ts.isDecorator(decorator) &&
      isCallExpression(decorator.expression) &&
      isIdentifier(decorator.expression.expression) &&
      decorator.expression.expression.text === name
    ) {
      return decorator
    }
  }
}

export function getName(node: ts.Node) {
  return (node as any)?.name && ts.isIdentifier((node as any).name)
    ? (node as any).name.text
    : undefined
}

export function getPropertyDeclaration(node: ts.ClassDeclaration, name: string) {
  return node.members.find(
    member =>
      ts.isPropertyDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === name,
  )
}

export function getMethodDeclaration(node: ts.ClassDeclaration, name: string) {
  return node.members.find(
    member =>
      ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === name,
  )
}

export function addDecorator<
  T extends
    | ts.ClassDeclaration
    | ts.PropertyDeclaration
    | ts.MethodDeclaration
    | ts.ParameterDeclaration
    | undefined,
>(node: T, ...decorators: ts.Decorator[]): T {
  if (!node) return node
  const names = decorators.map((d: any) => d.expression.expression.text)
  return {
    ...node,
    modifiers: [
      ...decorators,
      ...(node.modifiers ?? []).filter(
        (s: any) =>
          !s?.expression?.expression?.text || !names.includes(s.expression.expression.text),
      ),
    ],
  }
}

export function convertToMethod(node: ts.PropertyDeclaration | ts.MethodDeclaration) {
  const name = getName(node)
  if (ts.isMethodDeclaration(node)) return node
  if (ts.isPropertyDeclaration(node) && node.type && ts.isFunctionTypeNode(node.type)) {
    return factory.createMethodDeclaration(
      undefined,
      undefined,
      factory.createIdentifier(name),
      undefined,
      undefined,
      node.type.parameters,
      node.type.type,
      factory.createBlock([], true),
    )
  }
}

export function addExport<T extends ts.ClassDeclaration | ts.PropertyDeclaration | undefined>(
  node: T,
): T {
  if (!node) return node
  return {
    ...node,
    modifiers: [...(node.modifiers ?? []), factory.createToken(ts.SyntaxKind.ExportKeyword)],
  }
}

export function createObjectTypeDecorator(node: ts.ClassDeclaration, context: Context) {
  const comment = getComment(node) ?? getCommentFromDecorator(node, 'ObjectType')
  const argumentsArray: ts.Expression[] = []
  if (!!comment) {
    argumentsArray.push(
      factory.createObjectLiteralExpression(
        [
          factory.createPropertyAssignment(
            factory.createIdentifier('description'),
            factory.createStringLiteral(comment),
          ),
        ],
        false,
      ),
    )
  }
  context.imports.push(createImport('@nestjs/graphql', 'ObjectType'))
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('ObjectType'), undefined, argumentsArray),
  )
}

export function hasParameter(node: ts.Node, name: string) {
  return !!getParameterByName(node, name)
}

export function getParameterByName(node: ts.Node, name: string) {
  const parameters = getParameters(node)
  return parameters.find(parameter => getName(parameter) === name)
}

export function getParameters(node: ts.Node) {
  if (ts.isPropertyDeclaration(node) && node.type && ts.isFunctionTypeNode(node.type)) {
    return node.type.parameters
  } else if (ts.isMethodDeclaration(node)) {
    return node.parameters
  }
  return []
}

export function getAllParameters(node: ts.Node) {
  let params: ts.ParameterDeclaration[] = []
  ts.visitEachChild(
    node,
    node => {
      params = params.concat(getParameters(node))
      return node
    },
    undefined,
  )
  return params.flatMap(node => node)
}

export function getParameterType(parameter: ts.ParameterDeclaration) {
  if (
    parameter.type &&
    ts.isTypeReferenceNode(parameter.type) &&
    ts.isIdentifier(parameter.type.typeName) &&
    parameter.type.typeName.text !== ''
  ) {
    return parameter.type.typeName.text
  }
}

export function createParentDecorator(context: Context) {
  context.imports.push(createImport('@nestjs/graphql', 'Parent'))
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('Parent'), undefined, undefined),
  )
}

export function createArgsDecorator(node: ts.ParameterDeclaration, context: Context) {
  context.imports.push(createImport('@nestjs/graphql', 'Args'))
  const name = getName(node)
  return factory.createDecorator(
    factory.createCallExpression(
      factory.createIdentifier('Args'),
      undefined,
      toNonNullArray([
        factory.createStringLiteral(name),
        isNullable(node)
          ? factory.createObjectLiteralExpression(
              [
                factory.createPropertyAssignment(
                  factory.createIdentifier('nullable'),
                  factory.createTrue(),
                ),
              ],
              false,
            )
          : (undefined as any),
      ]),
    ),
  )
}

export function createContextDecorator() {
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('Context'), undefined, undefined),
  )
}

export function createResolverDecorator(type: string, addType: boolean, context: Context) {
  context.imports.push(createImport('@nestjs/graphql', 'Resolver'))
  return factory.createDecorator(
    factory.createCallExpression(
      factory.createIdentifier('Resolver'),
      undefined,
      addType
        ? [
            factory.createArrowFunction(
              undefined,
              undefined,
              [],
              undefined,
              factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              factory.createIdentifier(type),
            ),
          ]
        : undefined,
    ),
  )
}

export function createScalarDecorator(node: ts.ClassDeclaration, context: Context) {
  const name = node.name && ts.isIdentifier(node.name) ? node.name.text : ''
  const argumentsArray: ts.Expression[] = [
    factory.createStringLiteral(name),
    factory.createArrowFunction(
      undefined,
      undefined,
      [],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createIdentifier('String'),
    ),
  ]
  context.imports.push(createImport('@nestjs/graphql', 'Scalar'))
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('SCalar'), undefined, argumentsArray),
  )
}

export function isNullable(
  node: ts.PropertyDeclaration | ts.MethodDeclaration | ts.ParameterDeclaration,
): boolean {
  if (ts.isParameter(node)) {
    return !!node.questionToken
  }
  if (ts.isMethodDeclaration(node)) {
    return !!getAllTypes(node.type).find(i => i === 'null' || i === 'undefined')
  }
  return config.nullableByDefault ? !node.exclamationToken : !!node.questionToken
}

export function getAllTypes(
  node:
    | ts.TypeNode
    | ts.LiteralExpression
    | ts.NullLiteral
    | ts.BooleanLiteral
    | ts.PrefixUnaryExpression
    | undefined,
): string[] {
  if (!node) return []
  if (node.kind === ts.SyntaxKind.StringKeyword) return ['string']
  if (node.kind === ts.SyntaxKind.NumberKeyword) return ['number']
  if (node.kind === ts.SyntaxKind.BooleanKeyword) return ['boolean']
  if (node.kind === ts.SyntaxKind.UndefinedKeyword) return ['undefined']
  if (node.kind === ts.SyntaxKind.NullKeyword) return ['null']
  if (
    ts.isTypeReferenceNode(node) &&
    ts.isIdentifier(node.typeName) &&
    node.typeName.text === 'Promise' &&
    node.typeArguments?.[0]
  ) {
    return ['Promise', ...getAllTypes(node.typeArguments[0])]
  }
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    return [node.typeName.text]
  }
  if (ts.isUnionTypeNode(node)) {
    return node.types.flatMap(getAllTypes)
  }
  if (ts.isLiteralTypeNode(node)) {
    return getAllTypes(node.literal)
  }
  if (ts.isFunctionTypeNode(node)) {
    return getAllTypes(node.type)
  }
  throw new Error(`parseType: Failed to process ${ts.SyntaxKind[node.kind]}`)
}

export function createType(...types: string[]): ts.TypeNode {
  if (types.length > 1) {
    return factory.createUnionTypeNode(types.map(type => createType(type)))
  }
  const [type] = types
  switch (type) {
    case 'string':
      return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
    case 'number':
      return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
    case 'boolean':
      return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
    case 'undefined':
      return factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
    case 'null':
      return factory.createLiteralTypeNode(factory.createNull())
  }
  if (!type) throw new Error('Type must be defined')
  return factory.createTypeReferenceNode(factory.createIdentifier(type), undefined)
}

export function createPromiseType(...types: string[]) {
  return factory.createTypeReferenceNode(factory.createIdentifier('Promise'), [
    createType(...types),
  ])
}

export function getType(node: ts.PropertyDeclaration | ts.MethodDeclaration) {
  const typeFromDecorator = getTypeFromDecorator(node, 'Field')
  if (typeFromDecorator) return typeFromDecorator
  if (getName(node) === 'id') return 'ID'
  const [type, secondType] = Array.from(new Set(getAllTypes(node.type))).filter(
    i => !['null', 'undefined', 'Promise'].includes(i),
  )
  if (secondType) throw new Error('Return type can not be a union type.')
  if (type === 'string') return
  if (type === 'number') return 'Int'
  if (type) return type
}

export function addNullability<T extends ts.PropertyDeclaration | ts.MethodDeclaration>(
  node: T,
): T {
  return isNullable(node)
    ? {
        ...node,
        questionToken: ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      }
    : {
        ...node,
        exclamationToken: ts.factory.createToken(ts.SyntaxKind.ExclamationToken),
      }
}

export function removeNullability<T extends ts.PropertyDeclaration | ts.MethodDeclaration>(
  node: T,
): T {
  return {
    ...node,
    questionToken: undefined,
    exclamationToken: undefined,
  }
}

export function transformName<
  T extends ts.PropertyDeclaration | ts.ParameterDeclaration | ts.MethodDeclaration | undefined,
>(node: T, transform: (name: string) => string): T {
  if (!node) return undefined as T
  if (node.name && ts.isIdentifier(node.name)) {
    return { ...node, name: ts.factory.createIdentifier(transform(node.name.text)) } as T
  }
  return node
}

export function withDefaultType(
  node: ts.ParameterDeclaration | ts.MethodDeclaration | ts.PropertyDeclaration,
  type: ts.TypeNode,
) {
  return { ...node, type: node.type ?? type }
}

export function createReferenceType(name: string) {
  return factory.createTypeReferenceNode(factory.createIdentifier(name), undefined)
}

export function createStringType() {
  return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
}

export function createFieldDecorator(
  node: ts.PropertyDeclaration | ts.MethodDeclaration,
  decoratorName: 'Query' | 'Mutation' | 'Field' | 'ResolveField',
  context: Context,
) {
  const argumentsArray: ts.Expression[] = []
  context.imports.push(createImport('@nestjs/graphql', decoratorName))
  const comment = getComment(node) ?? getCommentFromDecorator(node, decoratorName)
  const type = getType(node)
  if (type) {
    argumentsArray.push(
      factory.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        factory.createIdentifier(type),
      ),
    )
    if (['ID', 'INT'].includes(type)) context.imports.push(createImport('@nestjs/graphql', type))
  }

  if (isNullable(node) || !!comment) {
    argumentsArray.push(
      factory.createObjectLiteralExpression(
        [
          isNullable(node)
            ? factory.createPropertyAssignment(
                factory.createIdentifier('nullable'),
                factory.createTrue(),
              )
            : (undefined as any),
          comment
            ? factory.createPropertyAssignment(
                factory.createIdentifier('description'),
                factory.createStringLiteral(comment),
              )
            : (undefined as any),
        ].filter(i => !!i),
        false,
      ),
    )
  }

  return factory.createDecorator(
    factory.createCallExpression(
      factory.createIdentifier(decoratorName),
      undefined,
      argumentsArray,
    ),
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
            imports.map(item =>
              factory.createImportSpecifier(false, undefined, factory.createIdentifier(item)),
            ),
          ),
        )
      : undefined,
    factory.createStringLiteral(from),
    undefined,
  )
}

export function addImports(
  sourceFile: ts.SourceFile,
  imports: ts.ImportDeclaration[],
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
          statement.importClause.namedBindings.elements.map(el =>
            importStatements[importFrom].add(el.name.text),
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
        .filter(fromFile => !importStatements[fromFile].size)
        .sort()
        .map(fromFile => createImport(fromFile, ...Array.from(importStatements[fromFile]).sort())),
      ...Object.keys(importStatements)
        .filter(fromFile => !!importStatements[fromFile].size)
        .sort()
        .map(fromFile => createImport(fromFile, ...Array.from(importStatements[fromFile]).sort())),
      ...sourceFile.statements.filter(statement => !ts.isImportDeclaration(statement)),
    ] as any,
  }
}
