ALTER TABLE public.memories
ADD CONSTRAINT memories_person_id_fkey
FOREIGN KEY (person_id)
REFERENCES public.people(id)
ON DELETE SET NULL;

ALTER TABLE public.memories
ADD CONSTRAINT memories_event_id_fkey
FOREIGN KEY (event_id)
REFERENCES public.events(id)
ON DELETE SET NULL;;
