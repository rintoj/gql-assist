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
  test.only('should generate a model', async () => {
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

          @Column({ type: 'text', nullable: true, array: true })
          roles?: string[]
        }
      `),
    )
  })

  test('should generate a model with enum', async () => {
    const output = await generate(
      'user.model.ts',
      `class User {
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
        import { UserRole } from '../user-role/user-role-enum'

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

  test('should generate a model with many to one relationship', async () => {
    const output = await generate(
      'user.model.ts',
      `class User {
        @Id()
        id?: string
        name?: string
        username?: string
        @By('author') posts?: Post[]
      }`,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm'
        import { Post } from '../post/post-schema'

        @Entity()
        class User {
          @PrimaryColumn()
          id!: string

          @Column({ nullable: true })
          name?: string

          @Column({ nullable: true })
          username?: string

          @OneToMany(() => Post, post => post.author, { nullable: true })
          posts?: Post[]
        }
      `),
    )
  })

  test('should generate a model with integer and float value', async () => {
    const output = await generate(
      'user.model.ts',
      `class User {
        id!: string
        age?: number
        grade?: number
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

          @Column({ type: 'float', name: 'grade', nullable: true })
          grade?: number
        }
      `),
    )
  })

  test('should generate a model with own reference', async () => {
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
        import { Entity, Column, PrimaryColumn, ManyToOne } from 'typeorm'

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

  test('should generate id generator', async () => {
    const output = await generate(
      'user.model.ts',
      `class User {
        id!: string
        name?: string
      }`,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Column, Entity, PrimaryColumn } from 'typeorm'
        import { generateUserId } from './user-id-generator'

        @Entity()
        @IdGenerator(generateUserId)
        class User {
          @PrimaryColumn()
          id!: string

          @Column({ nullable: true })
          name?: string
        }
      `),
    )
  })
})
