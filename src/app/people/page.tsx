"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Person = {
  id: string;
  name: string;
  birthday: string | null;
  created_at: string;
};

export default function PeoplePage() {
  const router = useRouter();

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBirthday, setNewBirthday] = useState("");

  useEffect(() => {
    loadPeople();
  }, []);

  async function loadPeople() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data, error } = await supabase
      .from("people")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPeople(data);
    }

    setLoading(false);
  }

  async function createPerson() {
    if (!newName.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("people").insert({
      user_id: user.id,
      name: newName.trim(),
      birthday: newBirthday || null,
    });

    setShowModal(false);
    setNewName("");
    setNewBirthday("");

    loadPeople();
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">
          👥 Osoby
        </h1>

        <p className="text-slate-500 text-sm mt-1">
          Dodawaj osoby i zapisuj o nich ważne rzeczy
        </p>
      </div>

      {/* List */}
      <div className="px-4 space-y-3">

        {loading && (
          <p className="text-slate-500">
            Ładowanie...
          </p>
        )}

        {!loading && people.length === 0 && (
          <p className="text-slate-500">
            Nie masz jeszcze żadnych osób.
          </p>
        )}

        {people.map((person) => (
          <div
            key={person.id}
            onClick={() => router.push(`/person/${person.id}`)}
            className="
              bg-white
              rounded-2xl
              p-4
              shadow-sm
              border
              cursor-pointer
              active:scale-[0.98]
              transition-transform
            "
          >
            <div className="font-semibold">
              {person.name}
            </div>

            {person.birthday && (
              <div className="text-sm text-slate-500">
                🎂 {person.birthday}
              </div>
            )}
          </div>
        ))}

      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowModal(true)}
        className="
          fixed bottom-24 right-4
          w-14 h-14
          bg-pink-500
          text-white
          rounded-full
          shadow-lg
          text-2xl
        "
      >
        +
      </button>

      {/* Modal */}
      {showModal && (
        <div className="
          fixed inset-0 bg-black/40
          flex items-center justify-center
          p-4
        ">
          <div className="
            bg-white
            rounded-2xl
            p-5
            w-full max-w-sm
          ">

            <h2 className="font-bold mb-3">
              Dodaj osobę
            </h2>

            <input
              placeholder="Imię"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border rounded-xl p-2 mb-3"
            />

            <input
              type="date"
              value={newBirthday}
              onChange={(e) => setNewBirthday(e.target.value)}
              className="w-full border rounded-xl p-2 mb-3"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border rounded-xl p-2"
              >
                Anuluj
              </button>

              <button
                onClick={createPerson}
                className="flex-1 bg-pink-500 text-white rounded-xl p-2"
              >
                Dodaj
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}