// ISSUE 0(e): a language that is missing a translation key or a TTS voice must be
// VISIBLE, not silently degraded to English or to silence. This module walks every
// message table in the app plus the per-language voice capabilities and returns a
// structured report that the voice debug panel renders and that is logged once at
// startup.

import { SUPPORTED_LANGUAGES, LANGUAGE_CODES } from './languages';
import { auditVoiceMessages } from './voiceMessages';
import { auditFilterMessages } from './filterMessages';
import { auditResponseTemplates } from './agenticAiService';
import { auditOtaMessages } from './ota';
import { auditTranslationTable } from '../context/LanguageContext';

export interface LanguageCoverage {
  code: string;
  name: string;
  /** Missing message keys for this language, across every table. */
  missingKeys: string[];
  /** How a spoken reply is delivered for this language. */
  ttsPath: 'browser-or-edge-tts' | 'text-only';
  /** How speech is transcribed for this language. */
  sttPath: 'browser-then-server' | 'server-only';
}

export interface I18nReport {
  languages: LanguageCoverage[];
  /** Every gap found, flattened — empty means full coverage. */
  allGaps: string[];
  ttsGapLanguages: string[];
  sttGapLanguages: string[];
}

export function runI18nAudit(): I18nReport {
  const gaps = [
    ...auditVoiceMessages(),
    ...auditFilterMessages(),
    ...auditResponseTemplates(),
    ...auditOtaMessages(),
    ...auditTranslationTable(),
  ];

  const languages: LanguageCoverage[] = SUPPORTED_LANGUAGES.map((lang) => ({
    code: lang.code,
    name: lang.name,
    missingKeys: gaps.filter((g) => g.endsWith(`.${lang.code}`) || g.includes(`.${lang.code}.`)),
    ttsPath: lang.backend_tts ? 'browser-or-edge-tts' : 'text-only',
    sttPath: lang.browser_stt ? 'browser-then-server' : 'server-only',
  }));

  return {
    languages,
    allGaps: gaps,
    ttsGapLanguages: SUPPORTED_LANGUAGES.filter((l) => !l.backend_tts).map((l) => l.code),
    sttGapLanguages: SUPPORTED_LANGUAGES.filter((l) => !l.browser_stt).map((l) => l.code),
  };
}

let logged = false;

/** Logs the audit once per session so gaps show up in the console during QA. */
export function logI18nAuditOnce(): I18nReport {
  const report = runI18nAudit();
  if (!logged) {
    logged = true;
    if (report.allGaps.length > 0) {
      console.warn(
        `[i18n audit] ${report.allGaps.length} missing message key(s) across ${LANGUAGE_CODES.length} languages:`,
        report.allGaps
      );
    } else {
      console.info(`[i18n audit] All ${LANGUAGE_CODES.length} supported languages have complete message coverage.`);
    }
    if (report.ttsGapLanguages.length) {
      console.info(
        `[i18n audit] No production TTS voice for: ${report.ttsGapLanguages.join(', ')} — replies are shown as text with an explanation.`
      );
    }
    if (report.sttGapLanguages.length) {
      console.info(
        `[i18n audit] No browser speech recognition for: ${report.sttGapLanguages.join(', ')} — audio is sent to backend Whisper instead.`
      );
    }
  }
  return report;
}
