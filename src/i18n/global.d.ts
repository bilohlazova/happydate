import type commonMessages from "../../messages/pl/common.json";
import type navigationMessages from "../../messages/pl/navigation.json";
import type profileMessages from "../../messages/pl/profile.json";
import type authMessages from "../../messages/pl/auth.json";
import type peopleMessages from "../../messages/pl/people.json";
import type personMessages from "../../messages/pl/person.json";
import type personFormMessages from "../../messages/pl/personForm.json";
import type notesMessages from "../../messages/pl/notes.json";
import type remindersMessages from "../../messages/pl/reminders.json";
import type homeMessages from "../../messages/pl/home.json";
import type assistantMessages from "../../messages/pl/assistant.json";
import type giftMessages from "../../messages/pl/gift.json";
import type dashboardMessages from "../../messages/pl/dashboard.json";
import type careMessages from "../../messages/pl/care.json";
import type staticMessages from "../../messages/pl/static.json";
import type { AppLocale } from "./config";

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: {
      common: typeof commonMessages;
      navigation: typeof navigationMessages;
      profile: typeof profileMessages;
      auth: typeof authMessages;
      people: typeof peopleMessages;
      person: typeof personMessages;
      personForm: typeof personFormMessages;
      notes: typeof notesMessages;
      reminders: typeof remindersMessages;
      home: typeof homeMessages;
      assistant: typeof assistantMessages;
      gift: typeof giftMessages;
      dashboard: typeof dashboardMessages;
      care: typeof careMessages;
      static: typeof staticMessages;
    };
  }
}
