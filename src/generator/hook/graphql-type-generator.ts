import * as gql from 'graphql'
import { toCamelCase, toClassName } from 'name-util'
import ts from 'typescript'
import { isMutation, isOperationDefinitionNode, isQuery, isSubscription } from '../../gql'
import { createImport } from '../../ts'
import type { Context } from '../context'
import { TypeMap } from './graphql-parser-context'

const NEVER_TYPE = 'never'
const VARIABLES_TYPE = 'Variables'
const VARIABLES_ARGUMENT_NAME = 'variables'
const OPTIONS_ARGUMENT_NAME = 'options'

export enum ExtendedOperationTypeNode {
  LAZY_QUERY = 'LAZY_QUERY',
}

export function getHookName(type: gql.OperationTypeNode | ExtendedOperationTypeNode) {
  switch (type) {
    case gql.OperationTypeNode.QUERY:
      return 'useQuery'
    case ExtendedOperationTypeNode.LAZY_QUERY:
      return 'useLazyQuery'
    case gql.OperationTypeNode.MUTATION:
      return 'useMutation'
    case gql.OperationTypeNode.SUBSCRIPTION:
      return 'useSubscription'
  }
}

export function getOptionsType(type: gql.OperationTypeNode | ExtendedOperationTypeNode) {
  switch (type) {
    case gql.OperationTypeNode.QUERY:
      return 'QueryHookOptions'
    case ExtendedOperationTypeNode.LAZY_QUERY:
      return 'LazyQueryHookOptions'
    case gql.OperationTypeNode.MUTATION:
      return 'MutationHookOptions'
    case gql.OperationTypeNode.SUBSCRIPTION:
      return 'SubscriptionHookOptions'
  }
}

function toJSType(type: string) {
  switch (type) {
    case 'ID':
      return ts.SyntaxKind.StringKeyword
    case 'String':
      return ts.SyntaxKind.StringKeyword
    case 'Int':
      return ts.SyntaxKind.NumberKeyword
    case 'Float':
      return ts.SyntaxKind.NumberKeyword
    case 'Boolean':
      return ts.SyntaxKind.BooleanKeyword
  }
}

function createType(type: string, isArray: boolean, orUndefined?: boolean) {
  const jsType = toJSType(type) as any
  let targetType = jsType
    ? ts.factory.createKeywordTypeNode(jsType)
    : ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type), undefined)

  if (isArray) {
    targetType = ts.factory.createArrayTypeNode(targetType)
  }

  if (orUndefined) {
    return ts.factory.createUnionTypeNode([
      targetType,
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
    ])
  }
  return targetType
}

export function generateTypes(typeMap: TypeMap) {
  return Object.keys(typeMap).map(typeName =>
    ts.factory.createInterfaceDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(typeName),
      undefined,
      undefined,
      [
        ...Object.keys(typeMap[typeName]).map(fieldName => {
          const field = typeMap[typeName][fieldName]
          return ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(field.name),
            field.isNullable ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
            createType(field.type as string, !!field.isArray, field.orUndefined),
          )
        }),
      ].filter(i => !!i),
    ),
  )
}

function createParameter(name: string, type: string, nullable: boolean) {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    ts.factory.createIdentifier(name),
    nullable ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
    ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type), undefined),
    undefined,
  )
}

function getDefinition(document: gql.DocumentNode) {
  if (document.definitions.length > 1) {
    throw new Error(
      `We can only handle one root definition at a time, but found '${document.definitions.length}'.`,
    )
  }
  const [def] = document.definitions
  if (!isOperationDefinitionNode(def)) {
    throw new Error(
      `We can only generate type from operational definitions but found '${def.kind}'`,
    )
  }
  return def
}

function createSkip(requiredVariables: string[]) {
  if (requiredVariables.length === 0) {
    return undefined
  }
  const firstVariable = ts.factory.createPrefixUnaryExpression(
    ts.SyntaxKind.ExclamationToken,
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier(VARIABLES_ARGUMENT_NAME),
      ts.factory.createIdentifier(requiredVariables[0]),
    ),
  )
  return ts.factory.createPropertyAssignment(
    ts.factory.createIdentifier('skip'),
    requiredVariables.slice(1).reduce((a, i) => {
      return ts.factory.createBinaryExpression(
        a,
        ts.factory.createToken(ts.SyntaxKind.BarBarToken),
        ts.factory.createPrefixUnaryExpression(
          ts.SyntaxKind.ExclamationToken,
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier(VARIABLES_ARGUMENT_NAME),
            ts.factory.createIdentifier(i),
          ),
        ),
      )
    }, firstVariable as ts.Expression),
  )
}

export function createGraphQLHook(
  document: gql.DocumentNode,
  variable: ts.VariableDeclaration,
  libraryName: string,
  context: Context,
) {
  const def = getDefinition(document)
  if (isQuery(def)) {
    return createQueryHook(document, variable, libraryName, context)
  } else if (isMutation(def)) {
    return createMutationHook(document, variable, libraryName, context)
  } else if (isSubscription(def)) {
    return createSubscriptionHook(document, variable, libraryName, context)
  }
}

