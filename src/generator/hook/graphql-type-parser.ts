import * as gql from 'graphql'
import { toClassName } from 'name-util'
import { ById } from 'tsds-tools'
import {
  createArgumentDefinition,
  createInputValueDefinition,
  updateArguments,
  updateName,
  updateVariableDefinitions,
} from '../../gql'

export interface FieldDefinition {
  name: string
  type: string
  isNullable: boolean
  orUndefined: boolean
  isArray: boolean
}

export type TypeMap = ById<ById<FieldDefinition>>

export class GraphQLTypeParser {
  private path: string[] = []
  private lastSeenName: string = ''
  private parentMap: ById<gql.GraphQLObjectType> = {}
  private typeMap: ById<ById<FieldDefinition>> = {}
  private argumentMap: ById<gql.GraphQLArgument> = {}
  private errors: gql.GraphQLError[] = []
  private document: gql.DocumentNode | undefined

  constructor(public readonly schema: gql.GraphQLSchema) {}

  private setParent(name: string, value: any, node: gql.ASTNode) {
    const key = [...this.path, name].join('.')
    if (this.parentMap[key]) {
      throw new gql.GraphQLError(
        `This document seems to have a duplicate parent path that GraphQL can not identify at '${key}'`,
        { nodes: [node] },
      )
    }
    this.lastSeenName = name
    this.parentMap[key] = value
    return this
  }

  private setArgument(name: string, value: any, node: gql.ASTNode | undefined | null) {
    const key = [...this.path, name].join('.')
    if (this.argumentMap[key]) {
      throw new gql.GraphQLError(
        `This document seems to have a duplicate argument path that GraphQL can not identify at '${key}'`,
        { nodes: node ? [node] : undefined },
      )
    }
    this.argumentMap[key] = value
    return this
  }

  private setField(
    name: string,
    fieldName: string,
    config: FieldDefinition,
    includeTypeName: boolean,
  ) {
    this.typeMap[name] =
      this.typeMap[name] ?? !includeTypeName
        ? {}
        : {
            __typename: {
              name: '__typename',
              type: `'${name}'`,
              isNullable: true,
              isArray: false,
              orUndefined: false,
            },
          }
    this.typeMap[name][fieldName] = config
  }

  private resolveFieldType(field: gql.GraphQLField<any, any> | gql.GraphQLArgument) {
    const namedType = gql.getNamedType(field.type)
    if (gql.isScalarType(namedType)) return namedType.name
    return [...this.path, field.name, namedType.name].join('.')
  }

  private toClassType(parent: gql.GraphQLObjectType<any, any>) {
    return [...this.path, parent.name].join('.')
  }

  private toFieldConfig(field: gql.GraphQLField<any, any> | gql.GraphQLArgument): FieldDefinition {
    const isArgument = field?.astNode?.kind === gql.Kind.INPUT_VALUE_DEFINITION
    return {
      name: field.name,
      type: this.resolveFieldType(field),
      isNullable: !isArgument && gql.isNullableType(field.type),
      orUndefined: isArgument,
      isArray: gql.isListType(gql.getNullableType(field.type)),
    }
  }

  /**
   * Generates localized name for each fully qualified names
   * eg: { 'fetchUser.Query': 'QueryType', 'fetchUser.user.User': 'UserType' }
   *
   * @returns  ById<string>
   */
  private generateLocalizedNameMap() {
    const nameMap: ById<string> = {}
    const toValidTypeName = (name: string) => {
      const parts = name.split('.')
      const previousName = ''
      do {
        const name =
          parts.length === 2 ? [parts.pop(), parts.pop()].reverse().join('-') : parts.pop()
        const populatedName = toClassName(`${name}-${previousName}`)
        if (!nameMap[populatedName]) return populatedName
      } while (parts.length)
      throw new Error(`Could not convert '${name}' to a valid local type`)
    }
    Object.keys(this.typeMap).map(typeName => {
      if (!nameMap[typeName]) {
        nameMap[typeName] = toValidTypeName(typeName)
      }
    })
    return nameMap
  }

