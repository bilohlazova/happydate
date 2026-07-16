import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createTranslator,
  NextIntlClientProvider,
  useLocale,
  useTranslations,
} from "next-intl";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  normalizeLocale,
  resolveRequestLocale,
} from "../src/i18n/config.ts";
import { getDateFnsLocale } from "../src/i18n/dateLocales.ts";

const root = process.cwd();

async function readCommonMessages(locale) {
  const content = await readFile(
    path.join(root, "messages", locale, "common.json"),
    "utf8",
  );
  return JSON.parse(content);
}

async function readNamespaceMessages(locale, namespace) {
  const content = await readFile(
    path.join(root, "messages", locale, `${namespace}.json`),
    "utf8",
  );
  return JSON.parse(content);
}

function keyPaths(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const pathKey = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? keyPaths(child, pathKey)
      : [pathKey];
  });
}

test("supported locales and default locale are exact", () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["pl", "uk", "en", "ru", "de"]);
  assert.equal(DEFAULT_LOCALE, "pl");
  assert.equal(LOCALE_COOKIE_NAME, "happydate_locale");
  assert.equal(isSupportedLocale("de"), true);
  assert.equal(isSupportedLocale("fr"), false);
});

test("regional and underscore locale values normalize", () => {
  const examples = {
    "pl-PL": "pl",
    "uk-UA": "uk",
    "en-US": "en",
    "ru-RU": "ru",
    "de-DE": "de",
    en_US: "en",
  };
  for (const [input, expected] of Object.entries(examples)) {
    assert.equal(normalizeLocale(input), expected);
  }
  assert.equal(normalizeLocale("fr-FR"), null);
  assert.equal(normalizeLocale(null), null);
});

test("valid cookie locale overrides browser language", () => {
  assert.equal(resolveRequestLocale("uk", "de-DE,de;q=0.9"), "uk");
});

test("invalid cookie uses highest-quality supported browser language", () => {
  assert.equal(
    resolveRequestLocale("unsupported", "fr-FR;q=1,ru-RU;q=0.8,en;q=0.7"),
    "ru",
  );
});

test("unsupported locale values fall back to Polish", () => {
  assert.equal(resolveRequestLocale("fr", "es-MX,fr;q=0.9"), "pl");
  assert.equal(resolveRequestLocale(undefined, undefined), "pl");
});

test("every supported locale has exactly the Polish common key structure", async () => {
  const directoryLocales = (await readdir(path.join(root, "messages"))).sort();
  assert.deepEqual(directoryLocales, [...SUPPORTED_LOCALES].sort());

  const polishKeys = keyPaths(await readCommonMessages("pl")).sort();
  for (const locale of SUPPORTED_LOCALES) {
    const localeKeys = keyPaths(await readCommonMessages(locale)).sort();
    assert.deepEqual(localeKeys, polishKeys, `${locale} dictionary keys differ`);
  }
});

test("every namespace has exact key parity across all locales", async () => {
  const namespaces = ["common", "navigation", "profile", "auth"];
  for (const namespace of namespaces) {
    const polishKeys = keyPaths(
      await readNamespaceMessages("pl", namespace),
    ).sort();
    for (const locale of SUPPORTED_LOCALES) {
      const localeKeys = keyPaths(
        await readNamespaceMessages(locale, namespace),
      ).sort();
      assert.deepEqual(
        localeKeys,
        polishKeys,
        `${locale}/${namespace}.json dictionary keys differ`,
      );
    }
  }
});

test("all common dictionaries contain non-empty strings", async () => {
  for (const locale of SUPPORTED_LOCALES) {
    const messages = await readCommonMessages(locale);
    for (const key of keyPaths(messages)) {
      const value = key.split(".").reduce((current, part) => current[part], messages);
      assert.equal(typeof value, "string");
      assert.notEqual(value.trim(), "");
    }
  }
});

test("all navigation dictionaries contain non-empty strings", async () => {
  for (const locale of SUPPORTED_LOCALES) {
    const messages = await readNamespaceMessages(locale, "navigation");
    for (const key of keyPaths(messages)) {
      const value = key.split(".").reduce((current, part) => current[part], messages);
      assert.equal(typeof value, "string");
      assert.notEqual(value.trim(), "");
    }
  }
});

test("date-fns locale map covers every application locale", () => {
  const expectedCodes = {
    pl: "pl",
    uk: "uk",
    en: "en-US",
    ru: "ru",
    de: "de",
  };
  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(getDateFnsLocale(locale).code, expectedCodes[locale]);
  }
});

test("next-intl server translator resolves the selected dictionary", async () => {
  const messages = { common: await readCommonMessages("uk") };
  const translate = createTranslator({ locale: "uk", messages });
  assert.equal(translate("common.actions.save"), "Зберегти");
});

test("next-intl client hooks receive messages and current locale", async () => {
  const messages = { common: await readCommonMessages("de") };

  function ClientProbe() {
    const translate = useTranslations("common");
    const locale = useLocale();
    return createElement(
      "span",
      { "data-locale": locale },
      translate("actions.save"),
    );
  }

  const html = renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale: "de", messages, timeZone: "UTC" },
      createElement(ClientProbe),
    ),
  );

  assert.match(html, /data-locale="de"/);
  assert.match(html, /Speichern/);
});
