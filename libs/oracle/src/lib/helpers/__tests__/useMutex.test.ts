import { useMutex } from '../useMutex.js';
import { Mutex } from 'async-mutex';
import { expect } from '@jest/globals';

class WithMutex {
  public value: number = 0;
  private _mutex = new Mutex();

  @useMutex()
  public async incrementAsync(): Promise<void> {
    const before = this.value;
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    this.value = before + 1;
  }
}

class WithoutMutex {
  public value: number = 0;

  public async incrementAsync(): Promise<void> {
    const before = this.value;
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    this.value = before + 1;
  }
}

it('should not work without mutex', async () => {
  const withMutex = new WithoutMutex();
  await Promise.all([withMutex.incrementAsync(), withMutex.incrementAsync()]);

  expect(withMutex.value).toEqual(1);
});

it('should work with mutex', async () => {
  const withMutex = new WithMutex();
  await Promise.all([withMutex.incrementAsync(), withMutex.incrementAsync()]);
  expect(withMutex.value).toEqual(2);
});
