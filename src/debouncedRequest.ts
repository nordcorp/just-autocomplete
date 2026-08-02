function abortError(): Error {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

export class DebouncedRequest {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private controller: AbortController | undefined;
  private rejectPending: ((reason: Error) => void) | undefined;

  run<T>(delay: number, task: (signal: AbortSignal) => Promise<T>, externalSignal?: AbortSignal): Promise<T> {
    this.cancel();
    const controller = new AbortController();
    this.controller = controller;

    return new Promise<T>((resolve, reject) => {
      this.rejectPending = reject;
      const onExternalAbort = (): void => {
        this.cancel();
      };
      externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.rejectPending = undefined;
        if (externalSignal?.aborted) {
          controller.abort();
          reject(abortError());
          return;
        }
        void task(controller.signal).then(resolve, reject).finally(() => {
          externalSignal?.removeEventListener('abort', onExternalAbort);
          if (this.controller === controller) this.controller = undefined;
        });
      }, delay);
    });
  }

  cancel(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.controller?.abort();
    this.controller = undefined;
    this.rejectPending?.(abortError());
    this.rejectPending = undefined;
  }

  dispose(): void {
    this.cancel();
  }
}
