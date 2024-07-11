import { cli, runCli } from 'clifer'
import create from './commands/create/create-command'
import generate from './commands/generate/generate-command'
import schema from './commands/schema/schema-command'

const command = cli('gql-assist')
  .description(
    'GQL Assist is a powerful tool designed to streamline the development of GraphQL APIs in a NestJS environment. By automatically converting TypeScript classes, resolvers, and enums into their corresponding GraphQL definitions, GQL Assist significantly reduces the amount of boilerplate code you need to write.',
  )
  .version('1.0')
  .command(generate)
  .command(create)
  .command(schema)

runCli(command)
