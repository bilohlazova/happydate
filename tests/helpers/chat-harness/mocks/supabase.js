// Per-window fake of the Supabase browser client. `globalThis.__auth` is provided by the harness.
// `globalThis.__db[table] = { single, list }` seeds reads; every insert/update is recorded in `globalThis.__writes`.
function chain(table) {
  const seed = () => globalThis.__db?.[table] ?? {};
  const record = (kind, row) => { (globalThis.__writes ??= []).push({ kind, table, row }); return Promise.resolve({ error: null }); };
  const c = {
    select: () => c, eq: () => c, order: () => c, limit: () => c, gte: () => c,
    maybeSingle: async () => ({ data: seed().single ?? null, error: null }),
    insert: (row) => record("insert", row),
    update: (row) => ({ eq: () => record("update", row) }),
    then: (resolve) => resolve({ data: seed().list ?? [], error: null }),
  };
  return c;
}
export const supabase = {
  auth: {
    getUser: async () => { await globalThis.__auth.gate; return { data: { user: globalThis.__auth.session()?.user ?? null } }; },
    getSession: async () => ({ data: { session: globalThis.__auth.session() } }),
    onAuthStateChange: (callback) => {
      globalThis.__auth.listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => globalThis.__auth.listeners.delete(callback) } } };
    },
    signOut: async () => {},
  },
  from: (table) => chain(table),
};
