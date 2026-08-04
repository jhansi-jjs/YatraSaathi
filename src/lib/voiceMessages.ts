// Every user-facing voice/chat string, in every supported language.
//
// ISSUE 0(c): these used to live inside VoiceSearchBar.tsx, where nothing could check
// them for completeness and new strings were added in English only. They now live in
// lib/ so i18nAudit.ts can verify that EVERY supported language has EVERY key, and so
// the voice bar and the chatbot literally share the same text.

import { LANGUAGE_CODES, getLanguage } from './languages';

export const CLARIFICATIONS: Record<string, string> = {
  te: 'దయచేసి మీరు ఏ నగరం నుండి ఏ నగరానికి వెళ్లాలనుకుంటున్నారో చెప్పండి (ఉదా: విజయవాడ నుండి హైదరాబాద్).',
  hi: 'कृपया प्रस्थान और गंतव्य शहर बताएं (जैसे: विजयवाड़ा से हैदराबाद)।',
  ta: 'தயவுசெய்து புறப்படும் மற்றும் செல்லும் நகரத்தைக் கூறுங்கள் (எ.கா: விஜயவாடாவிலிருந்து ஹைதராபாத்).',
  kn: 'ದಯವಿಟ್ಟು ಹೊರಡುವ ಮತ್ತು ತಲುಪುವ ನಗರವನ್ನು ತಿಳಿಸಿ (ಉದಾ: ವಿಜಯವಾಡದಿಂದ ಹೈದರಾಬಾದ್).',
  ml: 'ദയവായി പുറപ്പെടുന്ന നഗരവും എത്തുന്ന നഗരവും പറയുക (ഉദാ: കൊച്ചിയിൽ നിന്ന് വരംഗലിലേക്ക്).',
  mr: 'कृपया प्रस्थान आणि गंतव्य शहर सांगा (उदा: मुंबई ते पुणे).',
  gu: 'કૃપા કરીને ઉપડવાનું અને પહોંચવાનું શહેર જણાવો (ઉદા: મુંબઈ થી પુણે).',
  bn: 'অনুগ্রহ করে যাত্রার শহর এবং গন্তব্য জানান (যেমন: কলকাতা থেকে দিল্লি)।',
  ur: 'براہ کرم روانگی کا شہر اور منزل بتائیں (مثلاً: حیدرآباد سے ممبئی)۔',
  pa: 'ਕਿਰਪਾ ਕਰਕੇ ਚੱਲਣ ਅਤੇ ਪਹੁੰਚਣ ਦਾ ਸ਼ਹਿਰ ਦੱਸੋ (ਜਿਵੇਂ: ਦਿੱਲੀ ਤੋਂ ਮੁੰਬਈ)।',
  or: 'ଦୟାକରି ଯାତ୍ରା ଆରମ୍ଭ ଏବଂ ଗନ୍ତବ୍ୟ ସହର କୁହନ୍ତୁ (ଯଥା: କୋଲକାତା ରୁ ଦିଲ୍ଲୀ)।',
  en: 'Please specify your origin and destination cities (e.g., Vijayawada to Hyderabad).',
};

