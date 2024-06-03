export const toParsedOutput = (output: string) =>
  output
    .split('\n')
    .map(line => `${line.trim().replace(/^(\s|\t)*/g, '')}`)
    .filter(line => line != '')
    .join('\n')
