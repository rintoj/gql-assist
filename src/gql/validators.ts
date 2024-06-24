import * as gql from 'graphql'
import { toNonNullArray } from 'tsds-tools'

export function isOperationDefinitionNode(node: gql.ASTNode): node is gql.OperationDefinitionNode {
  return node.kind === gql.Kind.OPERATION_DEFINITION
}

export function isObjectTypeDefinitionNode(
  node: gql.ASTNode,
): node is gql.ObjectTypeDefinitionNode {
  return node.kind === gql.Kind.OBJECT_TYPE_DEFINITION
}

export function isFieldNode(node: gql.ASTNode): node is gql.FieldNode {
  return node.kind === gql.Kind.FIELD
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