export const CONFIRMATIONS: Record<string, (o: string, d: string) => string> = {
  te: (o, d) => `సరే! మీరు ${o} నుండి ${d} వెళ్లే బస్సులను చూపిస్తున్నాను.`,
  hi: (o, d) => `ठीक है! हम आपको ${o} से ${d} जाने वाली बसें दिखा रहे हैं।`,
  ta: (o, d) => `சரி! நாங்கள் உங்களுக்கு ${o} இலிருந்து ${d} செல்லும் பேருந்துகளைக் காட்டுகிறோம்.`,
  // Was mis-typed with a Telugu "సరి!" opening — now correct Kannada.
  kn: (o, d) => `ಸರಿ! ನಾವು ನಿಮಗೆ ${o} ದಿಂದ ${d} ಗೆ ಹೋಗುವ ಬಸ್‌ಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇವೆ.`,
  ml: (o, d) => `ശരി! ഞങ്ങൾ നിങ്ങൾക്ക് ${o} ൽ നിന്ന് ${d} ലേക്ക് പോകുന്ന ബസുകൾ കാണിക്കുന്നു.`,
  mr: (o, d) => `ठीक आहे! आम्ही तुम्हाला ${o} ते ${d} जाणाऱ्या बसेस दाखवत आहोत.`,
  gu: (o, d) => `બરાબર! અમે તમને ${o} થી ${d} જતી બસો બતાવી રહ્યા છીએ.`,
  bn: (o, d) => `ঠিক আছে! আমরা আপনাকে ${o} থেকে ${d} যাওয়ার বাসগুলো দেখাচ্ছি।`,
  ur: (o, d) => `ٹھیک ہے! ہم آپ کو ${o} سے ${d} جانے والی بسیں دکھا رہے ہیں۔`,
  pa: (o, d) => `ਠੀਕ ਹੈ! ਅਸੀਂ ਤੁਹਾਨੂੰ ${o} ਤੋਂ ${d} ਜਾਣ ਵਾਲੀਆਂ ਬੱਸਾਂ ਦਿਖਾ ਰਹੇ ਹਾਂ।`,
  or: (o, d) => `ଠିକ୍ ଅଛି! ଆମେ ଆପଣଙ୍କୁ ${o} ରୁ ${d} ଯାଉଥିବା ବସ୍ ଦେଖାଉଛୁ।`,
  en: (o, d) => `Got it! You're planning to travel from ${o} to ${d}.`,
};

// Shown while the free-tier Render backend cold-starts (ISSUE 5 — deployed reality).
export const SERVER_WAKING_MSG: Record<string, string> = {
  te: '⏳ సర్వర్ మేల్కొంటోంది… ప్రస్తుతం మీ ఫోన్ స్పీచ్ ఉపయోగిస్తున్నాము.',
  hi: '⏳ सर्वर जाग रहा है… तब तक डिवाइस स्पीच का उपयोग हो रहा है।',
  ta: '⏳ சர்வர் விழிக்கிறது… தற்போது சாதன பேச்சு பயன்படுத்தப்படுகிறது.',
  kn: '⏳ ಸರ್ವರ್ ಎಚ್ಚರಗೊಳ್ಳುತ್ತಿದೆ… ಸದ್ಯಕ್ಕೆ ಸಾಧನದ ಧ್ವನಿ ಬಳಸಲಾಗುತ್ತಿದೆ.',
  ml: '⏳ സെർവർ ഉണരുന്നു… തൽക്കാലം ഉപകരണ സ്പീച്ച് ഉപയോഗിക്കുന്നു.',
  mr: '⏳ सर्व्हर जागत आहे… तोपर्यंत डिव्हाइस स्पीच वापरत आहोत.',
  gu: '⏳ સર્વર જાગી રહ્યું છે… ત્યાં સુધી ડિવાઇસ સ્પીચ વાપરીએ છીએ.',
  bn: '⏳ সার্ভার জেগে উঠছে… আপাতত ডিভাইস স্পিচ ব্যবহার করা হচ্ছে।',
  ur: '⏳ سرور بیدار ہو رہا ہے… فی الحال ڈیوائس اسپیچ استعمال ہو رہی ہے۔',
  pa: '⏳ ਸਰਵਰ ਜਾਗ ਰਿਹਾ ਹੈ… ਤਦ ਤੱਕ ਡਿਵਾਈਸ ਸਪੀਚ ਵਰਤ ਰਹੇ ਹਾਂ।',
  or: '⏳ ସର୍ଭର ଜାଗୁଛି… ବର୍ତ୍ତମାନ ଡିଭାଇସ୍ ସ୍ପିଚ୍ ବ୍ୟବହାର ହେଉଛି।',
  en: '⏳ Server is waking up… using device speech meanwhile.',
};

