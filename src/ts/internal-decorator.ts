import 'reflect-metadata'

export function InternalField(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata('internalField', true, target, propertyKey)
  }
}

export function isInternalField(target: Object, propertyKey: string | symbol): boolean {
  return Reflect.getMetadata('internalField', target, propertyKey) === true
}
