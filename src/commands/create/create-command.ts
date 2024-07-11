import { command, input } from 'clifer'
import { ifValidCommand, runCommand } from '../../util/run-command'

interface Props {
  name: string
}

async function run({ name }: Props) {
  if (!ifValidCommand('nest')) throw new Error('Install @nest/cli to continue!')
  await runCommand(`nest g module ${name}`)
  await runCommand(`nest g resolver ${name}`)
  await runCommand(`nest g service ${name}`)
  await runCommand(`nest g class ${name}`)
  await runCommand(`mv src/${name}/${name}.ts src/${name}/${name}.model.ts`)
  await runCommand(`find src -type f -name "*.spec.ts" -exec rm {} \\;`)
}

export default command<Props>('create')
  .description('Create a module ')
  .argument(input('name').description('Name of the module').string().required())
  .handle(run)
