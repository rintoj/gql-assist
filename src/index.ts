import { cli, runCli } from 'clifer'
import generate from './generate/generate-command'

const command = cli('gql-assist')
  .description(
    'Assists in generating models, resolvers, field resolvers, and GraphQL types efficiently.'
  )
  .version('1.0')
  .command(generate)

runCli(command)
