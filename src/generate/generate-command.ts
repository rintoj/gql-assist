import { command, input } from 'clifer'
import { writeFile } from 'fs-extra'
import { reduceAsync } from 'tsds-tools'
import ts from 'typescript'
import { generateModel } from '../gql/model/model-generator'
import { prettify, printTS, readAndParseTSFile } from '../util/ts-util'

interface GenerateProps {
  file: string
}

const plugins = [generateModel]

async function generate(sourceFile: ts.SourceFile) {
  return await reduceAsync(plugins, (sourceFile, runPlugin) => runPlugin(sourceFile), sourceFile)
}

async function run({ file }: GenerateProps) {
  const sourceFile = readAndParseTSFile(file)
  const output = await prettify(
    printTS(await generate(sourceFile), undefined, { removeComments: true }),
  )
  await writeFile(file, output)
}

export default command<GenerateProps>('generate')
  .argument(
    input('file').description('The source file to inspect and generate').string().required(),
  )
  .handle(run)
