import * as gql from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import { ById } from 'tsds-tools'
import ts from 'typescript'
import { NameTracker, camelCase, className } from '../../util'

export interface PropertyConfig {
  name: string
  type: string
  isNullable: boolean
  isArray: boolean
}

export class GraphQLDocumentParserContext {
  public readonly types: ById<
    ts.InterfaceDeclaration | ts.EnumDeclaration | ts.TypeAliasDeclaration
  > = {}
  public readonly parameters: ById<PropertyConfig> = {}
  public readonly variableDefinition: ById<gql.VariableDefinitionNode> = {}
  public readonly errors: gql.GraphQLError[] = []
  private readonly interfaceNameTracker = new NameTracker()
  private readonly parameterNameTracker = new NameTracker({ prefix: true })

  constructor(public readonly typeInfo: gql.TypeInfo) {}

  parent(): Maybe<gql.GraphQLOutputType> {
    return this.typeInfo.getType()
  }

  getField(name: gql.FieldNode | string) {
    const fieldName = typeof name === 'string' ? name : name.name.value
    const fields = this.getFields()
    return fields?.[fieldName]
  }

  getFields() {
    const parent = this.typeInfo.getType()
    if (gql.isObjectType(parent)) {
      return parent.getFields()
    }
  }

  addInterface(type: ts.InterfaceDeclaration) {
    const name = type.name.escapedText ?? ''
    this.types[name] = type
    return this
  }

  addUnion(type: ts.TypeAliasDeclaration) {
    const name = type.name.escapedText ?? ''
    this.types[name] = type
    return this
  }

  addEnum(type: ts.EnumDeclaration) {
    const name = type.name.escapedText ?? ''
    this.types[name] = type
    return this
  }

  addParameter(propertyConfig: PropertyConfig, variableDefinition: gql.VariableDefinitionNode) {
    this.parameters[propertyConfig.name] = propertyConfig
    this.variableDefinition[propertyConfig.name] = variableDefinition
    return this
  }

  toInterfaceName(hash: string, name: string, ...hints: Array<string | undefined>) {
    return this.interfaceNameTracker.next(hash, className(name), ...hints.map(i => className(i)))
  }

  toParameterName(hash: string, name: string, ...hints: Array<string | undefined>) {
    return this.parameterNameTracker.next(hash, camelCase(name), ...hints.map(i => camelCase(i)))
  }

  reportError(message: string, node: gql.ASTNode) {
    this.errors.push(new gql.GraphQLError(message, { nodes: node ? [node] : undefined }))
    return this
  }
}
