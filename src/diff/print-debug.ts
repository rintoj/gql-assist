import { green, red, yellow } from 'chalk'
import { EditAction, EditActionType } from './actions'
import { Token } from './token'

function colorize(text: string, actionType?: EditActionType) {
  switch (actionType) {
    case EditActionType.INSERT:
      return green(`\x1b[4m${text}\x1b[24m`)
    case EditActionType.REPLACE:
      return yellow(`\x1b[4m${text}\x1b[24m`)
    case EditActionType.DELETE:
      return red(`\x1b[9m${text}\x1b[29m`)
  }
  return text
}

function colorizeHeader(text: string, actionType?: EditActionType) {
  switch (actionType) {
    case EditActionType.INSERT:
      return green(text)
    case EditActionType.REPLACE:
      return yellow(text)
    case EditActionType.DELETE:
      return red(text)
  }
  return text
}

function toSeparator(showNewLine?: boolean) {
  if (!showNewLine) return ''
  return '\n'.padEnd(toLine(1, '').length + 1)
}

function toIndex(index: number) {
  return `${index}`.padStart(3)
}

function toLine(index: number, text: string, actionType?: EditActionType) {
  return `${toIndex(index)}: ${text}`
}

function toLineText(
  text: string,
  insertActions: EditAction[],
  otherAction: EditAction | undefined,
) {
  const summary = [...insertActions]
    .reverse()
    .flatMap(action => colorize(action.token.text, action.type))
    .join(toSeparator(true))

  if (otherAction?.type === EditActionType.REPLACE) {
    return [
      summary,
      [
        colorize(text, EditActionType.DELETE),
        colorize(otherAction.token.text, otherAction.type),
      ].join(''),
    ].join(toSeparator(summary.trim() !== ''))
  } else if (otherAction?.type === EditActionType.DELETE) {
    return [summary, colorize(text, EditActionType.DELETE)].join('')
  }
  return [summary, text].join(toSeparator(summary.trim() !== ''))
}

function insertActionsByIndex(actions: EditAction[], index: number) {
  return actions.filter(
    action => action.token.index === index && action.type === EditActionType.INSERT,
  )
}

function otherActionsByIndex(actions: EditAction[], index: number) {
  return actions.find(
    action => action.token.index === index && action.type !== EditActionType.INSERT,
  )
}

function toActions(actions: EditAction[]) {
  return [...actions]
    .reverse()
    .map(
      action =>
        `${colorizeHeader(action.type.toString().padStart(7), action.type)} => ${toIndex(action.token.index)}: ${action.token.text}`,
    )
}

function toDivider(length = 80) {
  return new Array(length)
    .fill(null)
    .map(() => '⎯')
    .join('')
}

export function printDebugInfo(actions: EditAction[], originalTokens: Token[]) {
  const actionText = toActions(actions)
  const divider = toDivider()
  const changes = originalTokens.flatMap((l, i) =>
    toLine(
      i,
      toLineText(l.text, insertActionsByIndex(actions, i), otherActionsByIndex(actions, i)),
    ),
  )
  console.log([divider, ...actionText, divider, ...changes, divider].join('\n'))
}
