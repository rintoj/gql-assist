import { command } from 'clifer'
import sortCommand from './sort-command'

export default command('schema').description('Manage schema').command(sortCommand)
