/**
 * Human-readable names for the ids the API speaks.
 *
 * Display only. The id is what the API stores and validates, so every option built from these
 * keeps it as `value` untouched and shows the name as `label`. A name this file does not know
 * falls back to the id's own words, so a speaker or language added upstream is never blank.
 */

/** Language tag inside a Sarvam v4-flash speaker id, e.g. the `hi` in `shubh_hi_customer`. */
const SPEAKER_LANGUAGES: Record<string, string> = {
  as: "Assamese",
  bn: "Bengali",
  en: "English",
  enhi: "Hinglish",
  gu: "Gujarati",
  hi: "Hindi",
  kn: "Kannada",
  mr: "Marathi",
  pa: "Punjabi",
  ta: "Tamil",
  te: "Telugu",
};

/** Style suffix of a speaker id, e.g. `customer_utility`. */
const SPEAKER_STYLES: Record<string, string> = {
  ads: "Ads",
  ads_formal: "Ads, formal",
  ads_informal: "Ads, informal",
  assistant: "Assistant",
  audiobook: "Audiobook",
  automobile: "Automobile",
  banking: "Banking",
  banking_expressive: "Banking, expressive",
  character: "Character",
  companion: "Companion",
  conversation: "Conversation",
  conversational: "Conversational",
  customer: "Customer support",
  customer_expressive: "Customer support, expressive",
  customer_utility: "Customer support, utility",
  customer_warm: "Customer support, warm",
  devotional: "Devotional",
  documentary: "Documentary",
  ecomm: "E-commerce",
  edtech: "Education",
  edtech_bot: "Education bot",
  feedback: "Feedback",
  insurance: "Insurance",
  interview: "Interview",
  kids: "Kids",
  kyc: "KYC verification",
  latenight: "Late night",
  latenight_warm: "Late night, warm",
  market: "Market updates",
  medical: "Medical",
  narration: "Narration",
  narration_gentle: "Narration, gentle",
  news: "News",
  news_breaking: "Breaking news",
  numbers: "Numbers",
  recovery: "Debt recovery",
  reels: "Reels",
  romantic: "Romantic",
  sales: "Sales",
  social: "Social media",
  social_energetic: "Social, energetic",
  social_excited: "Social, excited",
  social_lively: "Social, lively",
  sports: "Sports",
  sports_energetic: "Sports, energetic",
  stories: "Stories",
  stories_dramatic: "Stories, dramatic",
  stories_mixed: "Stories, mixed",
  suspense: "Suspense",
  therapist: "Therapist",
};

const titleCase = (words: string): string =>
  words
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export interface SpeakerName {
  /** `Shubh · Hindi · Customer support`. */
  label: string;
  /** What the roster groups under, e.g. `Hindi`. Absent for a bare name like `shubh`. */
  language?: string;
}

/**
 * `shubh_hi_customer` is `Shubh · Hindi · Customer support`. A Bulbul v3 speaker is a bare
 * first name (`shubh`) and only gets its capital.
 */
export const friendlySpeaker = (id: string): SpeakerName => {
  const [voice, tag, ...style] = id.split("_");
  if (!tag) return { label: titleCase(voice) };

  const language = SPEAKER_LANGUAGES[tag] ?? tag.toUpperCase();
  const styleKey = style.join("_");
  const styleName = styleKey ? (SPEAKER_STYLES[styleKey] ?? titleCase(styleKey)) : undefined;
  return { label: [titleCase(voice), language, styleName].filter(Boolean).join(" · "), language };
};

/**
 * Language codes in every alphabet the providers use: `hi-IN`, `hi`, `hin`, `en-US`. The browser
 * names all of them (ISO 639-3 included), so there is no table to keep in step. A code it cannot
 * name comes back as the code itself.
 */
const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

export const friendlyLanguage = (code: string): string => {
  try {
    return languageNames.of(code) ?? code;
  } catch {
    // `of` throws a RangeError on a code that is not well-formed, such as `unknown`.
    return code;
  }
};
