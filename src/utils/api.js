/**
 * Keep the API host aligned with the page host.
 * Using localhost for the API while the UI is on 127.0.0.1
 * (or the reverse) breaks session cookies across sites.
 */
const host =
  typeof window !== "undefined" && window.location?.hostname
    ? window.location.hostname
    : "localhost";

export const API_URL = `http://${host}:5000`;
