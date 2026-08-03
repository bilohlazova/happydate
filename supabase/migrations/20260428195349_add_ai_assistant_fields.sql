
-- Додаємо is_important до events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_important boolean DEFAULT false;

-- Додаємо person_id та person_name до events (зв'язок з people)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES people(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS person_name text;

-- Індекс для швидкої вибірки подій по даті
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_events_important ON events(user_id, is_important, date);
;
