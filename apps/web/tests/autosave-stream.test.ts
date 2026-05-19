import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Subject } from 'rxjs';
import {
  createAutosaveStream,
  type AutosaveStatus,
  type FormSnapshot,
} from '../src/features/content/streams/autosave.stream';

function makeSnapshot(overrides: Partial<FormSnapshot> = {}): FormSnapshot {
  return {
    id: 'content-1',
    isDirty: true,
    title: 'Hello World',
    body: { type: 'doc', content: [] },
    slug: 'hello-world',
    ...overrides,
  };
}

describe('createAutosaveStream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not emit when isDirty=false', async () => {
    const changes$ = new Subject<FormSnapshot>();
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const results: unknown[] = [];

    const subscription = createAutosaveStream(changes$, saveFn).subscribe((val) => {
      results.push(val);
    });

    changes$.next(makeSnapshot({ isDirty: false }));

    // Advance past the 30s debounce
    vi.advanceTimersByTime(35_000);
    await Promise.resolve();

    expect(results).toHaveLength(0);
    expect(saveFn).not.toHaveBeenCalled();

    subscription.unsubscribe();
  });

  it('debounces 30s before calling saveFn', async () => {
    const changes$ = new Subject<FormSnapshot>();
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const results: AutosaveStatus[] = [];

    const subscription = createAutosaveStream(changes$, saveFn).subscribe((val) => {
      results.push(val);
    });

    changes$.next(makeSnapshot({ isDirty: true }));

    // Before debounce fires — should not have called saveFn
    vi.advanceTimersByTime(29_999);
    await Promise.resolve();
    expect(saveFn).not.toHaveBeenCalled();
    expect(results).toHaveLength(0);

    // After debounce fires
    vi.advanceTimersByTime(1);
    // saving is emitted synchronously after debounce
    expect(results[0]).toEqual({ kind: 'saving' });

    // Resolve the promise
    await Promise.resolve();
    await Promise.resolve();

    expect(saveFn).toHaveBeenCalledOnce();
    const secondResult = results[1];
    expect(secondResult?.kind).toBe('saved');

    subscription.unsubscribe();
  });

  it('emits saving then saved on successful save', async () => {
    const changes$ = new Subject<FormSnapshot>();
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const results: AutosaveStatus[] = [];

    const subscription = createAutosaveStream(changes$, saveFn).subscribe((val) => {
      results.push(val);
    });

    changes$.next(makeSnapshot({ isDirty: true }));

    vi.advanceTimersByTime(30_000);
    expect(results[0]).toEqual({ kind: 'saving' });

    await Promise.resolve();
    await Promise.resolve();

    expect(results[1]?.kind).toBe('saved');

    subscription.unsubscribe();
  });

  it('emits saving then error on save failure', async () => {
    const changes$ = new Subject<FormSnapshot>();
    const saveError = new Error('Network error');
    const saveFn = vi.fn().mockRejectedValue(saveError);
    const results: AutosaveStatus[] = [];

    const subscription = createAutosaveStream(changes$, saveFn).subscribe((val) => {
      results.push(val);
    });

    changes$.next(makeSnapshot({ isDirty: true }));

    vi.advanceTimersByTime(30_000);
    expect(results[0]).toEqual({ kind: 'saving' });

    // Wait for the rejected promise to propagate
    await Promise.resolve();
    await Promise.resolve();

    const errorResult = results[1];
    expect(errorResult?.kind).toBe('error');
    if (errorResult?.kind === 'error') {
      expect(errorResult.error).toBe(saveError);
    }

    subscription.unsubscribe();
  });

  it('switchMap cancels previous in-flight save when new change arrives', async () => {
    const changes$ = new Subject<FormSnapshot>();
    const saveFn = vi.fn().mockResolvedValue(undefined);

    const results: AutosaveStatus[] = [];

    const subscription = createAutosaveStream(changes$, saveFn).subscribe((val) => {
      results.push(val);
    });

    // Emit first change
    changes$.next(makeSnapshot({ isDirty: true, title: 'First' }));

    // Advance to just before first debounce fires (15 of 30s elapsed)
    vi.advanceTimersByTime(15_000);
    await Promise.resolve();

    // Emit second change — this resets the debounce
    changes$.next(makeSnapshot({ isDirty: true, title: 'Second' }));

    // Advance by 30s more for second debounce to fire
    vi.advanceTimersByTime(30_000);
    expect(results[0]).toEqual({ kind: 'saving' });

    // Wait for save to complete
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Only one save call (debounce for 'First' was cancelled)
    expect(saveFn).toHaveBeenCalledOnce();
    expect(results[1]?.kind).toBe('saved');

    subscription.unsubscribe();
  });

  it('distinctUntilChanged prevents duplicate saves', async () => {
    const changes$ = new Subject<FormSnapshot>();
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const results: AutosaveStatus[] = [];

    const subscription = createAutosaveStream(changes$, saveFn).subscribe((val) => {
      results.push(val);
    });

    const snap = makeSnapshot({ isDirty: true });

    // First emission
    changes$.next(snap);
    vi.advanceTimersByTime(30_000);
    await Promise.resolve();
    await Promise.resolve();

    const firstCallCount = saveFn.mock.calls.length;
    expect(firstCallCount).toBe(1);

    // Same snapshot again — should be deduped
    changes$.next(snap);
    vi.advanceTimersByTime(30_000);
    await Promise.resolve();
    await Promise.resolve();

    // saveFn should not have been called again
    expect(saveFn.mock.calls.length).toBe(1);

    subscription.unsubscribe();
  });
});
