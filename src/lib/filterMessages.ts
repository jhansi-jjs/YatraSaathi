// ISSUE 0(c) + 1(c)(d): every filter reply exists in EVERY supported language.
// There is no silent English fallback when the language is known — the i18n audit
// (i18nAudit.ts) fails loudly if a language is ever missing from these tables.

import { LANGUAGE_CODES } from './languages';

type Filled = (summary: string, count: number) => string;
type Relaxed = (summary: string, altSummary: string, altCount: number, price: number) => string;

/** "Showing AC Sleeper / Volvo between ₹1000-₹1500 rated 4+ — 4 buses found." */
export const FILTER_APPLIED: Record<string, Filled> = {
  en: (s, n) => `Showing ${s} — ${n} bus${n === 1 ? '' : 'es'} found.`,
  te: (s, n) => `${s} — ${n} బస్సులు దొరికాయి. చూపిస్తున్నాను.`,
  hi: (s, n) => `${s} — ${n} बसें मिलीं। दिखा रहे हैं।`,
  ta: (s, n) => `${s} — ${n} பேருந்துகள் கிடைத்தன. காட்டுகிறோம்.`,
  kn: (s, n) => `${s} — ${n} ಬಸ್‌ಗಳು ಸಿಕ್ಕಿವೆ. ತೋರಿಸುತ್ತಿದ್ದೇವೆ.`,
  ml: (s, n) => `${s} — ${n} ബസുകൾ ലഭിച്ചു. കാണിക്കുന്നു.`,
  mr: (s, n) => `${s} — ${n} बसेस सापडल्या. दाखवत आहोत.`,
  gu: (s, n) => `${s} — ${n} બસો મળી. બતાવી રહ્યા છીએ.`,
  bn: (s, n) => `${s} — ${n} টি বাস পাওয়া গেছে। দেখাচ্ছি।`,
  ur: (s, n) => `${s} — ${n} بسیں ملیں۔ دکھا رہے ہیں۔`,
  pa: (s, n) => `${s} — ${n} ਬੱਸਾਂ ਮਿਲੀਆਂ। ਦਿਖਾ ਰਹੇ ਹਾਂ।`,
  or: (s, n) => `${s} — ${n} ବସ୍ ମିଳିଲା। ଦେଖାଉଛୁ।`,
};

/** "No Volvo under ₹1500 — 3 AC Sleeper from ₹1650. Show them?" */
export const FILTER_NO_RESULTS: Record<string, Relaxed> = {
  en: (s, alt, n, p) => `No buses match ${s}. ${n} ${alt} from ₹${p} — show them?`,
  te: (s, alt, n, p) => `${s} కి సరిపోయే బస్సులు లేవు. ${alt} — ${n} బస్సులు ₹${p} నుండి ఉన్నాయి. చూపించమంటారా?`,
  hi: (s, alt, n, p) => `${s} से मेल खाती कोई बस नहीं है। ${alt} — ${n} बसें ₹${p} से उपलब्ध हैं। दिखाएं?`,
  ta: (s, alt, n, p) => `${s} க்கு பொருந்தும் பேருந்துகள் இல்லை. ${alt} — ${n} பேருந்துகள் ₹${p} முதல். காட்டவா?`,
  kn: (s, alt, n, p) => `${s} ಗೆ ಹೊಂದುವ ಬಸ್ ಇಲ್ಲ. ${alt} — ${n} ಬಸ್‌ಗಳು ₹${p} ರಿಂದ. ತೋರಿಸಲೇ?`,
  ml: (s, alt, n, p) => `${s} ന് അനുയോജ്യമായ ബസുകൾ ഇല്ല. ${alt} — ${n} ബസുകൾ ₹${p} മുതൽ. കാണിക്കട്ടെ?`,
  mr: (s, alt, n, p) => `${s} शी जुळणारी बस नाही. ${alt} — ${n} बसेस ₹${p} पासून. दाखवू का?`,
  gu: (s, alt, n, p) => `${s} સાથે મેળ ખાતી બસ નથી. ${alt} — ${n} બસો ₹${p} થી. બતાવું?`,
  bn: (s, alt, n, p) => `${s} এর সাথে মেলে এমন বাস নেই। ${alt} — ${n} টি বাস ₹${p} থেকে। দেখাব?`,
  ur: (s, alt, n, p) => `${s} کے مطابق کوئی بس نہیں۔ ${alt} — ${n} بسیں ₹${p} سے۔ دکھاؤں؟`,
  pa: (s, alt, n, p) => `${s} ਨਾਲ ਮੇਲ ਖਾਂਦੀ ਕੋਈ ਬੱਸ ਨਹੀਂ। ${alt} — ${n} ਬੱਸਾਂ ₹${p} ਤੋਂ। ਦਿਖਾਵਾਂ?`,
  or: (s, alt, n, p) => `${s} ସହ ମେଳ ଖାଉଥିବା ବସ୍ ନାହିଁ। ${alt} — ${n} ବସ୍ ₹${p} ରୁ। ଦେଖାଇବି?`,
};