export function createQueryHook(
  document: gql.DocumentNode,
  variable: ts.VariableDeclaration,
  libraryName: string,
  context: Context,
) {
  const def = getDefinition(document)
  const defName = def.name?.value ?? ''
  const hookName = toCamelCase(`${defName}`)
  const functionName = toCamelCase(`use-${hookName}`)
  const inputs = def.variableDefinitions ?? []
  const gqlVariableName = variable.name.getText()
  const responseType = toClassName(`${hookName}`)
  const requiredVariables = inputs
    .filter(input => input.type.kind === gql.Kind.NON_NULL_TYPE)
    .map(input => input.variable.name.value)
  const hasVariables = inputs.length > 0
  const isLazyQuery = gqlVariableName.startsWith('lazy')
  const reactHook = getHookName(isLazyQuery ? ExtendedOperationTypeNode.LAZY_QUERY : def.operation)
  const optionType = getOptionsType(
    isLazyQuery ? ExtendedOperationTypeNode.LAZY_QUERY : def.operation,
  )

  context.imports.push(createImport(libraryName, optionType, reactHook))

  // create query hook
  return ts.factory.createFunctionDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    ts.factory.createIdentifier(functionName),
    undefined,
    [
      hasVariables
        ? createParameter(VARIABLES_ARGUMENT_NAME, VARIABLES_TYPE, !requiredVariables.length)
        : (undefined as any),
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier(OPTIONS_ARGUMENT_NAME),
        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(optionType), [
          ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(responseType), undefined),
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier(hasVariables ? VARIABLES_TYPE : NEVER_TYPE),
            undefined,
          ),
        ]),
        undefined,
      ),
    ].filter(i => !!i),

    undefined,
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          ts.factory.createCallExpression(
            ts.factory.createIdentifier(reactHook),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier(responseType),
                undefined,
              ),
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier(hasVariables ? VARIABLES_TYPE : NEVER_TYPE),
                undefined,
              ),
            ],
            [
              ts.factory.createIdentifier(gqlVariableName),
              hasVariables
                ? ts.factory.createObjectLiteralExpression(
                    [
                      ts.factory.createShorthandPropertyAssignment(
                        ts.factory.createIdentifier(VARIABLES_ARGUMENT_NAME),
                        undefined,
                      ),
                      !isLazyQuery && !!requiredVariables.length
                        ? createSkip(requiredVariables)
                        : null,
                      ts.factory.createSpreadAssignment(
                        ts.factory.createIdentifier(OPTIONS_ARGUMENT_NAME),
                      ),
                    ].filter(i => !!i) as any,
                    true,
                  )
                : ts.factory.createIdentifier(OPTIONS_ARGUMENT_NAME),
            ].filter(i => !!i) as any,
          ),
        ),
      ],
      true,
    ),
  )
}

function createMutationHook(
  document: gql.DocumentNode,
  variable: ts.VariableDeclaration,
  libraryName: string,
  context: Context,
) {
  const def = getDefinition(document)
  const defName = def.name?.value ?? ''
  const hookName = toCamelCase(`use-${defName}`)
  const inputs = def.variableDefinitions ?? []
  const responseType = toClassName(defName)
  const hasVariables = inputs.length > 0
  const gqlVariableName = variable.name.getText()
  const reactHook = getHookName(def.operation)
  const optionType = getOptionsType(def.operation)

  context.imports.push(createImport(libraryName, optionType, reactHook))

  return ts.factory.createFunctionDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    ts.factory.createIdentifier(hookName),
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier(OPTIONS_ARGUMENT_NAME),
        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(optionType), [
          ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(responseType), undefined),
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier(hasVariables ? VARIABLES_TYPE : NEVER_TYPE),
            undefined,
          ),
        ]),
        undefined,
      ),
    ],
    undefined,
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          ts.factory.createCallExpression(
            ts.factory.createIdentifier(reactHook),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier(responseType),
                undefined,
              ),
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier(hasVariables ? VARIABLES_TYPE : NEVER_TYPE),
                undefined,
              ),
            ],
            [
              ts.factory.createIdentifier(gqlVariableName),
              ts.factory.createIdentifier(OPTIONS_ARGUMENT_NAME),
            ],
          ),
        ),
      ],
      true,
    ),
  )
}

export function createSubscriptionHook(
  document: gql.DocumentNode,
  variable: ts.VariableDeclaration,
  libraryName: string,
  context: Context,
) {
  const def = getDefinition(document)
  const defName = def.name?.value ?? ''
  const hookName = toCamelCase(`use-${defName}`)
  const inputs = def.variableDefinitions ?? []
  const responseType = toClassName(defName)
  const hasVariables = inputs.length > 0
  const gqlVariableName = variable.name.getText()
  const reactHook = getHookName(def.operation)
  const optionType = getOptionsType(def.operation)

  context.imports.push(createImport(libraryName, optionType, reactHook))

  return ts.factory.createFunctionDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    ts.factory.createIdentifier(hookName),
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier(OPTIONS_ARGUMENT_NAME),
        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier(getOptionsType(def.operation)),
          [
            ts.factory.createTypeReferenceNode(
              ts.factory.createIdentifier(responseType),
              undefined,
            ),
            ts.factory.createTypeReferenceNode(
              ts.factory.createIdentifier(hasVariables ? VARIABLES_TYPE : NEVER_TYPE),
              undefined,
            ),
          ],
        ),
        undefined,
      ),
    ],
    undefined,
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          ts.factory.createCallExpression(
            ts.factory.createIdentifier(reactHook),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier(responseType),
                undefined,
              ),
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier(hasVariables ? VARIABLES_TYPE : NEVER_TYPE),
                undefined,
              ),
            ],
            [
              ts.factory.createIdentifier(gqlVariableName),
              ts.factory.createIdentifier(OPTIONS_ARGUMENT_NAME),
            ],
          ),
        ),
      ],
      true,
    ),
  )
}
