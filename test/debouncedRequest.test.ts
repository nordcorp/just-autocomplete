import { afterEach, describe, expect, it, vi } from 'vitest';
import { DebouncedRequest } from '../src/debouncedRequest.js';

describe('DebouncedRequest', () => {
  afterEach(() => vi.useRealTimers());

  it('runs only the newest delayed request', async () => {
    vi.useFakeTimers();
    const runner = new DebouncedRequest();
    const task = vi.fn(async () => 'done');
    const first = runner.run(400, task);
    const second = runner.run(400, task);
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(400);
    await expect(second).resolves.toBe('done');
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('aborts an active request when a new one arrives', async () => {
    vi.useFakeTimers();
    const runner = new DebouncedRequest();
    let firstSignal: AbortSignal | undefined;
    const first = runner.run(0, signal => {
      firstSignal = signal;
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
    });
    await vi.advanceTimersByTimeAsync(0);
    const second = runner.run(10, async () => 'new');
    expect(firstSignal?.aborted).toBe(true);
    await expect(first).rejects.toThrow('aborted');
    await vi.advanceTimersByTimeAsync(10);
    await expect(second).resolves.toBe('new');
  });
});
