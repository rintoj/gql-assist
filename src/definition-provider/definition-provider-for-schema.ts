import { globStream } from 'fast-glob'
import * as gql from 'graphql'
import path from 'path'
import ts from 'typescript'
import { Location, Position, Range } from '../diff'
import { getGQLNodeRangeWithoutDescription, makeQueryParsable } from '../gql'
import { isInRange } from '../position/is-position-within-range'
import { getDecorator, hasDecorator, readTSFile } from '../ts'
import { SelectedField } from './selected-field.type'

function getPositionOfMethod(
  node: ts.MethodDeclaration | ts.PropertyDeclaration,
  sourceFile: ts.SourceFile,
) {
  const start = node.name.getStart()
  const end = node.name.getEnd()
  const startPosition = sourceFile.getLineAndCharacterOfPosition(start)
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end)
  return new Location(
    sourceFile.fileName,
    new Range(
      new Position(startPosition.line, startPosition.character),
      new Position(endPosition.line, endPosition.character),
    ),
  )
}

function parseByDecoratorAndName(
  member: ts.ClassElement,
  sourceFile: ts.SourceFile,
  decoratorName: string,
  fieldName: string,
) {
  if (
    hasDecorator(member, decoratorName) &&
    (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) &&
    ts.isIdentifier(member.name) &&
    member.name.getText() === fieldName
  ) {
    return getPositionOfMethod(member, sourceFile)
  }
}

function isResolvingAType(decorator: ts.Decorator, name: string) {
  if (
    ts.isCallExpression(decorator.expression) &&
    !!decorator.expression.arguments.length &&
    ts.isArrowFunction(decorator.expression.arguments[0]) &&
    ts.isIdentifier(decorator.expression.arguments[0].body) &&
    decorator.expression.arguments[0].body.getText() === name
  ) {
    return true
  }
}

async function processResolvers(
  selectedField: SelectedField,
  resolverPattern: string,
): Promise<Location | undefined> {
  if (!selectedField || !resolverPattern) return
  const stream = globStream(resolverPattern, { onlyFiles: true, ignore: ['**/node_modules/**'] })
  for await (const file of stream) {
    const sourceFile = readTSFile(file as string)
    for (const classDeclaration of sourceFile.statements.filter(statement =>
      ts.isClassDeclaration(statement),
    )) {
      if (!ts.isClassDeclaration(classDeclaration)) continue
      const resolverDecorator = getDecorator(classDeclaration, 'Resolver')
      if (resolverDecorator && isResolvingAType(resolverDecorator, selectedField.parent)) {
        for (const member of classDeclaration.members) {
          const location = parseByDecoratorAndName(
            member,
            sourceFile,
            'ResolveField',
            selectedField.name,
          )
          if (location) return location
        }
      } else if (resolverDecorator) {
        for (const member of classDeclaration.members) {
          const location = parseByDecoratorAndName(
            member,
            sourceFile,
            selectedField.parent,
            selectedField.name,
          )
          if (location) return location
        }
      }
    }
  }
}

function getParent(classDeclaration: ts.ClassDeclaration, sourceFile: ts.SourceFile) {
  if (!classDeclaration?.heritageClauses?.length) return
  if (
    ts.isHeritageClause(classDeclaration?.heritageClauses[0]) &&
    ts.isExpressionWithTypeArguments(classDeclaration?.heritageClauses[0].types?.[0]) &&
    ts.isIdentifier(classDeclaration?.heritageClauses[0].types?.[0].expression)
  ) {
    const parentName = classDeclaration?.heritageClauses[0].types?.[0].expression?.getText()
    const importDeclaration = sourceFile.statements.find(
      statement =>
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.importClause?.namedBindings &&
        ts.isNamedImports(statement.importClause?.namedBindings) &&
        statement.importClause.namedBindings.elements
          .map(el => el.name.getText())
          .includes(parentName),
    )
    if (
      importDeclaration &&
      ts.isImportDeclaration(importDeclaration) &&
      ts.isStringLiteral(importDeclaration.moduleSpecifier)
    ) {
      const parentSourceFile = readTSFile(
        `${path.resolve(path.dirname(sourceFile.fileName), importDeclaration.moduleSpecifier.text)}.ts`,
      )
      for (const classDeclaration of parentSourceFile.statements.filter(statement =>
        ts.isClassDeclaration(statement),
      )) {
        if (
          hasDecorator(classDeclaration, 'ObjectType') &&
          ts.isClassDeclaration(classDeclaration) &&
          classDeclaration.name?.getText() === parentName
        ) {
          return { name: parentName, classDeclaration, sourceFile: parentSourceFile }
        }
      }
    }
  }
}

