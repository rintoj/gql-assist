import { toCamelCase, toClassName } from 'name-util'

export function toString(...args: Array<string | number | false | undefined>) {
  return args.filter(i => !!i).join('')
}

export function className(...args: Array<string | false | undefined>) {
  return toClassName(args.filter(i => !!i).join('-'))
}

export function camelCase(...args: Array<string | false | undefined>) {
  return toCamelCase(args.filter(i => !!i).join('-'))
}
