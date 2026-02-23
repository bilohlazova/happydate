"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";

type Person = {
  id: string;
  name: string;
  relation: string;
};

type Note = {
  id: string;
  content: string;
  created_at: string;
  person_id: string | null;
  event_id: string | null;
};

type AiIdea = {
  title: string;
  explanation: string;
  why: string;
  price_range: string;
};

export default function NotesPage() {
  const searchParams = useSearchParams();

  const [notes, setNotes] = useState<Note[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const [noteText, setNoteText] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [filterPersonId, setFilterPersonId] = useState<string | "all">("all");

  const [isNoteOpen, setIsNoteOpen] = useState(false);

  const [aiIdeas, setAiIdeas] = useState<AiIdea[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const eventId = searchParams.get("eventId");
    setSelectedEventId(eventId);
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, []);

  const loadPeople = useCallback(async () => {
    const { data, error } = await supabase
      .from("people")
      .select("id, name, relation")
      .order("created_at");

    if (error) {
      console.error(error);
      return;
    }

    setPeople(data ?? []);
  }, []);

  const loadNotes = useCallback(async () => {
    let query = supabase.from("notes").select("*").order("created_at", { ascending: false });

    if (selectedEventId) {
      query = query.eq("event_id", selectedEventId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return;
    }

    setNotes(data ?? []);
  }, [selectedEventId]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadPeople(), loadNotes()]);
      setLoading(false);
    }

    init();
  }, [loadPeople, loadNotes]);

  useEffect(() => {
    loadNotes();
  }, [selectedEventId, loadNotes]);

  async function saveNote() {
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      alert("Nie jesteś zalogowany");
      return;
    }

    if (!noteText.trim()) {
      alert("Notatka nie może być pusta");
      return;
    }

    const payload = {
      content: noteText.trim(),
      person_id: selectedPersonId,
      event_id: selectedEventId,
    };

    let error;

    if (editingNote) {
      const res = await supabase.from("notes").update(payload).eq("id", editingNote.id);
      error = res.error;
    } else {
      const res = await supabase.from("notes").insert({
        user_id: auth.user.id,
        ...payload,
      });
      error = res.error;
    }

    if (error) {
      alert(error.message);
      return;
    }

    await loadNotes();
    closeModal();

    if (selectedPersonId) {
      triggerAI(selectedPersonId);
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Usunąć notatkę?")) return;

    await supabase.from("notes").delete().eq("id", id);
    loadNotes();
  }

  function openNewNote() {
    setEditingNote(null);
    setNoteText("");
    setSelectedPersonId(null);
    setIsNoteOpen(true);
  }

  function openEditNote(note: Note) {
    setEditingNote(note);
    setNoteText(note.content);
    setSelectedPersonId(note.person_id);
    setIsNoteOpen(true);
  }

  function closeModal() {
    setIsNoteOpen(false);
    setEditingNote(null);
    setNoteText("");
  }

  async function triggerAI(personId: string) {
    setIsLoadingAI(true);

    try {
      const res = await fetch("/api/ai/gift-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ personId, occasion: "general" }),
      });

      const data = await res.json();
      const ideas: AiIdea[] = data.ideas ?? [];

      setAiIdeas([]);

      for (const idea of ideas) {
        await new Promise<void>((resolve) => {
          streamingTimeoutRef.current = setTimeout(() => {
            setAiIdeas((prev) => [...prev, idea]);
            resolve();
          }, 200);
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAI(false);
    }
  }

  const filteredNotes =
    filterPersonId === "all" ? notes : notes.filter((n) => n.person_id === filterPersonId);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">Notatki</h1>

        <button onClick={openNewNote} className="bg-blue-600 text-white px-4 py-2 rounded">
          + Dodaj
        </button>
      </div>

      <div className="mb-4">
        <label className="text-sm block mb-1">Filtruj po osobie</label>
        <select
          value={filterPersonId}
          onChange={(e) => setFilterPersonId(e.target.value as string | "all")}
          className="border rounded px-2 py-1"
        >
          <option value="all">Wszyscy</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div>Ładowanie...</div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const person = people.find((p) => p.id === note.person_id);

            return (
              <div key={note.id} className="border p-4 rounded">
                <div>{note.content}</div>
                <div className="text-sm text-gray-500">{person ? person.name : "—"}</div>
                <div className="flex gap-4 mt-2">
                  <button onClick={() => openEditNote(note)} className="text-blue-600">
                    Edytuj
                  </button>

                  <button onClick={() => deleteNote(note.id)} className="text-red-600">
                    Usuń
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(isLoadingAI || aiIdeas.length > 0) && (
        <section className="mt-6 border rounded p-4">
          <h2 className="font-medium mb-2">Pomysły AI na prezent</h2>
          {isLoadingAI && <p className="text-sm text-gray-500 mb-2">Generowanie pomysłów...</p>}
          <ul className="space-y-2">
            {aiIdeas.map((idea, idx) => (
              <li key={`${idea.title}-${idx}`} className="border rounded p-2">
                <p className="font-medium">{idea.title}</p>
                <p className="text-sm">{idea.explanation}</p>
                <p className="text-xs text-gray-500">Dlaczego: {idea.why}</p>
                <p className="text-xs text-gray-500">Budżet: {idea.price_range}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isNoteOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-full max-w-md">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full border p-2 rounded mb-3"
            />

            <div className="mb-3">
              <label className="text-sm block mb-1">Osoba</label>
              <select
                value={selectedPersonId ?? ""}
                onChange={(e) => setSelectedPersonId(e.target.value || null)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="">Brak</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={saveNote} className="bg-blue-600 text-white px-4 py-2 rounded">
                Zapisz
              </button>

              <button onClick={closeModal}>Anuluj</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
