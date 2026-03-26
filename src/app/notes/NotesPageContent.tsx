"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type Person = {
  id: string;
  name: string;
  relation: string;
};

type Memory = {
  id: string;
  content_text: string | null;
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
  const [memories, setMemories] = useState<Memory[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const [noteText, setNoteText] = useState("");
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const [filterPersonId, setFilterPersonId] = useState<string | "all">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [aiIdeas, setAiIdeas] = useState<AiIdea[]>([]);

  const streamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, []);

  // ===== LOAD PEOPLE =====
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

  // ===== LOAD MEMORIES =====
  const loadMemories = useCallback(async () => {
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setMemories(data ?? []);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadPeople(), loadMemories()]);
      setLoading(false);
    }

    init();
  }, [loadPeople, loadMemories]);

  // ===== SAVE MEMORY =====
  async function saveMemory() {
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      alert("Nie jesteś zalogowany");
      return;
    }

    if (!noteText.trim()) {
      alert("Notatka nie może być pusta");
      return;
    }

    let error;

    if (editingMemory) {
      const res = await supabase
        .from("memories")
        .update({
          content_text: noteText.trim(),
          person_id: selectedPersonId,
        })
        .eq("id", editingMemory.id);

      error = res.error;
    } else {
      const res = await supabase.from("memories").insert({
        user_id: auth.user.id,
        content_text: noteText.trim(),
        person_id: selectedPersonId,
      });

      error = res.error;
    }

    if (error) {
      alert(error.message);
      return;
    }

    await loadMemories();
    closeModal();

    if (selectedPersonId) {
      triggerAI(selectedPersonId);
    }
  }

  // ===== DELETE =====
  async function deleteMemory(id: string) {
    if (!confirm("Usunąć notatkę?")) return;

    await supabase.from("memories").delete().eq("id", id);
    loadMemories();
  }

  // ===== MODAL =====
  function openNew() {
    setEditingMemory(null);
    setNoteText("");
    setSelectedPersonId(null);
    setIsModalOpen(true);
  }

  function openEdit(memory: Memory) {
    setEditingMemory(memory);
    setNoteText(memory.content_text ?? "");
    setSelectedPersonId(memory.person_id);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingMemory(null);
    setNoteText("");
  }

  // ===== AI =====
  async function triggerAI(personId: string) {
    try {
      const res = await fetch("/api/ai/gift-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    }
  }

  const filteredMemories =
    filterPersonId === "all"
      ? memories
      : memories.filter((m) => m.person_id === filterPersonId);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">Notatki</h1>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded">
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
          {filteredMemories.map((memory) => {
            const person = people.find((p) => p.id === memory.person_id);

            return (
              <div key={memory.id} className="border p-4 rounded">
                <div>{memory.content_text}</div>
                <div className="text-sm text-gray-500">
                  {person ? person.name : "—"}
                </div>
                <div className="flex gap-4 mt-2">
                  <button onClick={() => openEdit(memory)} className="text-blue-600">
                    Edytuj
                  </button>
                  <button
                    onClick={() => deleteMemory(memory.id)}
                    className="text-red-600"
                  >
                    Usuń
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Ideas */}
      {aiIdeas.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Propozycje AI</h2>
          <div className="space-y-3">
            {aiIdeas.map((idea, i) => (
              <div key={i} className="border p-3 rounded bg-blue-50">
                <div className="font-medium">{idea.title}</div>
                <div className="text-sm text-gray-600">{idea.explanation}</div>
                <div className="text-sm text-gray-500">{idea.why}</div>
                <div className="text-sm font-medium text-blue-700">{idea.price_range}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
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
              <button
                onClick={saveMemory}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
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