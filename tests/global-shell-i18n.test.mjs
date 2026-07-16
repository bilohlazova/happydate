import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

import { resolveRequestLocale } from "../src/i18n/config.ts";
import {
  BOTTOM_NAV_ITEMS,
  FOOTER_LINKS,
  HEADER_NAV_ITEMS,
} from "../src/i18n/shellNavigation.ts";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];

async function messages(locale) {
  const content = await readFile(
    path.join(root, "messages", locale, "navigation.json"),
    "utf8",
  );
  return { navigation: JSON.parse(content) };
}

async function translator(locale) {
  return createTranslator({ locale, messages: await messages(locale) });
}

const expectedHeaders = {
  pl: ["Usługi", "Opinie", "O nas", "Zaloguj się", "Wyloguj"],
  uk: ["Послуги", "Відгуки", "Про нас", "Увійти", "Вийти"],
  en: ["Services", "Reviews", "About us", "Log in", "Log out"],
  ru: ["Услуги", "Отзывы", "О нас", "Войти", "Выйти"],
  de: ["Angebote", "Bewertungen", "Über uns", "Anmelden", "Abmelden"],
};

for (const locale of locales) {
  test(`${locale} Header labels are localized`, async () => {
    const translate = await translator(locale);
    assert.deepEqual(
      [
        translate("navigation.header.services"),
        translate("navigation.header.reviews"),
        translate("navigation.header.about"),
        translate("navigation.header.login"),
        translate("navigation.header.logout"),
      ],
      expectedHeaders[locale],
    );
  });
}

test("bottom navigation labels exist for all routes and locales", async () => {
  for (const locale of locales) {
    const translate = await translator(locale);
    for (const item of BOTTOM_NAV_ITEMS) {
      assert.notEqual(translate(`navigation.bottom.${item.labelKey}`).trim(), "");
    }
  }
});

test("footer labels exist for every rendered link and locale", async () => {
  for (const locale of locales) {
    const translate = await translator(locale);
    for (const item of FOOTER_LINKS) {
      assert.notEqual(translate(`navigation.footer.${item.labelKey}`).trim(), "");
    }
  }
});

test("cookie banner labels have parity across locales", async () => {
  const required = [
    "title",
    "description",
    "privacyLink",
    "accept",
    "reject",
    "settings",
    "bannerLabel",
  ];
  for (const locale of locales) {
    const translate = await translator(locale);
    for (const key of required) {
      assert.notEqual(translate(`navigation.cookie.${key}`).trim(), "");
    }
  }
});

test("shell accessibility labels exist in every locale", async () => {
  const required = [
    "navigation.header.openMenu",
    "navigation.header.closeMenu",
    "navigation.header.navigationLabel",
    "navigation.bottom.navigationLabel",
    "navigation.footer.navigationLabel",
    "navigation.cookie.bannerLabel",
  ];
  for (const locale of locales) {
    const translate = await translator(locale);
    for (const key of required) assert.notEqual(translate(key).trim(), "");
  }
});

test("global shell routes are locale-independent and have no locale prefix", () => {
  const routes = [
    ...HEADER_NAV_ITEMS,
    ...BOTTOM_NAV_ITEMS,
    ...FOOTER_LINKS,
  ].map((item) => item.href);
  assert.deepEqual(routes, [
    "/services",
    "/reviews",
    "/about",
    "/",
    "/people",
    "/notes",
    "/dashboard",
    "/profile",
    "/regulamin",
    "/privacy",
    "/regulamin-zwrotow",
  ]);
  assert.equal(routes.some((route) => /^\/(pl|uk|en|ru|de)(\/|$)/.test(route)), false);
});

test("invalid locale still resolves to Polish", () => {
  assert.equal(resolveRequestLocale("invalid", "fr-FR"), "pl");
});

test("non-Polish shell dictionaries do not accidentally copy Polish copy", async () => {
  const polish = (await messages("pl")).navigation;
  const allowedIdenticalPaths = new Set([
    "header.profile",
    "bottom.profile",
    "footer.contact",
    "footer.copyright",
  ]);
  const allowedIdenticalLocalePaths = new Set([
    "de:header.account",
    "de:bottom.home",
  ]);

  function leaves(value, prefix = "") {
    return Object.entries(value).flatMap(([key, child]) => {
      const next = prefix ? `${prefix}.${key}` : key;
      return child && typeof child === "object"
        ? leaves(child, next)
        : [[next, child]];
    });
  }

  const polishValues = new Map(leaves(polish));
  for (const locale of ["uk", "en", "ru", "de"]) {
    const localized = (await messages(locale)).navigation;
    for (const [key, value] of leaves(localized)) {
      if (
        allowedIdenticalPaths.has(key) ||
        allowedIdenticalLocalePaths.has(`${locale}:${key}`)
      ) {
        continue;
      }
      assert.notEqual(value, polishValues.get(key), `${locale}:${key} copied Polish`);
    }
  }
});
