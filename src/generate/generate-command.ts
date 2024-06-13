import { command, input } from 'clifer'
import { writeFile } from 'fs-extra'
import { reduceAsync } from 'tsds-tools'
import ts from 'typescript'
import { generateEnum } from '../generator/enum/enum-generator'
import { generateInput } from '../generator/input/input-generator'
import { generateModel } from '../generator/model/model-generator'
import { generateResolver } from '../generator/resolver/resolver-generator'
import { readTSFile } from '../ts/parse-ts'
import { prettify } from '../ts/prettify'
import { printTS } from '../ts/print-ts'

interface GenerateProps {
  file: string
}

const plugins = [generateModel, generateInput, generateResolver, generateEnum]

export async function generate(sourceFile: ts.SourceFile) {
  return await reduceAsync(plugins, (sourceFile, runPlugin) => runPlugin(sourceFile), sourceFile)
}

async function run({ file }: GenerateProps) {
  const sourceFile = readTSFile(file)
  const output = await prettify(printTS(await generate(sourceFile), undefined))
  await writeFile(file, output)
}

export default command<GenerateProps>('generate')
  .description('Generate models and resolvers')
  .argument(
    input('file').description('The source file to inspect and generate').string().required(),
  )
  .handle(run)
