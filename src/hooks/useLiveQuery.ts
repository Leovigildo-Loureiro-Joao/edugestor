import { liveQuery } from 'dexie';
import { DependencyList, useEffect, useState } from 'react';

export function useLiveQuery<T>(
  querier: () => Promise<T> | T,
  deps: DependencyList = [],
  defaultValue?: T
): T | undefined {
  const [value, setValue] = useState<T | undefined>(defaultValue);

  useEffect(() => {
    const subscription = liveQuery(querier).subscribe({
      next: (result) => setValue(result),
      error: (error) => {
        console.error('Erro no useLiveQuery:', error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, deps);

  return value;
}

