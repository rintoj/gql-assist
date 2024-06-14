import { EditAction, createDelete, createInsert, createReplace } from './actions'
import { Token } from './token'

export function parseTrace(traces: string[], originalToken: Token[]) {
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
