import minimumEditDistance from 'minimum-edit-distance'
import { EditAction, EditActionType, createDelete, createInsert, createReplace } from './actions'
import { printDebugInfo } from './print-debug'
import { Token, splitTokens } from './token'

const { diff, reconstruct } = minimumEditDistance

function parseTrace(traces: string[], originalToken: Token[]) {
  let index = originalToken.length
  const actions: EditAction[] = []
  for (const trace of traces) {
    if (/^\d+$/.test(trace)) {
      index -= Number(trace)
    } else if (trace.startsWith('i')) {
      actions.push(createInsert(originalToken[index].clone().setText(trace.substring(1))))
    } else if (trace.startsWith('s')) {
      index--
      actions.push(createReplace(originalToken[index].clone().setText(trace.substring(1))))
    } else if (trace.startsWith('d')) {
      const count = trace.substring(1)
      const tokens = count === '' ? 1 : Number(count)
      for (let i = 1; i <= tokens; i++) {
        actions.push(createDelete(originalToken[index - i].clone()))
      }
      index -= tokens
    }
  }
  return actions
}

export function calculateEdit(original: string, changed: string) {
  const originalTokens = splitTokens(original)
  const changedTokens = splitTokens(changed)
  const difference = diff(
    changedTokens.map(t => t.text),
    originalTokens.map(t => t.text),
  )
  const actions = parseTrace(difference.backtrace, originalTokens)
  printDebugInfo(actions, originalTokens)
  return actions
}

export function applyEdits(content: string, actions: EditAction[]) {
  const tokens = splitTokens(content)
  for (const action of actions) {
    switch (action.type) {
      case EditActionType.INSERT:
        tokens.splice(action.token.index, 0, action.token.clone())
        break
      case EditActionType.REPLACE:
        tokens[action.token.index] = action.token.clone()
        break
      case EditActionType.DELETE:
        tokens.splice(action.token.index, 1)
        break
    }
  }
  return tokens.map(t => t.text).join('\n')
}
