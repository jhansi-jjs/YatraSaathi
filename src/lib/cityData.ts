// Canonical city dataset. Lives in lib/ (not in a component) so the whole NLU layer
// — language detection, city extraction, filter extraction — has zero React imports
// and can be exercised directly by the parser test harness.
//
// CITIES is the dropdown dataset; CITY_TRANSLATIONS carries each city's endonym in
// every supported language. cities.ts derives its native-script alias table from
// CITY_TRANSLATIONS, so adding a city here automatically makes it recognisable by
// voice in all 12 languages (ISSUE 2 — previously only te/hi/ta/kn/ml/gu had
// hand-written aliases, which is why Bengali/Punjabi/Odia/Urdu/Marathi speech never
// matched a city).

export const CITIES = [
  'Visakhapatnam',
  'Hyderabad',
  'Vijayawada',
  'Chennai',
  'Bengaluru',
  'Tirupati',
  'Guntur',
  'Rajahmundry',
  'Kakinada',
  'Nellore',
  'Kurnool',
  'Anantapur',
  'Warangal',
  'Karimnagar',
  'Mumbai',
  'Pune',
  'Delhi',
  'Kolkata',
  'Kochi',
  'Coimbatore',
  'Madurai',
  'Mysuru',
];

export const CITY_TRANSLATIONS: Record<string, Record<string, string>> = {
  Visakhapatnam: {
    te: 'విశాఖపట్నం', hi: 'विशाखापट्टनम', ta: 'விசாகப்பட்டினம்', kn: 'ವಿಶಾಖಪಟ್ಟಣ',
    ml: 'വിശാഖപട്ടണം', mr: 'विशाखापट्टणम', gu: 'વિશાખાપટ્ટનમ', bn: 'বিশাখাপত্তনম',
    ur: 'وشاکھا پٹنم', pa: 'ਵਿਸ਼ਾਖਾਪਟਨਮ', or: 'ବିଶାଖାପାଟଣା', en: 'Visakhapatnam'
  },
  Hyderabad: {
    te: 'హైదరాబాద్', hi: 'हैदराबाद', ta: 'ஹைதராபாத்', kn: 'ಹೈದರಾಬಾದ್',
    ml: 'ഹൈദരാബാദ്', mr: 'हैदराबाद', gu: 'હૈદરાબાદ', bn: 'হায়দ্রাবাদ',
    ur: 'حیدرآباد', pa: 'ਹੈਦਰਾਬਾਦ', or: 'ହାଇଦ୍ରାବାଦ', en: 'Hyderabad'
  },
  Vijayawada: {
    te: 'విజయవాడ', hi: 'विजयवाड़ा', ta: 'விஜயவாடா', kn: 'ವಿಜಯವಾಡ',
    ml: 'വിജയവാഡ', mr: 'विजयवाडा', gu: 'વિજયવાડા', bn: 'বিজয়ওয়াড়া',
    ur: 'وجئےواڑہ', pa: 'ਵਿਜੇਵਾੜਾ', or: 'ବିଜୟୱାଡ଼ା', en: 'Vijayawada'
  },
  Chennai: {
    te: 'చెన్నై', hi: 'चेन्नई', ta: 'சென்னை', kn: 'ಚೆನ್ನೈ',
    ml: 'ചെന്നൈ', mr: 'चेन्नई', gu: 'ચેન્નઈ', bn: 'চেন্নাই',
    ur: 'چنئی', pa: 'ਚੇਨਈ', or: 'ଚେନ୍ନାଇ', en: 'Chennai'
  },
  Bengaluru: {
    te: 'బెంగళూరు', hi: 'बेंगलुरु', ta: 'பெங்களூரு', kn: 'ಬೆಂಗಳೂರು',
    ml: 'ബംഗളൂരു', mr: 'बेंगळुरू', gu: 'બેંગલુરુ', bn: 'বেঙ্গালুরু',
    ur: 'بنگلورو', pa: 'ਬੈਂਗਲੁਰੂ', or: 'ବେଙ୍ଗାଲୁରୁ', en: 'Bengaluru'
  },
  Tirupati: {
    te: 'తిరుపతి', hi: 'तिरुपति', ta: 'திருப்பதி', kn: 'ತಿರುಪತಿ',
    ml: 'തിരുപ്പതി', mr: 'तिरुपती', gu: 'તિરુપતિ', bn: 'তিরুপতি',
    ur: 'تیروپتی', pa: 'ਤਿਰੁਪਤੀ', or: 'ତିରୁପତି', en: 'Tirupati'
  },
  Guntur: {
    te: 'గుంటూరు', hi: 'गुंटूर', ta: 'குண்டூர்', kn: 'ಗುಂಟೂರು',
    ml: 'ഗുണ്ടൂർ', mr: 'गुंटूर', gu: 'ગુંટૂર', bn: 'গুন্টুর',
    ur: 'گنٹور', pa: 'ਗੁੰਟੂਰ', or: 'ଗୁଣ୍ଟୁର', en: 'Guntur'
  },
  Rajahmundry: {
    te: 'రాజమండ్రి', hi: 'राजमुंदरी', ta: 'ராஜமுந்திரி', kn: 'ರಾಜಮಂಡ್ರಿ',
    ml: 'രാജമണ്ഡ്രി', mr: 'राजमुंद्री', gu: 'રાજામુંડરી', bn: 'রাজামুন্দ্রি',
    ur: 'راجمندری', pa: 'ਰਾਜਮੁੰਦਰੀ', or: 'ରାଜମୁନ୍ଦ୍ରୀ', en: 'Rajahmundry'
  },
  Kakinada: {
    te: 'కాకినాడ', hi: 'काकीनाडा', ta: 'காக்கிநாடா', kn: 'ಕಾಕಿನಾಡ',
    ml: 'കാക്കിനട', mr: 'काकीनाडा', gu: 'કાકીનાડા', bn: 'কাকিনাডা',
    ur: 'کاکیناڈا', pa: 'ਕਾਕੀਨਾਡਾ', or: 'କାକିନାଡ଼ା', en: 'Kakinada'
  },
  Nellore: {
    te: 'నెల్లూరు', hi: 'नेल्लोर', ta: 'நெல்லூர்', kn: 'ನೆಲ್ಲೂರು',
    ml: 'നെല്ലൂർ', mr: 'नेल्लोर', gu: 'નેલ્લોર', bn: 'নেলোর',
    ur: 'نیلور', pa: 'ਨੇਲੋਰ', or: 'ନେଲୋର', en: 'Nellore'
  },
  Kurnool: {
    te: 'కర్నూలు', hi: 'कुर्नूल', ta: 'கர்நூல்', kn: 'ಕರ್ನೂಲು',
    ml: 'കർണൂൽ', mr: 'कुर्नूल', gu: 'કુર્નૂલ', bn: 'কুরনুল',
    ur: 'کرنول', pa: 'ਕਰਨੂਲ', or: 'କର୍ନୁଲ', en: 'Kurnool'
  },
  Anantapur: {
    te: 'అనంతపురం', hi: 'अनंतपुर', ta: 'அனந்தபூர்', kn: 'ಅನಂತಪುರ',
    ml: 'അനന്തപൂർ', mr: 'अनंतपूर', gu: 'અનંતપુર', bn: 'অনন্তপুর',
    ur: 'اننت پور', pa: 'ਅਨੰਤਪੁਰ', or: 'ଅନନ୍ତପୁର', en: 'Anantapur'
  },
  Warangal: {
    te: 'వరంగల్', hi: 'वरंगल', ta: 'வரங்கல்', kn: 'ವರಂಗಲ್',
    ml: 'വരംഗൽ', mr: 'वरंगल', gu: 'વરંગલ', bn: 'ওয়ারঙ্গল',
    ur: 'وارنگل', pa: 'ਵਰੰਗਲ', or: 'ୱାରଙ୍ଗଲ', en: 'Warangal'
  },
  Karimnagar: {
    te: 'కరీంనగర్', hi: 'करीमनगर', ta: 'கரீம்நகர்', kn: 'ಕರೀಂನಗರ',
    ml: 'കരീംനഗർ', mr: 'करीमनगर', gu: 'કરીમનગર', bn: 'করিমনগর',
    ur: 'کریم نگر', pa: 'ਕਰੀਮਨਗਰ', or: 'କରିମନଗର', en: 'Karimnagar'
  },
  Mumbai: {
    te: 'ముంబై', hi: 'मुंबई', ta: 'மும்பை', kn: 'ಮುಂಬೈ',
    ml: 'മുംബൈ', mr: 'मुंबई', gu: 'મુંબઈ', bn: 'মুম্বাই',
    ur: 'ممبئی', pa: 'ਮੁੰਬਈ', or: 'ମୁମ୍ବାଇ', en: 'Mumbai'
  },
  Pune: {
    te: 'పుణే', hi: 'पुणे', ta: 'புனே', kn: 'ಪುಣೆ',
    ml: 'പുനെ', mr: 'पुणे', gu: 'પુણે', bn: 'পুনে',
    ur: 'پونے', pa: 'ਪੁਣੇ', or: 'ପୁଣେ', en: 'Pune'
  },
  Delhi: {
    te: 'ఢిల్లీ', hi: 'दिल्ली', ta: 'டெல்லி', kn: 'ದೆಹಲಿ',
    ml: 'ഡൽഹി', mr: 'दिल्ली', gu: 'દિલ્હી', bn: 'দিল্লি',
    ur: 'دہلی', pa: 'ਦਿੱਲੀ', or: 'ଦିଲ୍ଲୀ', en: 'Delhi'
  },
  Kolkata: {
    te: 'కోల్‌కతా', hi: 'कोलकाता', ta: 'கொல்கத்தா', kn: 'ಕೋಲ್ಕತ್ತಾ',
    ml: 'കൊൽക്കത്ത', mr: 'कोलकाता', gu: 'કોલકાતા', bn: 'কলকাতা',
    ur: 'کولکتہ', pa: 'ਕੋਲਕਾਤਾ', or: 'କୋଲକାତା', en: 'Kolkata'
  },
  Kochi: {
    te: 'కొచ్చి', hi: 'कोच्चि', ta: 'கொச்சி', kn: 'ಕೊಚ್ಚಿ',
    ml: 'കൊച്ചി', mr: 'कोच्ची', gu: 'કોચી', bn: 'কোচি',
    ur: 'کوچی', pa: 'ਕੋਚੀ', or: 'କୋଚି', en: 'Kochi'
  },
  Coimbatore: {
    te: 'కోయంబత్తూర్', hi: 'कोयंबटूर', ta: 'கோயம்புத்தூர்', kn: 'ಕೊಯಮತ್ತೂರು',
    ml: 'കോയമ്പത്തൂർ', mr: 'कोइम्बतूर', gu: 'કોઈમ્બતૂર', bn: 'কোয়েম্বাটুর',
    ur: 'کوئمبتور', pa: 'ਕੋਇੰਬਟੂਰ', or: 'କୋଏମ୍ବାଟୋର', en: 'Coimbatore'
  },
  Madurai: {
    te: 'మదురై', hi: 'मदुरै', ta: 'மதுரை', kn: 'ಮಧುರೈ',
    ml: 'മധുര', mr: 'मदुराई', gu: 'મદુરાઈ', bn: 'মাদুরাই',
    ur: 'مدورائی', pa: 'ਮਦੁਰਾਈ', or: 'ମଦୁରାଇ', en: 'Madurai'
  },
  Mysuru: {
    te: 'మైసూరు', hi: 'मैसूरु', ta: 'மைசூரு', kn: 'ಮೈಸೂರು',
    ml: 'മൈസൂരു', mr: 'मैसूरू', gu: 'મૈસુરુ', bn: 'মহীশূর',
    ur: 'میسورو', pa: 'ਮੈਸੂਰੂ', or: 'ମୈସୁରୁ', en: 'Mysuru'
  },
};
