import 'reflect-metadata'

export function By(field: string): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata('one-to-many-by', field, target, propertyKey)
  }
}

export function getBy(target: Object, propertyKey: string | symbol): boolean {
  return Reflect.getMetadata('one-to-many-by', target, propertyKey)
}
