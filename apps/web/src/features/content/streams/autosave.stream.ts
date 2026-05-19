import { Observable } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  map,
  catchError,
  startWith,
} from 'rxjs/operators';
import { from, of } from 'rxjs';

export type AutosaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'error'; error: unknown };

export type FormSnapshot = {
  id: string;
  isDirty: boolean;
  title: string;
  body: unknown;
  slug: string;
  seo?: { metaTitle?: string; metaDescription?: string };
  tags?: string[];
  category?: string;
};

export function createAutosaveStream(
  formChanges$: Observable<FormSnapshot>,
  saveFn: (snapshot: FormSnapshot) => Promise<unknown>,
): Observable<AutosaveStatus> {
  return formChanges$.pipe(
    filter((form) => form.isDirty),
    debounceTime(30_000),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    switchMap((snapshot) =>
      from(saveFn(snapshot)).pipe(
        map(() => ({ kind: 'saved' as const, at: new Date() })),
        catchError((err: unknown) => of({ kind: 'error' as const, error: err })),
        startWith({ kind: 'saving' as const }),
      ),
    ),
  );
}
