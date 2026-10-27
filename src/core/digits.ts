/**
 * The zero of each decimal digit block a keyboard may type in: Arabic-Indic
 * (٠–٩), Persian (۰–۹), N'Ko, the Indic scripts, Thai, Lao, Tibetan, Myanmar,
 * Khmer, Mongolian and full-width. Each block runs zero to nine in order.
 */
const DIGIT_ZEROS = [
  0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6,
  0x0c66, 0x0ce6, 0x0d66, 0x0e50, 0x0ed0, 0x0f20, 0x1040, 0x17e0, 0x1810,
  0xff10,
];

/** Any decimal digits as 0–9 ('٢٥' → '25'); other characters are kept. */
export const toLatinDigits = (text: string): string => {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    const zero = DIGIT_ZEROS.find((z) => code >= z && code <= z + 9);
    out += zero === undefined ? ch : String(code - zero);
  }
  return out;
};