/** Spoken after "show all buses" / "clear filters". */
export const FILTER_CLEARED: Record<string, (count: number) => string> = {
  en: (n) => `Filters cleared — showing all ${n} buses.`,
  te: (n) => `ఫిల్టర్లు తొలగించాను — మొత్తం ${n} బస్సులు చూపిస్తున్నాను.`,
  hi: (n) => `फ़िल्टर हटा दिए — सभी ${n} बसें दिखा रहे हैं।`,
  ta: (n) => `வடிகட்டிகள் நீக்கப்பட்டன — அனைத்து ${n} பேருந்துகளும் காட்டப்படுகின்றன.`,
  kn: (n) => `ಫಿಲ್ಟರ್‌ಗಳನ್ನು ತೆಗೆದಿದ್ದೇನೆ — ಎಲ್ಲಾ ${n} ಬಸ್‌ಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇನೆ.`,
  ml: (n) => `ഫിൽട്ടറുകൾ നീക്കി — എല്ലാ ${n} ബസുകളും കാണിക്കുന്നു.`,
  mr: (n) => `फिल्टर काढले — सर्व ${n} बसेस दाखवत आहोत.`,
  gu: (n) => `ફિલ્ટર દૂર કર્યા — બધી ${n} બસો બતાવી રહ્યા છીએ.`,
  bn: (n) => `ফিল্টার মুছে ফেলা হয়েছে — সব ${n} টি বাস দেখানো হচ্ছে।`,
  ur: (n) => `فلٹرز ہٹا دیے — تمام ${n} بسیں دکھا رہے ہیں۔`,
  pa: (n) => `ਫਿਲਟਰ ਹਟਾ ਦਿੱਤੇ — ਸਾਰੀਆਂ ${n} ਬੱਸਾਂ ਦਿਖਾ ਰਹੇ ਹਾਂ।`,
  or: (n) => `ଫିଲ୍ଟର ହଟାଇଦେଲୁ — ସମସ୍ତ ${n} ବସ୍ ଦେଖାଉଛୁ।`,
};

