// City alias table used by the voice/chat NLU. Imports nothing from components so it
// can be shared by VoiceSearchBar.tsx and agenticAiService.ts without a circular
// import (previously CITY_ALIASES lived in VoiceSearchBar, which imports
// agenticAiService, which imports CITY_ALIASES -> module-init TDZ crash).
//
// ISSUE 2: aliases are now built from three layers instead of one hand-written list,
// so code-mixed and non-Telugu native input resolves too:
//   1. every endonym in CITY_TRANSLATIONS (all 12 scripts x 22 cities, automatic),
//   2. the canonical English name and its lowercase slug,
//   3. hand-written romanized spellings, short forms and common STT misspellings.

import { CITIES, CITY_TRANSLATIONS } from './cityData';

// Layer 3 — romanized spellings, airport-style short codes and the misspellings
// speech-to-text engines actually produce for these cities.
const ROMANIZED_ALIASES: Record<string, string> = {
  // Visakhapatnam
  visakhapatnam: 'Visakhapatnam', vizag: 'Visakhapatnam', vizhag: 'Visakhapatnam',
  visakha: 'Visakhapatnam', visag: 'Visakhapatnam', vizakhapatnam: 'Visakhapatnam',
  vishakhapatnam: 'Visakhapatnam', vishakapatnam: 'Visakhapatnam', vskp: 'Visakhapatnam',
  waltair: 'Visakhapatnam',

  // Hyderabad
  hyderabad: 'Hyderabad', hyd: 'Hyderabad', hydrabad: 'Hyderabad', haiderabad: 'Hyderabad',
  bhagyanagar: 'Hyderabad', secunderabad: 'Hyderabad',

  // Vijayawada
  vijayawada: 'Vijayawada', vijawada: 'Vijayawada', vijaywada: 'Vijayawada',
  vja: 'Vijayawada', bza: 'Vijayawada', bezawada: 'Vijayawada',

  // Chennai
  chennai: 'Chennai', chennaii: 'Chennai', madras: 'Chennai', maas: 'Chennai',

  // Bengaluru
  bengaluru: 'Bengaluru', bangalore: 'Bengaluru', banglore: 'Bengaluru',
  bengalore: 'Bengaluru', banglur: 'Bengaluru', bengluru: 'Bengaluru', blr: 'Bengaluru',

  // Tirupati
  tirupati: 'Tirupati', tirupathi: 'Tirupati', thirupathi: 'Tirupati', tirumala: 'Tirupati',

  // Guntur
  guntur: 'Guntur', gunturu: 'Guntur', gunter: 'Guntur',

  // Rajahmundry
  rajahmundry: 'Rajahmundry', rajahmundri: 'Rajahmundry', rajamundry: 'Rajahmundry',
  rajamahendravaram: 'Rajahmundry', rjy: 'Rajahmundry',

  // Kakinada
  kakinada: 'Kakinada', kakinadaa: 'Kakinada', cocanada: 'Kakinada',

  // Nellore
  nellore: 'Nellore', nelluru: 'Nellore',

  // Kurnool
  kurnool: 'Kurnool', karnool: 'Kurnool', kurnul: 'Kurnool',

  // Anantapur
  anantapur: 'Anantapur', ananthapur: 'Anantapur', ananthapuram: 'Anantapur', atp: 'Anantapur',

  // Warangal
  warangal: 'Warangal', varangal: 'Warangal', orugallu: 'Warangal',

  // Karimnagar
  karimnagar: 'Karimnagar', kareemnagar: 'Karimnagar',

  // Mumbai
  mumbai: 'Mumbai', bombay: 'Mumbai', bom: 'Mumbai',

  // Pune
  pune: 'Pune', poona: 'Pune',

  // Delhi
  delhi: 'Delhi', dilli: 'Delhi', newdelhi: 'Delhi', del: 'Delhi',

  // Kolkata
  kolkata: 'Kolkata', calcutta: 'Kolkata', ccu: 'Kolkata',

  // Kochi
  kochi: 'Kochi', cochin: 'Kochi', kochin: 'Kochi', ernakulam: 'Kochi',

  // Coimbatore
  coimbatore: 'Coimbatore', kovai: 'Coimbatore', cbe: 'Coimbatore',

  // Madurai
  madurai: 'Madurai', madura: 'Madurai',

  // Mysuru
  mysuru: 'Mysuru', mysore: 'Mysuru',
};

// Layer 4 — colloquial names in native scripts that are NOT the formal endonym in
// CITY_TRANSLATIONS ("వైజాగ్" for Visakhapatnam, "बैंगलोर" for Bengaluru, "బెజవాడ" for
// Vijayawada). People say these far more often than the formal name.
const NATIVE_COLLOQUIAL_ALIASES: Record<string, string> = {
  // Visakhapatnam
  వైజాగ్: 'Visakhapatnam', విశాఖ: 'Visakhapatnam', వైజాగ: 'Visakhapatnam',
  // Hyderabad
  హైదరాబాదు: 'Hyderabad', భాగ్యనగరం: 'Hyderabad', सिकंदराबाद: 'Hyderabad',
  // Vijayawada
  బెజవాడ: 'Vijayawada', విజవాడ: 'Vijayawada', बेजवाड़ा: 'Vijayawada',
  // Chennai
  మద్రాస్: 'Chennai', मद्रास: 'Chennai', மதராஸ்: 'Chennai',
  // Bengaluru
  బెంగుళూరు: 'Bengaluru', बैंगलोर: 'Bengaluru', ಬೆಂಗಳೂರ: 'Bengaluru',
  // Mumbai
  బొంబాయి: 'Mumbai', बंबई: 'Mumbai',
  // Kolkata
  కలకత్తా: 'Kolkata', कलकत्ता: 'Kolkata',
  // Kochi
  కోచి: 'Kochi', कोचीन: 'Kochi',
  // Delhi
  ఢిల్లి: 'Delhi', 'नई दिल्ली': 'Delhi',
  // Mysuru
  మైసూర్: 'Mysuru', मैसूर: 'Mysuru',
  // Pune
  పూనే: 'Pune',
  // Tirupati
  తిరుమల: 'Tirupati',
  // Rajahmundry
  రాజమహేంద్రవరం: 'Rajahmundry',
  // Warangal
  ఓరుగల్లు: 'Warangal',
};

function buildAliases(): Record<string, string> {
  const table: Record<string, string> = {};

  // Layer 1 — every endonym we already ship for the UI becomes a voice alias.
  for (const [canonical, byLang] of Object.entries(CITY_TRANSLATIONS)) {
    for (const native of Object.values(byLang)) {
      if (native) table[native.normalize('NFC').toLowerCase()] = canonical;
    }
  }

  // Layer 2 — canonical English names.
  for (const city of CITIES) {
    table[city.toLowerCase()] = city;
  }

  // Layer 3 — colloquial native names that are not the formal endonym.
  for (const [alias, canonical] of Object.entries(NATIVE_COLLOQUIAL_ALIASES)) {
    table[alias.normalize('NFC').toLowerCase()] = canonical;
  }

  // Layer 4 — romanized/short/misspelled forms (highest priority, written last).
  for (const [alias, canonical] of Object.entries(ROMANIZED_ALIASES)) {
    table[alias] = canonical;
  }

  return table;
}

export const CITY_ALIASES: Record<string, string> = buildAliases();
