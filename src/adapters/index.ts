import type { ValueAdapter, ValueFormat } from '../core/types';
import { isoAdapter } from './iso';
import { utcMidnightAdapter } from './utcMidnight';

export { isoAdapter, utcMidnightAdapter };

/** The adapter for a `valueFormat` prop (default 'iso'). */
export const resolveAdapter = (
  valueFormat: ValueFormat = 'iso'
): ValueAdapter => {
  if (valueFormat === 'iso') return isoAdapter;
  if (valueFormat === 'utc-midnight') return utcMidnightAdapter;
  return valueFormat;
};