/** Short label for the relaxed constraint, used inside FILTER_NO_RESULTS. */
export const RELAXED_LABEL: Record<string, Record<string, string>> = {
  model: {
    en: 'other operators', te: 'ఇతర ఆపరేటర్లు', hi: 'अन्य ऑपरेटर', ta: 'மற்ற ஆபரேட்டர்கள்',
    kn: 'ಇತರ ಆಪರೇಟರ್‌ಗಳು', ml: 'മറ്റ് ഓപ്പറേറ്റർമാർ', mr: 'इतर ऑपरेटर', gu: 'અન્ય ઓપરેટર',
    bn: 'অন্যান্য অপারেটর', ur: 'دیگر آپریٹرز', pa: 'ਹੋਰ ਆਪਰੇਟਰ', or: 'ଅନ୍ୟ ଅପରେଟର',
  },
  price: {
    en: 'slightly above your budget', te: 'బడ్జెట్ కంటే కొంచెం ఎక్కువ', hi: 'बजट से थोड़ा ऊपर',
    ta: 'பட்ஜெட்டை விட சற்று அதிகம்', kn: 'ಬಜೆಟ್‌ಗಿಂತ ಸ್ವಲ್ಪ ಹೆಚ್ಚು', ml: 'ബജറ്റിനേക്കാൾ അല്പം കൂടുതൽ',
    mr: 'बजेटपेक्षा थोडे जास्त', gu: 'બજેટ કરતાં થોડું વધારે', bn: 'বাজেটের চেয়ে কিছুটা বেশি',
    ur: 'بجٹ سے کچھ زیادہ', pa: 'ਬਜਟ ਤੋਂ ਥੋੜ੍ਹਾ ਵੱਧ', or: 'ବଜେଟଠାରୁ ଟିକେ ଅଧିକ',
  },
  rating: {
    en: 'with a lower rating', te: 'తక్కువ రేటింగ్‌తో', hi: 'कम रेटिंग वाली', ta: 'குறைந்த மதிப்பீட்டுடன்',
    kn: 'ಕಡಿಮೆ ರೇಟಿಂಗ್‌ನೊಂದಿಗೆ', ml: 'കുറഞ്ഞ റേറ്റിംഗുള്ള', mr: 'कमी रेटिंगच्या', gu: 'ઓછા રેટિંગ સાથે',
    bn: 'কম রেটিং সহ', ur: 'کم ریٹنگ کے ساتھ', pa: 'ਘੱਟ ਰੇਟਿੰਗ ਵਾਲੀਆਂ', or: 'କମ୍ ରେଟିଂ ସହିତ',
  },
  type: {
    en: 'of another seat type', te: 'వేరే సీటు రకంలో', hi: 'दूसरे सीट प्रकार की',
    ta: 'வேறு இருக்கை வகையில்', kn: 'ಬೇರೆ ಸೀಟ್ ಪ್ರಕಾರದ', ml: 'മറ്റൊരു സീറ്റ് തരത്തിൽ',
    mr: 'दुसऱ्या सीट प्रकारच्या', gu: 'બીજા સીટ પ્રકારની', bn: 'অন্য আসনের ধরনের',
    ur: 'دوسری سیٹ قسم کی', pa: 'ਹੋਰ ਸੀਟ ਕਿਸਮ ਦੀਆਂ', or: 'ଅନ୍ୟ ସିଟ୍ ପ୍ରକାରର',
  },
  ac: {
    en: 'with different AC options', te: 'వేరే ఏసీ ఆప్షన్లతో', hi: 'अलग एसी विकल्प के साथ',
    ta: 'வேறு ஏசி விருப்பங்களுடன்', kn: 'ಬೇರೆ ಎಸಿ ಆಯ್ಕೆಗಳೊಂದಿಗೆ', ml: 'വ്യത്യസ്ത എസി ഓപ്ഷനുകളോടെ',
    mr: 'वेगळ्या एसी पर्यायांसह', gu: 'અલગ એસી વિકલ્પો સાથે', bn: 'ভিন্ন এসি বিকল্প সহ',
    ur: 'مختلف اے سی آپشنز کے ساتھ', pa: 'ਵੱਖਰੇ ਏਸੀ ਵਿਕਲਪਾਂ ਨਾਲ', or: 'ଭିନ୍ନ ଏସି ବିକଳ୍ପ ସହିତ',
  },
};

function pick<T>(table: Record<string, T>, lang: string): T {
  return table[lang] ?? table.en;
}

export function filterAppliedMessage(lang: string, summary: string, count: number): string {
  return pick(FILTER_APPLIED, lang)(summary, count);
}

export function filterClearedMessage(lang: string, count: number): string {
  return pick(FILTER_CLEARED, lang)(count);
}

export function filterNoResultsMessage(
  lang: string,
  summary: string,
  relaxedKey: string,
  altCount: number,
  price: number
): string {
  const altLabel = pick(RELAXED_LABEL[relaxedKey] || RELAXED_LABEL.model, lang);
  return pick(FILTER_NO_RESULTS, lang)(summary, altLabel, altCount, price);
}

/** Language codes missing from any of the filter tables — surfaced by the i18n audit. */
export function auditFilterMessages(): string[] {
  const gaps: string[] = [];
  for (const code of LANGUAGE_CODES) {
    if (!FILTER_APPLIED[code]) gaps.push(`FILTER_APPLIED.${code}`);
    if (!FILTER_NO_RESULTS[code]) gaps.push(`FILTER_NO_RESULTS.${code}`);
    if (!FILTER_CLEARED[code]) gaps.push(`FILTER_CLEARED.${code}`);
    for (const key of Object.keys(RELAXED_LABEL)) {
      if (!RELAXED_LABEL[key][code]) gaps.push(`RELAXED_LABEL.${key}.${code}`);
    }
  }
  return gaps;
}
