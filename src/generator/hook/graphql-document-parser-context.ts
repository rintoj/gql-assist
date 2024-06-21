import * as gql from 'graphql'
import { ById } from 'tsds-tools'
import ts from 'typescript'
import { getFieldHash, getFieldName } from '../../gql'
import { NameTracker } from '../../util'
import { Maybe } from 'graphql/jsutils/Maybe'

export class GraphQLDocumentParserContext {
  public readonly types: ById<ts.InterfaceDeclaration | ts.EnumDeclaration> = {}
  public readonly parameters: ById<ts.PropertySignature> = {}
  public readonly variableDefinition: ById<gql.VariableDefinitionNode> = {}
  public readonly errors: gql.GraphQLError[] = []
  private readonly parents: Array<gql.GraphQLObjectType | undefined | null> = []
  private readonly interfaceNameTracker = new NameTracker(getFieldName, getFieldHash)
  private readonly parameterNameTracker = new NameTracker(
    (node: gql.GraphQLArgument) => node.name,
    undefined,
    { prefix: true },
  )

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

  addEnum(type: ts.EnumDeclaration) {
    const name = type.name.escapedText ?? ''
    this.types[name] = type
    return this
  }

  addParameter(
    name: string,
    type: ts.PropertySignature,
    variableDefinition: gql.VariableDefinitionNode,
  ) {
    this.parameters[name] = type
    this.variableDefinition[name] = variableDefinition
    return this
  }

  toInterfaceName(node: gql.FieldNode | gql.OperationDefinitionNode, ...hits: string[]) {
    return this.interfaceNameTracker.next(node, ...hits)
  }

  toParameterName(node: gql.GraphQLArgument, ...hits: string[]) {
    return this.parameterNameTracker.next(node, ...hits)
  }

  reportError(message: string, node: gql.ASTNode) {
    this.errors.push(new gql.GraphQLError(message, { nodes: node ? [node] : undefined }))
    return this
  }
}
