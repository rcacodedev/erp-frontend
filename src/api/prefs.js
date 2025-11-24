// --- FILE: src/api/prefs.js
import http from "./http";

export const apiGetKpisPrefs = () =>
  http.get("/api/me/prefs/kpis/").then((r) => r.data);

export const apiSaveKpisPrefs = (payload) =>
  http.put("/api/me/prefs/kpis/", payload).then((r) => r.data);