export const MIC_PERMISSION_ERROR: Record<string, string> = {
  te: 'వాయిస్ సెర్చ్ కోసం మైక్రోఫోన్ అనుమతి కావాలి. దయచేసి బ్రౌజర్‌లో మైక్ యాక్సెస్ ఇవ్వండి.',
  hi: 'वॉइस सर्च के लिए माइक्रोफ़ोन की अनुमति चाहिए। कृपया ब्राउज़र में माइक एक्सेस दें।',
  ta: 'குரல் தேடலுக்கு மைக்ரோஃபோன் அனுமதி தேவை. உலாவியில் மைக் அணுகலை அனுமதிக்கவும்.',
  kn: 'ಧ್ವನಿ ಹುಡುಕಾಟಕ್ಕೆ ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ಬೇಕು. ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮೈಕ್ ಪ್ರವೇಶ ನೀಡಿ.',
  ml: 'വോയ്‌സ് തിരയലിന് മൈക്രോഫോൺ അനുമതി വേണം. ബ്രൗസറിൽ മൈക്ക് ആക്‌സസ് അനുവദിക്കുക.',
  mr: 'व्हॉइस सर्चसाठी मायक्रोफोन परवानगी हवी. कृपया ब्राउझरमध्ये माइक अ‍ॅक्सेस द्या.',
  gu: 'વોઇસ સર્ચ માટે માઇક્રોફોન પરવાનગી જોઈએ. કૃપા કરીને બ્રાઉઝરમાં માઇક એક્સેસ આપો.',
  bn: 'ভয়েস সার্চের জন্য মাইক্রোফোন অনুমতি প্রয়োজন। ব্রাউজারে মাইক অ্যাক্সেস দিন।',
  ur: 'وائس سرچ کے لیے مائیکروفون کی اجازت درکار ہے۔ براہ کرم براؤزر میں مائیک تک رسائی دیں۔',
  pa: 'ਵੌਇਸ ਖੋਜ ਲਈ ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਇਜਾਜ਼ਤ ਚਾਹੀਦੀ ਹੈ। ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਮਾਈਕ ਪਹੁੰਚ ਦਿਓ।',
  or: 'ଭଏସ୍ ସର୍ଚ୍ଚ ପାଇଁ ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ଦରକାର। ବ୍ରାଉଜରରେ ମାଇକ୍ ଆକ୍ସେସ୍ ଦିଅନ୍ତୁ।',
  en: 'Microphone permission is required for voice search. Please allow mic access in your browser.',
};

export const EMPTY_TRANSCRIPT_MSG: Record<string, string> = {
  te: 'మైక్రోఫోన్ ఆడియో వినిపించలేదు. దయచేసి మైక్ బటన్ నొక్కి స్పష్టంగా మాట్లాడండి.',
  hi: 'माइक्रोफ़ोन ऑडियो सुनाई नहीं दिया। कृपया माइक बटन दबाकर स्पष्ट बोलें।',
  ta: 'மைக்ரோஃபோன் ஒலி கேட்கவில்லை. மைக் பொத்தானை அழுத்தி தெளிவாகப் பேசுங்கள்.',
  kn: 'ಮೈಕ್ರೊಫೋನ್ ಧ್ವನಿ ಕೇಳಿಸಲಿಲ್ಲ. ಮೈಕ್ ಬಟನ್ ಒತ್ತಿ ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ.',
  ml: 'മൈക്രോഫോൺ ശബ്ദം കേട്ടില്ല. മൈക്ക് ബട്ടൺ അമർത്തി വ്യക്തമായി സംസാരിക്കുക.',
  mr: 'मायक्रोफोन आवाज ऐकू आला नाही. माइक बटण दाबून स्पष्ट बोला.',
  gu: 'માઇક્રોફોન અવાજ સંભળાયો નહીં. માઇક બટન દબાવીને સ્પષ્ટ બોલો.',
  bn: 'মাইক্রোফোনের শব্দ শোনা যায়নি। মাইক বোতাম চেপে স্পষ্ট করে বলুন।',
  ur: 'مائیکروفون کی آواز سنائی نہیں دی۔ مائیک بٹن دبا کر صاف بولیں۔',
  pa: 'ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਆਵਾਜ਼ ਸੁਣਾਈ ਨਹੀਂ ਦਿੱਤੀ। ਮਾਈਕ ਬਟਨ ਦਬਾ ਕੇ ਸਾਫ਼ ਬੋਲੋ।',
  or: 'ମାଇକ୍ରୋଫୋନ୍ ଶବ୍ଦ ଶୁଣାଗଲା ନାହିଁ। ମାଇକ୍ ବଟନ୍ ଦବାଇ ସ୍ପଷ୍ଟ କୁହନ୍ତୁ।',
  en: 'Microphone audio was not heard. Please hold the mic button and speak clearly.',
};

