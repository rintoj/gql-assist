import 'reflect-metadata'

export function Float(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata('isFloatType', true, target, propertyKey)
  }
}

export function isFloat(target: Object, propertyKey: string | symbol): boolean {
  return Reflect.getMetadata('isFloatType', target, propertyKey) === true
}
