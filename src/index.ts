import { cli, runCli } from 'clifer'
import generate from './generate/generate-command'
import create from './create/create-command'

const command = cli('gql-assist')
  .description(
    'Assists in generating models, resolvers, field resolvers, and GraphQL types efficiently.',
  )
  .version('1.0')
  .command(generate)
  .command(create)

runCli(command)
