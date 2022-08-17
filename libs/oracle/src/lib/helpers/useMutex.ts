export function useMutex(): any {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args) {
      if (this._mutex === undefined) {
        throw new Error('Class should have a _mutex property');
      }
      return this._mutex.runExclusive(async () => {
        return await originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}
