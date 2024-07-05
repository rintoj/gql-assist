import * as gql from 'graphql'

export function isOperationDefinitionNode(node: gql.ASTNode): node is gql.OperationDefinitionNode {
  return node.kind === gql.Kind.OPERATION_DEFINITION
}

export function isObjectTypeDefinitionNode(
  node: gql.ASTNode,
): node is gql.ObjectTypeDefinitionNode {
  return node.kind === gql.Kind.OBJECT_TYPE_DEFINITION
}

export function isInputObjectTypeDefinition(
  node: gql.ASTNode,
): node is gql.InputObjectTypeDefinitionNode {
  return node.kind === gql.Kind.INPUT_OBJECT_TYPE_DEFINITION
}

export function isEnumTypeDefinition(node: gql.ASTNode): node is gql.EnumTypeDefinitionNode {
  return node.kind === gql.Kind.ENUM_TYPE_DEFINITION
}

export function isInterfaceTypeDefinition(
  node: gql.ASTNode,
): node is gql.InterfaceTypeDefinitionNode {
  return node.kind === gql.Kind.INTERFACE_TYPE_DEFINITION
}

export function isFieldNode(node: gql.ASTNode): node is gql.FieldNode {
  return node.kind === gql.Kind.FIELD
}

export function isInlineFragmentNode(node: gql.ASTNode): node is gql.InlineFragmentNode {
  return node.kind === gql.Kind.INLINE_FRAGMENT
}

export function isArgumentNode(node: gql.ASTNode): node is gql.ArgumentNode {
  return node.kind === gql.Kind.ARGUMENT
}

export function isVariableNode(node: gql.ASTNode): node is gql.VariableNode {
  return node.kind === gql.Kind.VARIABLE
}

export function isInputValueDefinitionNode(
  node: gql.ASTNode,
): node is gql.InputValueDefinitionNode {
  return node?.kind === gql.Kind.INPUT_VALUE_DEFINITION
}

export function isSelectionSetNode(node: gql.ASTNode): node is gql.SelectionSetNode {
  return node.kind === gql.Kind.SELECTION_SET
}

export function isQuery(node: gql.ASTNode): node is gql.OperationDefinitionNode {
  return isOperationDefinitionNode(node) && node.operation === gql.OperationTypeNode.QUERY
}

export function hasAQuery(document: gql.DocumentNode) {
  return document.definitions.some(def => isQuery(def))
}

export function isMutation(node: gql.ASTNode): node is gql.OperationDefinitionNode {
  return isOperationDefinitionNode(node) && node.operation === gql.OperationTypeNode.MUTATION
}

export function hasAMutation(document: gql.DocumentNode) {
  return document.definitions.some(def => isMutation(def))
}

export function isSubscription(node: gql.ASTNode): node is gql.OperationDefinitionNode {
  return isOperationDefinitionNode(node) && node.operation === gql.OperationTypeNode.SUBSCRIPTION
}

export function hasASubscription(document: gql.DocumentNode) {
  return document.definitions.some(def => isSubscription(def))
}
