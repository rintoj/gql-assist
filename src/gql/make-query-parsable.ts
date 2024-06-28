export function makeQueryParsable(query: string) {
  return query
    .replace(/\{\}/g, '{__typename}')
    .replace(/(\{[\s\n])([^\s\}]*)([\n\s]*\})/gm, (all, before, content, after) => {
      return [before, '__typename', after].join('')
    })
}
