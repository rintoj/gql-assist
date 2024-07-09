import { toParsedOutput } from '../util/test-util'
import { organizeImports } from './organize-imports'
import { parseTS } from './parse-ts'
import { prettify } from './prettify'
import { printTS } from './print-ts'

describe('organizeImport', () => {
  test('to organize imports', async () => {
    const sourceFile = parseTS(`
      import { FieldResolver } from '../../common/field-resolver-type'
      import { GQLContext } from '../../context'
      import { ReturnService } from '../return/return.service'
      import { Shipment } from './shipment.model'
      import { ShipmentType, TransactionStatus } from './shipment.type'
      import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql'
      import gql from 'graphql'
      import * as ts from 'typescript'
    `)
    const code = await prettify(printTS(organizeImports(sourceFile)))
    expect(toParsedOutput(code)).toEqual(
      toParsedOutput(`
      import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql'
      import gql from 'graphql'
      import * as ts from 'typescript'
      import { FieldResolver } from '../../common/field-resolver-type'
      import { GQLContext } from '../../context'
      import { ReturnService } from '../return/return.service'
      import { Shipment } from './shipment.model'
      import { ShipmentType, TransactionStatus } from './shipment.type'
    `),
    )
  })

  test('to organize imports', async () => {
    const sourceFile = parseTS(`
      import { Field, ObjectType } from '@nestjs/graphql'
      import { Model } from '../../common/model'
      import { RecoveryMethod } from '../../recovery-method/recovery-method.model'
      import { RecoveryMethodType } from '../../recovery-method/recovery-method.type'
      import { ReturnStatus } from './return-status.enum'
      import { Shipment } from '../shipment/shipment.model'
      import { ShipmentType } from '../shipment/shipment.type'
      import { User } from '../../user/user.model'
    `)
    const code = await prettify(printTS(organizeImports(sourceFile)))
    expect(toParsedOutput(code)).toEqual(
      toParsedOutput(`
        import { Field, ObjectType } from '@nestjs/graphql'
        import { Model } from '../../common/model'
        import { RecoveryMethod } from '../../recovery-method/recovery-method.model'
        import { RecoveryMethodType } from '../../recovery-method/recovery-method.type'
        import { User } from '../../user/user.model'
        import { Shipment } from '../shipment/shipment.model'
        import { ShipmentType } from '../shipment/shipment.type'
        import { ReturnStatus } from './return-status.enum'
    `),
    )
  })

  test('to organize imports', async () => {
    const sourceFile = parseTS(`
      import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql'
      import { GQLContext } from '../../context'
      import { LocationService } from '../location/location.service'
      import { StorageLocation } from './storage-location.model'
      import { StorageLocationType } from './storage-location.type'
      import { FieldResolver } from 'src/common/field-resolver-type'`)
    const code = await prettify(printTS(organizeImports(sourceFile)))
    expect(toParsedOutput(code)).toEqual(
      toParsedOutput(`
        import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql'
        import { FieldResolver } from 'src/common/field-resolver-type'
        import { GQLContext } from '../../context'
        import { LocationService } from '../location/location.service'
        import { StorageLocation } from './storage-location.model'
        import { StorageLocationType } from './storage-location.type'
    `),
    )
  })

  test('to organize imports with alias', async () => {
    const sourceFile = parseTS(`
      import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql'
      import { GQLContext as Context } from '../../context'
      import { LocationService } from '../location/location.service'
      import { StorageLocation } from './storage-location.model'
      import { StorageLocationType } from './storage-location.type'
      import { FieldResolver } from 'src/common/field-resolver-type'`)
    const code = await prettify(printTS(organizeImports(sourceFile)))
    expect(toParsedOutput(code)).toEqual(
      toParsedOutput(`
        import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql'
        import { FieldResolver } from 'src/common/field-resolver-type'
        import { GQLContext as Context } from '../../context'
        import { LocationService } from '../location/location.service'
        import { StorageLocation } from './storage-location.model'
        import { StorageLocationType } from './storage-location.type'
    `),
    )
  })

  test('to organize imports with type', async () => {
    const sourceFile = parseTS(`
      import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql'
      import type { GQLContext } from '../../context'
      import { LocationService } from '../location/location.service'
      import { StorageLocation } from './storage-location.model'
      import { StorageLocationType } from './storage-location.type'
      import { FieldResolver } from 'src/common/field-resolver-type'`)
    const code = await prettify(printTS(organizeImports(sourceFile)))
    expect(toParsedOutput(code)).toEqual(
      toParsedOutput(`
        import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql'
        import { FieldResolver } from 'src/common/field-resolver-type'
        import type { GQLContext } from '../../context'
        import { LocationService } from '../location/location.service'
        import { StorageLocation } from './storage-location.model'
        import { StorageLocationType } from './storage-location.type'
    `),
    )
  })
})
