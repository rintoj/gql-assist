import chalk from 'chalk'
import { Newline, render, Text } from 'ink'
import React from 'react'

function Status({ content, color }: { content: string; color: string }) {
  return <Text color={color}>{content}</Text>
}

export function renderStatus(content: string, status: string, color = 'gray', final: boolean) {
  if (final) {
    return console.log(chalk`{${color} [${status}] - ${content}}`)
  }
  render(<Status color={color} content={`[${status}] - ${content}`} />)
}

export function renderText(text: string, color?: string) {
  render(<Text color={color}>{text}</Text>)
}

export function renderNewLine() {
  render(<Newline />)
}