function processObjectType(
  classDeclaration: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  selectedField: SelectedField,
): Location | undefined {
  if (!ts.isClassDeclaration(classDeclaration)) return
  if (
    hasDecorator(classDeclaration, 'ObjectType') &&
    classDeclaration.name?.getText() === selectedField.parent
  ) {
    for (const member of classDeclaration.members) {
      const location = parseByDecoratorAndName(member, sourceFile, 'Field', selectedField.name)
      if (location) return location
    }
    const parent = getParent(classDeclaration, sourceFile)
    if (parent) {
      if (ts.isClassDeclaration(parent.classDeclaration)) {
        const parentLocation = processObjectType(parent.classDeclaration, parent.sourceFile, {
          ...selectedField,
          parent: parent.name,
        })
        if (parentLocation) return parentLocation
      }
    }
  }
}

async function processModels(
  selectedField: SelectedField,
  modelPattern: string,
): Promise<Location | undefined> {
  if (!selectedField || !modelPattern) return
  const stream = globStream(modelPattern, { onlyFiles: true, ignore: ['**/node_modules/**'] })
  for await (const file of stream) {
    const sourceFile = readTSFile(file as string)
    for (const classDeclaration of sourceFile.statements.filter(statement =>
      ts.isClassDeclaration(statement),
    )) {
      if (ts.isClassDeclaration(classDeclaration)) {
        const location = processObjectType(classDeclaration, sourceFile, selectedField)
        if (location) return location
      }
    }
  }
}

function processFromSchema(type: string, document: gql.DocumentNode, schemaLocation: string) {
  let targetNode: gql.ASTNode | undefined
  if (!type) return
  const processNode = (node: gql.TypeDefinitionNode) => {
    if (node.name.value !== type) return
    targetNode = node
    return gql.BREAK
  }
  gql.visit(document, {
    EnumTypeDefinition(node) {
      return processNode(node)
    },
    ScalarTypeDefinition(node) {
      return processNode(node)
    },
    ObjectTypeDefinition(node) {
      return processNode(node)
    },
    InputObjectTypeDefinition(node) {
      return processNode(node)
    },
    UnionTypeDefinition(node) {
      return processNode(node)
    },
    InterfaceTypeDefinition(node) {
      return processNode(node)
    },
  })
  if (!targetNode) return
  return new Location(schemaLocation, getGQLNodeRangeWithoutDescription(targetNode))
}

export async function provideDefinitionForSchema(
  source: string,
  schemaLocation: string,
  position: Position,
  resolverPattern: string,
  modelPattern: string,
): Promise<Location | undefined> {
  try {
    const fixed = makeQueryParsable(source)
    const document = gql.parse(fixed)
    let type: string | undefined
    let selectedField: SelectedField | undefined
    const processFields = (node: gql.TypeDefinitionNode) => {
      if (!isInRange(node, position)) return
      switch (node.kind) {
        case gql.Kind.OBJECT_TYPE_DEFINITION:
        case gql.Kind.INPUT_OBJECT_TYPE_DEFINITION:
        case gql.Kind.INTERFACE_TYPE_DEFINITION:
          for (const field of node.fields ?? []) {
            if (isInRange(field.name, position)) {
              selectedField = { parent: node.name.value, name: field.name.value }
              return gql.BREAK
            }
          }
      }
    }
    gql.visit(document, {
      NamedType(node) {
        if (!isInRange(node, position)) return
        type = node.name.value
        return gql.BREAK
      },
      ObjectTypeDefinition(node) {
        return processFields(node)
      },
      InputObjectTypeDefinition(node) {
        return processFields(node)
      },
      InterfaceTypeDefinition(node) {
        return processFields(node)
      },
    })
    if (type) {
      return processFromSchema(type, document, schemaLocation)
    } else if (selectedField) {
      return (
        (await processResolvers(selectedField, resolverPattern)) ??
        (await processModels(selectedField, modelPattern))
      )
    }
  } catch (e) {
    console.error(e)
  }
}
