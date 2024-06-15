import { yellow } from 'chalk'
import { CliExpectedError } from 'clifer'
import { sync } from 'fast-glob'
import { existsSync } from 'fs-extra'

export function resolveFiles({
  file,
  pattern,
  ignore,
  defaultPattern,
}: {
  file?: string
  pattern?: string
  ignore?: string
  defaultPattern?: string
}) {
  if (file && pattern) {
    console.warn(
      yellow(
        'We will ignore "--pattern" input because you have provided the "--file" option instead.',
      ),
    )
  }

  if (file) {
    if (!existsSync(file)) throw new CliExpectedError(`No such file ${file}`)
    return [file]
  }

  const resolvedPattern = pattern ?? defaultPattern
  if (!resolvedPattern) throw new CliExpectedError('You must provide "--pattern" or "--file".')
  const files = sync(resolvedPattern, { onlyFiles: true, ignore: ignore?.split(',') })
  if (!files.length) {
    console.log(yellow(`No file matching "${resolvedPattern}" was found!`))
    return []
  }

  return files
}
