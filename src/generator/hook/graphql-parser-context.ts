import * as gql from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import { ById } from 'tsds-tools'
import ts from 'typescript'
import { camelCase } from '../../util'
import { ParameterNameTracker } from './parameter-name-tracker'
import { TypeNameTracker } from './type-name-tracker'

export interface FieldDefinition {
  name: string
  type: string
  isNullable: boolean
  orUndefined: boolean
  isArray: boolean
}

export type TypeMap = ById<ById<FieldDefinition>>

export interface PropertyConfig {
  name: string
  type: string
  isNullable: boolean
  isArray: boolean
}

export class GraphQLParserContext {
  private readonly types: ById<
    ts.InterfaceDeclaration | ts.EnumDeclaration | ts.TypeAliasDeclaration
  > = {}
  private readonly parameters: ById<PropertyConfig> = {}
  private readonly variableDefinition: ById<gql.VariableDefinitionNode> = {}
  private readonly errors: gql.GraphQLError[] = []
  private readonly typeNameTracker = new TypeNameTracker()
  private readonly parameterNameTracker = new ParameterNameTracker()

  constructor(public readonly typeInfo: gql.TypeInfo) {}

  getParameters() {
    return Object.values(this.parameters)
  }

  getVariableDefinitions() {
    return Object.values(this.variableDefinition)
  }

  getTypes() {
    return Object.values(this.types)
  }

  getErrors() {
    return [...this.errors]
  }

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
    return this.typeNameTracker.next(hash, name, ...hints)
  }

  toParameterName(name: string, ...hints: Array<string | undefined>) {
    return this.parameterNameTracker.next(camelCase(name), ...hints.map(i => camelCase(i)))
  }

  reportError(message: string, node: gql.ASTNode) {
    this.errors.push(new gql.GraphQLError(message, { nodes: node ? [node] : undefined }))
    return this
  }
}
