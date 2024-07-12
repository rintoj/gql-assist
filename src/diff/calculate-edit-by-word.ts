import minEditDistance from 'minimum-edit-distance'
import { Position, Range } from '../position'
import { EditAction, EditActionType } from './actions'
import { parseTrace } from './parse-trace'
import { Token } from './token'

const { diff } = minEditDistance

export function splitTokensByWord(content: string) {
  let line = 0
  let character = 0
  const tokens = [...(content.match(/\s+|\S+/g) ?? [content])]
  // const tokens = content.split('\n').map(l => `${l}\n`)
  return tokens.map((text, index) => {
    const composed = new Token(
      index,
      new Range(new Position(line, character), new Position(line, character + text.length)),
      text,
    )
    if (text.indexOf('\n') >= 0) {
      line++
      character = 0
    } else {
      character += text.length
    }
    return composed
  })
}

export function calculateEditByWord(original: string, changed: string) {
  const originalTokens = splitTokensByWord(original)
  const changedTokens = splitTokensByWord(changed)
  const difference = diff(
    changedTokens.map(t => t.text),
    originalTokens.map(t => t.text),
  )
  const actions = parseTrace(difference.backtrace, originalTokens)
  // printDebugInfo(actions, originalTokens)
  return actions
}

export function applyEditsByWord(content: string, actions: EditAction[]) {
  const tokens = splitTokensByWord(content)
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
  return tokens.map(t => t.text).join('')
}
