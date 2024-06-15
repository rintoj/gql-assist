import { readFile, writeFile } from 'fs-extra'
import pluralize from 'pluralize'
import ts from 'typescript'
import { parseTSFile, prettify, printTS } from '../ts'
import { md5Hex } from '../util'
import { resolveFiles } from '../util/resolve-files'
import { renderText } from '../util/text-formatter'
import { withStatus } from '../util/with-status'

export async function processTypeScriptFiles(
  {
    file,
    pattern,
    ignore,
    defaultPattern,
  }: {
    file?: string
    pattern?: string
    ignore?: string
    defaultPattern?: string
  },
  callback: (sourceFile: ts.SourceFile) => Promise<ts.SourceFile>,
) {
  const files = resolveFiles({ file, pattern, ignore, defaultPattern })
  for (const file of files) {
    await withStatus(file, async () => {
      const tsContent = await readFile(file, 'utf-8')
      const hash = md5Hex(tsContent)
      const sourceFile = parseTSFile(file, tsContent)
      const output = await prettify(printTS(await callback(sourceFile), undefined))
      const hasChanged = hash !== md5Hex(output)
      if (hasChanged) await writeFile(file, output)
      return hasChanged
    })
  }
  renderText(
    `Processed ${files.length} ${pluralize('file', files.length)} ${!!process.exitCode ? 'with errors' : ''}`,
    'yellow',
  )
}
