import * as gql from 'graphql'
import {
  isFieldNode,
  isInlineFragmentNode,
  isOperationDefinitionNode,
  isVariableNode,
} from './validators'

export function getNodeName(
  node: gql.OperationDefinitionNode | gql.FieldNode | gql.InlineFragmentNode | gql.VariableNode,
) {
  if (isOperationDefinitionNode(node)) {
    return node.name?.value
  }
  if (isFieldNode(node)) {
    return node.name?.value
  }
  if (isInlineFragmentNode(node)) {
    return node.typeCondition?.name.value
  }
  if (isVariableNode(node)) {
    return node.name.value
  }
}
