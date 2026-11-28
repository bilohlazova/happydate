// Per-window fake of the Supabase browser client. `globalThis.__auth` is provided by the harness.
// `globalThis.__db[table] = { single, list }` seeds reads (list rows are filtered by .eq/.is like PostgREST);
// every insert/update is recorded in `globalThis.__writes`; every query in `globalThis.__queries`.
function chain(table) {
  const seed = () => globalThis.__db?.[table] ?? {};
  const filters = [];
  const record = (kind, row) => { (globalThis.__writes ??= []).push({ kind, table, row }); return Promise.resolve({ error: null }); };
  const rows = () => {
    let list = [...(seed().list ?? [])];
    if (seed().ignoreFilters) return list; // simulates a server that leaks: the client must still drop foreign/other-segment rows
    for (const [op, column, value] of filters) list = list.filter((row) => (op === "eq" ? row[column] === value : row[column] === null || row[column] === undefined));
    return list;
  };
  const c = {
    select: () => { (globalThis.__queries ??= []).push({ table, filters }); return c; },
    eq: (column, value) => { filters.push(["eq", column, value]); return c; },
    is: (column) => { filters.push(["is", column]); return c; },
    order: () => c, limit: (n) => { c.__limit = n; return c; }, gte: () => c, in: () => c, or: () => c, abortSignal: () => c,
    maybeSingle: async () => ({ data: seed().single ?? null, error: null }),
    insert: (row) => record("insert", row),
    update: (row) => ({ eq: () => record("update", row) }),
    then: (resolve) => {
      const result = seed().error ? { data: null, error: { message: seed().error } } : { data: rows().slice(0, c.__limit ?? undefined), error: null };
      if (seed().delayMs) setTimeout(() => resolve(result), seed().delayMs); else resolve(result);
    },
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
