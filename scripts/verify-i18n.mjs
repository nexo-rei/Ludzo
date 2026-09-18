import { SUPPORTED_LANGUAGES, translations, getTranslation, normalizeLanguage, isSupportedLanguage } from "../lib/i18n.ts";

console.log("==========================================================");
console.log("LUDZO I18N VERIFICATION SUITE");
console.log("==========================================================");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

// 1. Check supported languages count
const EXPECTED_LANGUAGES = ["en", "ru", "uk", "es", "pt", "fr", "de", "it", "tr", "hi"];
assert(
  SUPPORTED_LANGUAGES.length === 10,
  `Exactly 10 supported languages configured (found ${SUPPORTED_LANGUAGES.length})`
);

// 2. Check each language code
EXPECTED_LANGUAGES.forEach((code) => {
  const exists = SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
  assert(exists, `Language code '${code}' is in SUPPORTED_LANGUAGES`);
});

// 3. Check translation dictionaries completeness
const enKeys = Object.keys(translations.en ?? {});
assert(enKeys.length > 50, `English dictionary contains comprehensive keys (${enKeys.length} keys)`);

EXPECTED_LANGUAGES.forEach((code) => {
  const dict = translations[code];
  assert(dict !== undefined, `Dictionary for '${code}' exists in translations`);
  
  if (dict) {
    let missingKeys = [];
    enKeys.forEach((key) => {
      if (!dict[key] || typeof dict[key] !== "string" || dict[key].trim().length === 0) {
        missingKeys.push(key);
      }
    });
    assert(
      missingKeys.length === 0,
      `Language '${code}' has all ${enKeys.length} keys translated (missing: ${missingKeys.length})`
    );
  }
});

// 4. Test placeholder variable substitution
const substituted = getTranslation("en", "welcome_user", { name: "Alex" });
assert(
  substituted === "Welcome back, Alex",
  `Variable placeholder substitution works: '${substituted}'`
);

const streakToast = getTranslation("hi", "streak_claimed_toast", { n: 5, amount: 10 });
assert(
  streakToast.includes("5") && streakToast.includes("10"),
  `Multi-variable substitution in Hindi works: '${streakToast}'`
);

// 5. Test language code normalization
assert(normalizeLanguage("pt-BR") === "pt", "Normalizes 'pt-BR' to 'pt'");
assert(normalizeLanguage("en-US") === "en", "Normalizes 'en-US' to 'en'");
assert(normalizeLanguage("ru-RU") === "ru", "Normalizes 'ru-RU' to 'ru'");
assert(normalizeLanguage("invalid-LANG") === "en", "Fallback invalid lang code to 'en'");
assert(isSupportedLanguage("tr"), "'tr' is recognized as a supported language");

console.log("==========================================================");
console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
console.log("==========================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("✨ All i18n checks passed cleanly!");
  process.exit(0);
}
