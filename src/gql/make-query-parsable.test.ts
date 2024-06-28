import { makeQueryParsable } from './make-query-parsable'

describe('makeQueryParsable', () => {
  test('should not update a valid query', () => {
    const query = `
      query {
        me {
          id
        }
      }
    `
    expect(makeQueryParsable(query)).toEqual(query)
  })

  test('should add __typename if a field is missing', () => {
    const query = `
      query {
        me {
        }
      }
    `
    const output = `
      query {
        me {
__typename        }
      }
    `
    expect(makeQueryParsable(query)).toEqual(output)
  })

  test('should add __typename if a field is missing', () => {
    const query = `
      query {
      }
    `
    const output = `
      query {
__typename      }
    `
    expect(makeQueryParsable(query)).toEqual(output)
  })

  test('should add __typename if a field is missing', () => {
    const query = `
      query {
        me {}
        user {
          id
          partner{}
          test{id}
        }
      }
    `
    const output = `
      query {
        me {__typename}
        user {
          id
          partner{__typename}
          test{id}
        }
      }
    `
    expect(makeQueryParsable(query)).toEqual(output)
  })

  test('should add __typename if a field is missing', () => {
    const query = `
      {
      }
    `
    const output = `
      {
__typename      }
    `
    expect(makeQueryParsable(query)).toEqual(output)
  })
})
