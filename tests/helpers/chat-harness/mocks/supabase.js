// Per-window fake of the Supabase browser client. `globalThis.__auth` is provided by the harness.
function chain() {
  const c = { select: () => c, eq: () => c, order: () => c, limit: () => c, maybeSingle: async () => ({ data: null, error: null }) };
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
  from: () => chain(),
};
