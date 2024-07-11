import { command } from 'clifer'
import sortCommand from './sort-command'
import findCommand from './find-command'

export default command('schema')
  .description('Manage schema')
  .command(sortCommand)
  .command(findCommand)
