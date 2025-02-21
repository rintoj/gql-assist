import { GQLAssistConfig, config } from '../../config'
import { parseTSFile } from '../../ts/parse-ts'
import { prettify } from '../../ts/prettify'
import { printTS } from '../../ts/print-ts'
import { toParsedOutput } from '../../util/test-util'
import { generateEntity } from './entity-generator'

async function generate(fileName: string, content: string, initialConfig?: GQLAssistConfig) {
  const sourceFile = parseTSFile(fileName, content)
  const output = await generateEntity(sourceFile, initialConfig ?? config)
  return prettify(printTS(output, undefined, { removeComments: true }))
}

describe('entity-generator', () => {
  test('should generate an entity with basic fields', async () => {
    const output = await generate(
      'user.model.ts',
      `class User {
        id!: string
        name!: string
        username?: string
        email?: string
        bio?: string
        roles?: string[]
      }`,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Column, Entity, PrimaryColumn } from 'typeorm'

        @Entity()
        class User {
          @PrimaryColumn()
          id!: string

          @Column()
          name!: string

          @Column({ nullable: true })
          username?: string

          @Column({ nullable: true })
          email?: string

          @Column({ nullable: true })
          bio?: string

          @Column({ nullable: true, type: 'text', array: true })
          roles?: string[]
        }
      `),
    )
  })

  test('should generate an entity with enum fields', async () => {
    const output = await generate(
      'user.model.ts',
      `
      enum UserRole {
        ADMIN = 'ADMIN',
      }

      class User {
        id!: string
        name!: string
        username?: string
        email?: string
        bio?: string
        role?: UserRole
        roles?: UserRole[]
      }`,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Column, Entity, PrimaryColumn } from 'typeorm'

        enum UserRole {
          ADMIN = 'ADMIN',
        }

        @Entity()
        class User {
          @PrimaryColumn()
          id!: string

          @Column()
          name!: string

          @Column({ nullable: true })
          username?: string

          @Column({ nullable: true })
          email?: string

          @Column({ nullable: true })
          bio?: string

          @Column({ nullable: true, type: 'enum', enum: UserRole })
          role?: UserRole

          @Column({ nullable: true, array: true, type: 'enum', enum: UserRole })
          roles?: UserRole[]
        }
      `),
    )
  })

  test('should generate an entity with many-to-one relationship', async () => {
    const output = await generate(
      'post.model.ts',
      `class Post {
        id!: string
        content?: string
        authorId?: string
        author?: User
      }`,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm'

        @Entity()
        class Post {
          @PrimaryColumn()
          id!: string

          @Column({ nullable: true })
          content?: string

          @Column({ nullable: true })
          authorId?: string

          @ManyToOne(() => User, { nullable: true })
          author?: User
        }
      `),
    )
  })

  test('should generate an entity with one-to-many relationship', async () => {
    const output = await generate(
      'user.model.ts',
      `class User {
        id!: string
        name?: string
        username?: string
        @By('author') posts?: Post[]
      }`,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm'

        @Entity()
        class User {
          @PrimaryColumn()
          id!: string

          @Column({ nullable: true })
          name?: string

          @Column({ nullable: true })
          username?: string

          @OneToMany(() => Post, post => post.author, { nullable: true })
          @By('author')
          posts?: Post[]
        }
      `),
    )
  })

  test('should generate an entity with integer and float fields', async () => {
    const output = await generate(
      'user.model.ts',
      `class User {
        id!: string
        age?: number
        @Float() grade?: number
      }`,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Column, Entity, PrimaryColumn } from 'typeorm'

        @Entity()
        class User {
          @PrimaryColumn()
          id!: string

          @Column({ nullable: true })
          age?: number

          @Column({ nullable: true, type: 'float', name: 'grade' })
          @Float()
          grade?: number
        }
      `),
    )
  })

  test('should generate an entity with self-referencing fields', async () => {
    const output = await generate(
      'user.model.ts',
      `class User {
        id!: string
        followedById!: string
        followedBy!: User
      }`,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm'

        @Entity()
        class User {
          @PrimaryColumn()
          id!: string

          @Column()
          followedById!: string

          @ManyToOne(() => User)
          followedBy!: User
        }
      `),
    )
  })
})
