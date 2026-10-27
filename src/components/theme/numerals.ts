import { createContext, useContext } from 'react';
import { latinDigits } from '../../core/numerals';

/**
 * The digits every number in the picker is drawn with, set once by the picker
 * from its `numerals` and `locale` props. Values and typed input stay 0–9.
 */
export const NumeralsContext =
  createContext<(text: string) => string>(latinDigits);

export const useNumerals = () => useContext(NumeralsContext);
