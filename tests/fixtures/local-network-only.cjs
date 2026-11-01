// Loaded before Next.js/Supabase: a stale production build must not contact a real project.
const originalFetch = globalThis.fetch;
globalThis.fetch = function localReleaseFetch(input, init) {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    !["3107", "54329"].includes(url.port)
  ) {
    return Promise.reject(new Error("Release test blocked nonlocal server fetch"));
  }
  return originalFetch(input, init);
};
