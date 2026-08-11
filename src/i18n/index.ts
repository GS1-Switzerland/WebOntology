import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/config/env";

/**
 * i18n is wired up from day one even though English is the only shipped
 * locale, per the brief ("prepare everything so this can be efficiently
 * translated later"). Every user-facing string in the app goes through
 * useTranslation()/<Trans> — never hard-coded JSX text — so adding a
 * locale later is purely a matter of dropping a new namespace file under
 * src/i18n/locales/<lng>/ and adding the code to SUPPORTED_LANGUAGES.
 *
 * Namespaces mirror the domain of the string, not the page, so strings
 * are reused across the sector/domain/term views rather than duplicated:
 *  - common:    chrome, navigation, actions
 *  - sectors:   GS1 Section A–U labels
 *  - registry:  vocab/ontology/artifact domain terminology
 *  - errors:    fetch/negotiation/not-found messaging
 */
void i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    ns: ["common", "sectors", "registry", "errors"],
    defaultNS: "common",
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    interpolation: { escapeValue: false },
    detection: {
      order: ["querystring", "navigator", "htmlTag"],
      caches: [],
    },
    returnEmptyString: false,
  });

export default i18n;
