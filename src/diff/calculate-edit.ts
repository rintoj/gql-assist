import minimumEditDistance from 'minimum-edit-distance'

const { diff, reconstruct } = minimumEditDistance

export enum EditActionType {
  INSERT = 'INSERT',
  REPLACE = 'REPLACE',
  DELETE = 'DELETE',
}

export interface InsertAction {
  type: EditActionType.INSERT
  line: number
  text: string
}

export interface ReplaceAction {
  type: EditActionType.REPLACE
  line: number
  text: string
}

export interface DeleteAction {
  type: EditActionType.DELETE
  line: number
  numberOfLines: number
}

export type EditAction = InsertAction | ReplaceAction | DeleteAction

export function createInsert(line: number, text: string): InsertAction {
  return { type: EditActionType.INSERT, line, text: text.replace(/^i/, '') }
}

export function createReplace(line: number, text: string): ReplaceAction {
  return { type: EditActionType.REPLACE, line, text: text.replace(/^s/, '') }
}

export function createDelete(line: number, numberOfLines: number): DeleteAction {
  return { type: EditActionType.DELETE, line: line - numberOfLines, numberOfLines }
}

function parseTrace(traces: string[], totalLength: number) {
  let line = totalLength
  const actions: EditAction[] = []
  for (const trace of traces) {
    if (/^\d+$/.test(trace)) {
      line -= Number(trace)
    } else if (trace.startsWith('i')) {
      actions.push(createInsert(line, trace))
    } else if (trace.startsWith('s')) {
      line--
      actions.push(createReplace(line, trace))
    } else if (trace.startsWith('d')) {
      const count = trace.replace(/^d/, '')
      const numberOfLines = count === '' ? 1 : Number(count)
      actions.push(createDelete(line, numberOfLines))
      line -= numberOfLines
    }
  }
  return actions
}

export function calculateEdit(original: string, changed: string) {
  const originalLines = original.split('\n')
  const changedLines = changed.split('\n')
  const difference = diff(changedLines, originalLines)
  const actions = parseTrace(difference.backtrace, originalLines.length)
  // console.log({
  //   actions,
  //   trace: difference.backtrace,
  //   original: originalLines.map((l, i) => `${i}: ${l}`),
  //   changed: changedLines.map((l, i) => `${i}: ${l}`),
  // })
  return actions
}

export function applyEdits(content: string, actions: EditAction[]) {
  const lines = content.split('\n')
  for (const action of actions) {
    switch (action.type) {
      case EditActionType.INSERT:
        lines.splice(action.line, 0, action.text)
        break
      case EditActionType.REPLACE:
        lines[action.line] = action.text
        break
      case EditActionType.DELETE:
        lines.splice(action.line, action.numberOfLines)
    }
  }
  return lines.join('\n')
}
