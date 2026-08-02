// Standalone city data used by the voice pipeline. This module imports NOTHING from
// components so it can be shared by both VoiceSearchBar.tsx and agenticAiService.ts
// without creating a circular import (previously CITY_ALIASES lived in VoiceSearchBar,
// which imports agenticAiService, which imports CITY_ALIASES -> module-init TDZ crash).

export const CITY_ALIASES: Record<string, string> = {
  // Visakhapatnam
  visakhapatnam: 'Visakhapatnam', vizag: 'Visakhapatnam', visakha: 'Visakhapatnam', visag: 'Visakhapatnam', vizakhapatnam: 'Visakhapatnam', vishakhapatnam: 'Visakhapatnam', vishakapatnam: 'Visakhapatnam',
  వైజాగ్: 'Visakhapatnam', విశాఖపట్నం: 'Visakhapatnam', विशाखापट्टनम: 'Visakhapatnam',
  விசாகப்பட்டினம்: 'Visakhapatnam', ವಿಶಾಖಪಟ್ಟಣ: 'Visakhapatnam', വിശാഖപട്ടണം: 'Visakhapatnam',
  વિશાખાપટ્ટનમ: 'Visakhapatnam', విశాఖ: 'Visakhapatnam',

  // Hyderabad
  hyderabad: 'Hyderabad', hyd: 'Hyderabad', హైదరాబాద్: 'Hyderabad', హైదరాబాదు: 'Hyderabad',
  हैदराबाद: 'Hyderabad', ஹைதராபாத்: 'Hyderabad', ಹೈದರಾಬಾದ್: 'Hyderabad', ഹൈദരാബാദ്: 'Hyderabad',
  હૈદરાબાદ: 'Hyderabad', হায়দ্রাবাদ: 'Hyderabad', حیدرآباد: 'Hyderabad',

  // Vijayawada
  vijayawada: 'Vijayawada', vijawada: 'Vijayawada', vja: 'Vijayawada', bezawada: 'Vijayawada', vijaywada: 'Vijayawada',
  విజయవాడ: 'Vijayawada', విజవాడ: 'Vijayawada', బెజవాడ: 'Vijayawada', विजयवाड़ा: 'Vijayawada', विजवाडा: 'Vijayawada', விஜயவாடா: 'Vijayawada',
  ವಿಜಯವಾಡ: 'Vijayawada', വിജയവാഡ: 'Vijayawada', વિજયવાડા: 'Vijayawada',

  // Chennai
  chennai: 'Chennai', madras: 'Chennai', చెన్నై: 'Chennai', మద్రాస్: 'Chennai',
  चेन्नई: 'Chennai', मद्रास: 'Chennai', சென்னை: 'Chennai', மதராஸ்: 'Chennai',
  ಚೆನ್ನೈ: 'Chennai', ചെന്നൈ: 'Chennai', ચેન્નઈ: 'Chennai',

  // Bengaluru
  bengaluru: 'Bengaluru', bangalore: 'Bengaluru', banglore: 'Bengaluru', blr: 'Bengaluru',
  బెంగళూరు: 'Bengaluru', బెంగుళూరు: 'Bengaluru', बेंगलुरु: 'Bengaluru', बैंगलोर: 'Bengaluru',
  பெங்களூரு: 'Bengaluru', ಬೆಂಗಳೂರು: 'Bengaluru', ബംഗളൂരു: 'Bengaluru', બેંગલુરુ: 'Bengaluru',

  // Tirupati
  tirupati: 'Tirupati', తిరుపతి: 'Tirupati', तिरुपति: 'Tirupati', திருப்பதி: 'Tirupati',
  ತಿರುಪತಿ: 'Tirupati', തിരുപ്പതി: 'Tirupati', તિરુપતિ: 'Tirupati',

  // Guntur
  guntur: 'Guntur', గుంటూరు: 'Guntur', गुंटूर: 'Guntur', గుండూర్: 'Guntur',
  ഗുണ്ടൂർ: 'Guntur', ગુંટૂર: 'Guntur',

  // Rajahmundry
  rajahmundry: 'Rajahmundry', rajahmundri: 'Rajahmundry', రాజమండ్రి: 'Rajahmundry',
  राजमुंदरी: 'Rajahmundry', ராஜமுந்திரி: 'Rajahmundry', ರಾಜಮಂಡ್ರಿ: 'Rajahmundry',
  രാജമണ്ഡ്രി: 'Rajahmundry', રાજામુંડરી: 'Rajahmundry',

  // Kakinada
  kakinada: 'Kakinada', కాకినాడ: 'Kakinada', काकीनाडा: 'Kakinada', காక్కిநாடா: 'Kakinada',
  ಕಾಕಿನಾಡ: 'Kakinada', കാക്കിനട: 'Kakinada', કાકીનાડા: 'Kakinada',

  // Nellore
  nellore: 'Nellore', నెల్లూరు: 'Nellore', नेल्लोर: 'Nellore', நெல்லூர்: 'Nellore',
  ನೆಲ್ಲೂರು: 'Nellore', നെല്ലൂർ: 'Nellore', નેલ્લોર: 'Nellore',

  // Kurnool
  kurnool: 'Kurnool', కర్నూలు: 'Kurnool', कुर्नूल: 'Kurnool', கர்நூல்: 'Kurnool',
  ಕರ್ನೂಲು: 'Kurnool', കർണൂൽ: 'Kurnool', કુર્નૂલ: 'Kurnool',

  // Anantapur
  anantapur: 'Anantapur', అనంతపురం: 'Anantapur', अनंतपुर: 'Anantapur', அனந்தபூர்: 'Anantapur',
  ಅನಂತಪುರ: 'Anantapur', അനന്തപൂർ: 'Anantapur', અનંતપુર: 'Anantapur',

  // Warangal
  warangal: 'Warangal', వరంగల్: 'Warangal', वरंगल: 'Warangal', வரங்கல்: 'Warangal',
  ವರಂಗಲ್: 'Warangal', വരംഗൽ: 'Warangal', વરંગલ: 'Warangal',

  // Karimnagar
  karimnagar: 'Karimnagar', కరీంనగర్: 'Karimnagar', करीमनगर: 'Karimnagar',
  కరీంనగర: 'Karimnagar', કરીમનગર: 'Karimnagar',

  // Mumbai
  mumbai: 'Mumbai', bombay: 'Mumbai', ముంబై: 'Mumbai', బొంబాయి: 'Mumbai',
  मुंबई: 'Mumbai', बंबई: 'Mumbai', மும்பை: 'Mumbai', ಮುಂಬೈ: 'Mumbai',
  മുംബൈ: 'Mumbai', മુંબઈ: 'Mumbai',

  // Pune
  pune: 'Pune', పుణే: 'Pune', పూనే: 'Pune', पुणे: 'Pune',
  புனே: 'Pune', పుಣೆ: 'Pune', పునె: 'Pune', పుણે: 'Pune',

  // Delhi
  delhi: 'Delhi', dilli: 'Delhi', ఢిల్లీ: 'Delhi', ఢిల్లి: 'Delhi',
  दिल्ली: 'Delhi', दिल्लि: 'Delhi', டெல்லி: 'Delhi', దెహలి: 'Delhi',
  ഡൽഹി: 'Delhi', દિલ્હી: 'Delhi',

  // Kolkata
  kolkata: 'Kolkata', calcutta: 'Kolkata', కోల్‌కతా: 'Kolkata', కలకత్తా: 'Kolkata',
  कोलकाता: 'Kolkata', कलकत्ता: 'Kolkata', கொல்கத்தா: 'Kolkata',
  കൊൽക്കത്ത: 'Kolkata', કોલકાતા: 'Kolkata',

  // Kochi
  kochi: 'Kochi', cochin: 'Kochi', కొచ్చి: 'Kochi', కోచి: 'Kochi',
  कोच्चि: 'Kochi', कोचीन: 'Kochi', கொச்சி: 'Kochi',
  കൊച്ചി: 'Kochi', കോചീ: 'Kochi',

  // Coimbatore
  coimbatore: 'Coimbatore', కోయంబత్తూర్: 'Coimbatore', कोयंबटूर: 'Coimbatore',
  கோயம்புத்தூர்: 'Coimbatore', ಕೋಯಮತ್ತೂರು: 'Coimbatore', കോയമ്പത്തൂർ: 'Coimbatore',
  કોઈમ્બતૂર: 'Coimbatore',

  // Madurai
  madurai: 'Madurai', మదురై: 'Madurai', मदेरै: 'Madurai', मदुरै: 'Madurai',
  மதுரை: 'Madurai', ಮಧುರೈ: 'Madurai', മധുര: 'Madurai', મદુરાઈ: 'Madurai',

  // Mysuru
  mysuru: 'Mysuru', mysore: 'Mysuru', మైసూరు: 'Mysuru', మైసూర్: 'Mysuru',
  मैसूरु: 'Mysuru', मैसूर: 'Mysuru', மைசூரு: 'Mysuru', ಮೈಸೂರು: 'Mysuru',
  മൈസൂരു: 'Mysuru', മૈસુરુ: 'Mysuru',
};
