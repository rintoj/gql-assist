import { toParsedOutput } from '../util/test-util'
import { parseTS, printTS, prettify } from '../util/ts-util'
import { organizeImports } from './gql-util'

describe('organizeImport', () => {
  test('to organize imports', async () => {
    const sourceFile = parseTS(`
      import { FieldResolver } from '../../common/field-resolver-type'
      import { GQLContext } from '../../context'
      import { ReturnService } from '../return/return.service'
      import { Shipment } from './shipment.model'
      import { ShipmentType, TransactionStatus } from './shipment.type'
      import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql'
    `)
    const code = await prettify(printTS(organizeImports(sourceFile)))
    expect(toParsedOutput(code)).toEqual(
      toParsedOutput(`
      import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql'
      import { FieldResolver } from '../../common/field-resolver-type'
      import { GQLContext } from '../../context'
      import { ReturnService } from '../return/return.service'
      import { Shipment } from './shipment.model'
      import { ShipmentType, TransactionStatus } from './shipment.type'
    `),
    )
  })
})