// Shown when Chrome has no recognition engine for the chosen language, so the audio
// is sent to the backend Whisper model instead of being mis-transcribed as English.
export const STT_BROWSER_UNSUPPORTED: Record<string, (lang: string) => string> = {
  te: (l) => `మీ బ్రౌజర్‌లో ${l} స్పీచ్ గుర్తింపు లేదు — మా సర్వర్ ద్వారా వింటున్నాము.`,
  hi: (l) => `आपके ब्राउज़र में ${l} स्पीच पहचान नहीं है — हम सर्वर से सुन रहे हैं।`,
  ta: (l) => `உங்கள் உலாவியில் ${l} பேச்சு அறிதல் இல்லை — சேவையகம் வழியாகக் கேட்கிறோம்.`,
  kn: (l) => `ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ${l} ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಇಲ್ಲ — ಸರ್ವರ್ ಮೂಲಕ ಕೇಳುತ್ತಿದ್ದೇವೆ.`,
  ml: (l) => `നിങ്ങളുടെ ബ്രൗസറിൽ ${l} സ്പീച്ച് തിരിച്ചറിയൽ ഇല്ല — സെർവർ വഴി കേൾക്കുന്നു.`,
  mr: (l) => `तुमच्या ब्राउझरमध्ये ${l} स्पीच ओळख नाही — आम्ही सर्व्हरद्वारे ऐकत आहोत.`,
  gu: (l) => `તમારા બ્રાઉઝરમાં ${l} સ્પીચ ઓળખ નથી — અમે સર્વર દ્વારા સાંભળીએ છીએ.`,
  bn: (l) => `আপনার ব্রাউজারে ${l} স্পিচ শনাক্তকরণ নেই — আমরা সার্ভারের মাধ্যমে শুনছি।`,
  ur: (l) => `آپ کے براؤزر میں ${l} تقریر کی شناخت نہیں ہے — ہم سرور کے ذریعے سن رہے ہیں۔`,
  pa: (l) => `ਤੁਹਾਡੇ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ${l} ਸਪੀਚ ਪਛਾਣ ਨਹੀਂ ਹੈ — ਅਸੀਂ ਸਰਵਰ ਰਾਹੀਂ ਸੁਣ ਰਹੇ ਹਾਂ।`,
  or: (l) => `ଆପଣଙ୍କ ବ୍ରାଉଜରରେ ${l} ସ୍ପିଚ୍ ଚିହ୍ନଟ ନାହିଁ — ଆମେ ସର୍ଭର ମାଧ୍ୟମରେ ଶୁଣୁଛୁ।`,
  en: (l) => `Your browser has no ${l} speech recognition — listening via our server instead.`,
};

// Shown when neither a browser voice nor an edge-tts voice exists for the language:
// the reply is still delivered, as visible text (ISSUE 0d).
export const TTS_UNAVAILABLE_MSG: Record<string, (lang: string) => string> = {
  te: (l) => `${l} లో ఆడియో సమాధానం అందుబాటులో లేదు — సమాధానం పైన టెక్స్ట్‌గా ఉంది.`,
  hi: (l) => `${l} में ऑडियो उत्तर उपलब्ध नहीं है — उत्तर ऊपर टेक्स्ट में है।`,
  ta: (l) => `${l} இல் ஒலி பதில் இல்லை — பதில் மேலே உரையாக உள்ளது.`,
  kn: (l) => `${l} ನಲ್ಲಿ ಆಡಿಯೋ ಉತ್ತರ ಲಭ್ಯವಿಲ್ಲ — ಉತ್ತರ ಮೇಲೆ ಪಠ್ಯದಲ್ಲಿದೆ.`,
  ml: (l) => `${l} ൽ ഓഡിയോ മറുപടി ലഭ്യമല്ല — മറുപടി മുകളിൽ ടെക്‌സ്റ്റായി ഉണ്ട്.`,
  mr: (l) => `${l} मध्ये ऑडिओ उत्तर उपलब्ध नाही — उत्तर वर मजकुरात आहे.`,
  gu: (l) => `${l} માં ઓડિયો જવાબ ઉપલબ્ધ નથી — જવાબ ઉપર ટેક્સ્ટમાં છે.`,
  bn: (l) => `${l} এ অডিও উত্তর নেই — উত্তর উপরে টেক্সটে আছে।`,
  ur: (l) => `${l} میں آڈیو جواب دستیاب نہیں — جواب اوپر متن میں ہے۔`,
  pa: (l) => `${l} ਵਿੱਚ ਆਡੀਓ ਜਵਾਬ ਉਪਲਬਧ ਨਹੀਂ — ਜਵਾਬ ਉੱਪਰ ਟੈਕਸਟ ਵਿੱਚ ਹੈ।`,
  or: (l) => `${l} ରେ ଅଡିଓ ଉତ୍ତର ଉପଲବ୍ଧ ନାହିଁ — ଉତ୍ତର ଉପରେ ଟେକ୍ସଟରେ ଅଛି।`,
  en: (l) => `No audio reply available in ${l} — the answer is shown above as text.`,
};

