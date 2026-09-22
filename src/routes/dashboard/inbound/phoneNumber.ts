/** Digits with an optional leading `+`, spaces and dashes allowed. The backend normalises the rest. */
export const isPhoneLike = (text: string) => /^\+?[\d\s-]{7,20}$/.test(text.trim());
