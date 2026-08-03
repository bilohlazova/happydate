ALTER TABLE public.people
  ADD COLUMN avatar_url     text,
  ADD COLUMN avatar_type    text        NOT NULL DEFAULT 'initials',
  ADD COLUMN favorite       boolean     NOT NULL DEFAULT false,
  ADD COLUMN archived       boolean     NOT NULL DEFAULT false,
  ADD COLUMN color_token    text,
  ADD COLUMN contact_source text        NOT NULL DEFAULT 'manual',
  ADD COLUMN sort_order     integer     NOT NULL DEFAULT 0;

ALTER TABLE public.people
  ADD CONSTRAINT people_avatar_type_check
    CHECK (avatar_type IN ('initials', 'photo', 'ai', 'emoji')),
  ADD CONSTRAINT people_contact_source_check
    CHECK (contact_source IN ('manual', 'contacts', 'qr', 'link', 'invite'));

COMMENT ON COLUMN public.people.avatar_url IS 'URL ресурсу аватара (фото/AI-зображення), якщо avatar_type цього потребує';
COMMENT ON COLUMN public.people.avatar_type IS 'Що показувати як аватар: initials, photo, ai, emoji';
COMMENT ON COLUMN public.people.color_token IS 'Токен кольору картки/аватара (напр. blue, pink, purple) — мапиться на Tailwind-палітру, не HEX';
COMMENT ON COLUMN public.people.contact_source IS 'Як особу додано: manual, contacts (імпорт з телефонної книги), qr, link, invite (людина приєдналась сама)';
COMMENT ON COLUMN public.people.sort_order IS 'Порядок відображення у списку користувача (drag-and-drop / закріплення), нижче = вище у списку';

CREATE INDEX idx_people_user_favorite
  ON public.people (user_id)
  WHERE favorite = true;

CREATE INDEX idx_people_user_active
  ON public.people (user_id)
  WHERE archived = false;;