  /**
   * Replaces fully qualified names to local names
   *
   * Eg:
   * From
   *    {
   *      'fetchUser.Query': {
   *        user: { name: 'user', type: 'fetchUser.user.User', isNullable: true, isArray: false }
   *      },
   *      'fetchUser.user.User': {
   *        name: { name: 'name', type: 'String', isNullable: true, isArray: false }
   *      }
   *    }
   *
   * To:
   *
   *    {
   *      QueryType: {
   *        user: { name: 'user', type: 'UserType', isNullable: true, isArray: false }
   *      },
   *      UserType: {
   *        name: { name: 'name', type: 'String', isNullable: true, isArray: false }
   *      }
   *    }
   */
  private localizeTypeNames() {
    const nameMap = this.generateLocalizedNameMap()
    this.typeMap = Object.keys(this.typeMap).reduce((a, typeName) => {
      const resolvedTypeName = nameMap[typeName]
      return {
        ...a,
        [resolvedTypeName]: Object.keys(this.typeMap[typeName]).reduce((a, fieldName) => {
          const field = this.typeMap[typeName][fieldName]
          if (fieldName === '__typename') {
            return { ...a, [fieldName]: { ...field, type: `'${nameMap[typeName]}'` ?? field.type } }
          }
          return { ...a, [fieldName]: { ...field, type: nameMap[field.type] ?? field.type } }
        }, {}),
      }
    }, {})
    return this
  }

  private addVariableDefinitions(document: gql.DocumentNode) {
    return {
      ...document,
      definitions: document.definitions.map(def => {
        if (def.kind !== gql.Kind.OPERATION_DEFINITION) return def
        const definitionName = def.name?.value
        if (!definitionName) return def // won't hit this, because it will be fixed by parser
        const argNames = Object.keys(this.argumentMap).filter(name =>
          name.startsWith(definitionName),
        )
        const variableDefinitions = argNames.map(name => {
          this.setField(
            [def.name?.value ?? '', toClassName(`${def.operation}Variables`)].join('.'),
            this.argumentMap[name].name,
            this.toFieldConfig(this.argumentMap[name]),
            false,
          )
          return createArgumentDefinition(this.argumentMap[name])
        })
        return updateVariableDefinitions(def, variableDefinitions)
      }),
    }
  }

  private nextName(node: gql.OperationDefinitionNode) {
    const selectors =
      node.selectionSet.selections
        ?.filter(selection => selection.kind === gql.Kind.FIELD)
        ?.map((selection: any) => selection.name.value) ?? []

    return selectors.join('-and-')
  }

  private push() {
    this.path.push(this.lastSeenName)
  }

  private pop() {
    this.path.pop()
    return this
  }

  private parent() {
    return this.parentMap[this.path.join('.')]
  }

  private collect(name: string, node: gql.FieldNode | gql.InlineFragmentNode) {
    const parent = this.parent()
    const field = parent?.getFields?.()?.[name]
    if (!field?.type) return this // This error will be captured by linter
    this.setField(this.toClassType(parent), name, this.toFieldConfig(field), this.path.length > 1)
    this.setParent(name, gql.getNamedType(field?.type), node)
    if (node.kind === gql.Kind.FIELD) {
      field.args.map(a => this.setArgument([name, a.name].join('.'), a, a.astNode))
      return updateArguments(
        node,
        field.args.map(arg => createInputValueDefinition(arg.name)),
      )
    }
    return node
  }

  private operation(node: gql.OperationDefinitionNode) {
    const name = node.name?.value ?? this.nextName(node)
    if (this.parentMap[name]) {
      throw new gql.GraphQLError(
        `More than one ${node.operation} can not use the name '${name}'!`,
        { nodes: [node] },
      )
    }
    const rootType = this.schema.getRootType(node.operation)
    if (!rootType?.name) {
      this.errors.push(
        new gql.GraphQLError(
          `Schema validation failed: The root ${node.operation} type is missing from the schema. Please ensure that a root ${node.operation} type is defined.`,
          { nodes: [node] },
        ),
      )
      return node
    }
    this.setParent(name, rootType, node)
    return updateName(node, name)
  }

  getTypeMap() {
    return this.typeMap
  }

  getDocument() {
    return this.document as gql.DocumentNode
  }

  getErrors() {
    return this.errors
  }

  static parse(schema: gql.GraphQLSchema, document: gql.DocumentNode) {
    const parser = new GraphQLTypeParser(schema)
    const fixedDocument = gql.visit(document, {
      OperationDefinition(node) {
        return parser.operation(node)
      },
      Field(node) {
        return parser.collect(node.name.value, node)
      },
      InlineFragment(node) {
        const name = node.typeCondition?.name.value
        if (!name) {
          throw new gql.GraphQLError(`Inline fragment is missing a name`, { nodes: [node] })
        }
        return parser.collect(name, node)
      },
      enter(node) {
        if (node.kind == gql.Kind.SELECTION_SET) {
          parser.push()
        }
        return node
      },
      leave(node) {
        if (node.kind == gql.Kind.SELECTION_SET) {
          parser.pop()
        }
        return node
      },
    })
    parser.document = parser.addVariableDefinitions(fixedDocument)
    parser.localizeTypeNames()
    return parser
  }
}
