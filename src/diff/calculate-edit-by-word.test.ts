import { applyEditsByWord, calculateEditByWord } from './calculate-edit-by-word'

describe('calculateEdit', () => {
  test('should generate insert actions', () => {
    const original = trim(`
      class User {
        id!: string
      }
    `)

    const changed = trim(`
      class User {
        @Field(() => ID)
        id!: string
      }
    `)
    const actions = calculateEditByWord(original, changed)
    const edited = applyEditsByWord(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate replace actions', () => {
    const original = trim(`
      class User {
        @Field()
        id!: string
      }
    `)

    const changed = trim(`
      class User {
        @Field(() => ID)
        id!: string
      }
    `)
    const actions = calculateEditByWord(original, changed)
    const edited = applyEditsByWord(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate delete actions', () => {
    const original = trim(`
      class User {
        @Field(() => ID)
        id!: string

        @Field()
        name?: string
      }
    `)

    const changed = trim(`
      class User {
        @Field(() => ID)
        id!: string
      }
    `)
    const actions = calculateEditByWord(original, changed)
    const edited = applyEditsByWord(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate update and delete actions', () => {
    const original = trim(`
      class User {
        @Field(() => ID)
        id!: string

        @Field()
        name?: string
      }
    `)

    const changed = trim(`
      class User {
        @Field()
        id!: string
      }
    `)
    const actions = calculateEditByWord(original, changed)
    const edited = applyEditsByWord(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate delete and update actions', () => {
    const original = trim(`
      class User {
        @Field(() => ID)
        id!: string

        bio?: string

        @Field()
        name?: string
      }
    `)

    const changed = trim(`
      class User {
        @Field()
        id!: string

        @Field()
        name!: string

        email?: string
      }
    `)
    const actions = calculateEditByWord(original, changed)
    const edited = applyEditsByWord(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate action for removing entire content', () => {
    const original = trim(`
      class User {
        @Field(() => ID)
        id!: string

        bio?: string

        @Field()
        name?: string
      }
    `)

    const changed = trim(`
      // This is a test
      interface Post {}
    `)
    const actions = calculateEditByWord(original, changed)
    const edited = applyEditsByWord(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate action for adding entire content', () => {
    const original = trim(`
      // This is a test
    `)

    const changed = trim(`
      class User {
        @Field(() => ID)
        id!: string

        bio?: string

        @Field()
        name?: string
      }
    `)
    const actions = calculateEditByWord(original, changed)
    const edited = applyEditsByWord(original, actions)
    expect(edited).toEqual(changed)
  })
})

function trim(text: string) {
  return text
    .split('\n')
    .map(i => i.replace(/^    /g, ''))
    .join('\n')
}
