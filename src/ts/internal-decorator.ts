import 'reflect-metadata'

export function InternalField(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata('internalField', true, target, propertyKey)
  }
}
