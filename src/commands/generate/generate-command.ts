import { command } from 'clifer'
import generateDecoratorCommand from './generate-decorator-command'
import generateHookCommand from './generate-hook-command'

export default command('generate')
  .description('GraphQL Assist converts GraphQL queries, mutations or subscriptions')
  .command(generateHookCommand)
  .command(generateDecoratorCommand)
