import { applyEdits, calculateEdit } from './calculate-edit'

describe('calculateEdit', () => {
  test('should generate insert actions', () => {
    const original = `
      class User {
        id!: string
      }
    `

    const changed = `
      class User {
        @Field(() => ID)
        id!: string
      }
    `
    const actions = calculateEdit(original, changed)
    const edited = applyEdits(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate replace actions', () => {
    const original = `
      class User {
        @Field()
        id!: string
      }
    `

    const changed = `
      class User {
        @Field(() => ID)
        id!: string
      }
    `
    const actions = calculateEdit(original, changed)
    const edited = applyEdits(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate delete actions', () => {
    const original = `
      class User {
        @Field(() => ID)
        id!: string

        @Field()
        name?: string
      }
    `

    const changed = `
      class User {
        @Field(() => ID)
        id!: string
      }
    `
    const actions = calculateEdit(original, changed)
    const edited = applyEdits(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate update and delete actions', () => {
    const original = `
      class User {
        @Field(() => ID)
        id!: string

        @Field()
        name?: string
      }
    `

    const changed = `
      class User {
        @Field()
        id!: string
      }
    `
    const actions = calculateEdit(original, changed)
    const edited = applyEdits(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate delete and update actions', () => {
    const original = `
      class User {
        @Field(() => ID)
        id!: string

        bio?: string

        @Field()
        name?: string
      }
    `

    const changed = `
      class User {
        @Field()
        id!: string

        @Field()
        name!: string

        email?: string
      }
    `
    const actions = calculateEdit(original, changed)
    const edited = applyEdits(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate action for removing entire content', () => {
    const original = `
      class User {
        @Field(() => ID)
        id!: string

        bio?: string

        @Field()
        name?: string
      }
    `

    const changed = `
      // This is a test
      interface Post {}
    `
    const actions = calculateEdit(original, changed)
    const edited = applyEdits(original, actions)
    expect(edited).toEqual(changed)
  })

  test('should generate action for adding entire content', () => {
    const original = `
      // This is a test
    `

    const changed = `
      class User {
        @Field(() => ID)
        id!: string

        bio?: string

        @Field()
        name?: string
      }
    `
    const actions = calculateEdit(original, changed)
    const edited = applyEdits(original, actions)
    expect(edited).toEqual(changed)
  })
})
