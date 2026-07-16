import type commonMessages from "../../messages/pl/common.json";
import type navigationMessages from "../../messages/pl/navigation.json";
import type profileMessages from "../../messages/pl/profile.json";
import type authMessages from "../../messages/pl/auth.json";
import type { AppLocale } from "./config";

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: {
      common: typeof commonMessages;
      navigation: typeof navigationMessages;
      profile: typeof profileMessages;
      auth: typeof authMessages;
    };
  }
}
