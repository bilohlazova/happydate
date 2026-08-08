/**
 * Canonical route ownership for Memory Capture.
 *
 * All capture consumers use the signed-token canonical API.
 */
export const MEMORY_CAPTURE_ENDPOINTS = Object.freeze({
  canonical: Object.freeze({
    detect: "/api/memory-capture/detect",
    confirm: "/api/memory-capture/confirm",
  }),
});
