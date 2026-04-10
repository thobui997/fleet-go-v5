import * as React from 'react';

/**
 * Custom hook that debounces a value by a specified delay.
 * Useful for search inputs, autocomplete, and other user interactions
 * where you want to wait before processing the input.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * // The debouncedSearchTerm will only update 500ms after searchTerm stops changing
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