export const SPEECH_NOT_SUPPORTED: Record<string, string> = {
  te: 'ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ లేదు. దయచేసి మీ సందేశాన్ని టైప్ చేయండి.',
  hi: 'इस ब्राउज़र में वॉइस इनपुट नहीं है। कृपया अपना संदेश टाइप करें।',
  ta: 'இந்த உலாவியில் குரல் உள்ளீடு இல்லை. உங்கள் செய்தியைத் தட்டச்சு செய்யவும்.',
  kn: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಇಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ.',
  ml: 'ഈ ബ്രൗസറിൽ വോയ്‌സ് ഇൻപുട്ട് ഇല്ല. ദയവായി സന്ദേശം ടൈപ്പ് ചെയ്യുക.',
  mr: 'या ब्राउझरमध्ये व्हॉइस इनपुट नाही. कृपया तुमचा संदेश टाइप करा.',
  gu: 'આ બ્રાઉઝરમાં વોઇસ ઇનપુટ નથી. કૃપા કરીને તમારો સંદેશ ટાઇપ કરો.',
  bn: 'এই ব্রাউজারে ভয়েস ইনপুট নেই। অনুগ্রহ করে আপনার বার্তা টাইপ করুন।',
  ur: 'اس براؤزر میں وائس ان پٹ نہیں ہے۔ براہ کرم اپنا پیغام ٹائپ کریں۔',
  pa: 'ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਵੌਇਸ ਇਨਪੁੱਟ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਸੁਨੇਹਾ ਟਾਈਪ ਕਰੋ।',
  or: 'ଏହି ବ୍ରାଉଜରରେ ଭଏସ୍ ଇନପୁଟ୍ ନାହିଁ। ଦୟାକରି ଆପଣଙ୍କ ସନ୍ଦେଶ ଟାଇପ୍ କରନ୍ତୁ।',
  en: "This browser doesn't support voice input. Please type your message instead.",
};

export function pickMessage<T>(table: Record<string, T>, lang: string): T {
  return table[lang] ?? table.en;
}

/** Convenience wrappers that take the language code and fill in its display name. */
export function sttUnsupportedMessage(lang: string): string {
  return pickMessage(STT_BROWSER_UNSUPPORTED, lang)(getLanguage(lang).native_name);
}

export function ttsUnavailableMessage(lang: string): string {
  return pickMessage(TTS_UNAVAILABLE_MSG, lang)(getLanguage(lang).native_name);
}

/** Keys missing for any supported language — consumed by i18nAudit.ts. */
export function auditVoiceMessages(): string[] {
  const tables: Record<string, Record<string, unknown>> = {
    CLARIFICATIONS,
    CONFIRMATIONS,
    SERVER_WAKING_MSG,
    MIC_PERMISSION_ERROR,
    EMPTY_TRANSCRIPT_MSG,
    STT_BROWSER_UNSUPPORTED,
    TTS_UNAVAILABLE_MSG,
    SPEECH_NOT_SUPPORTED,
  };
  const gaps: string[] = [];
  for (const [name, table] of Object.entries(tables)) {
    for (const code of LANGUAGE_CODES) {
      if (!table[code]) gaps.push(`${name}.${code}`);
    }
  }
  return gaps;
}
