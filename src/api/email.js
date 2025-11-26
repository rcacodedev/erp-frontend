// --- FILE: src/api/email.js
import http from "./http";
import { tpath } from "../lib/tenantPath";

export const apiGetOrgEmailSettings = (orgSlug) =>
  http.get(tpath(orgSlug, "/core/org/email-settings/")).then((r) => r.data);

export const apiUpdateOrgEmailSettings = (orgSlug, payload) =>
  http
    .put(tpath(orgSlug, "/core/org/email-settings/"), payload)
    .then((r) => r.data);

export const apiTestOrgEmail = (orgSlug) =>
  http.post(tpath(orgSlug, "/core/org/email-test/")).then((r) => r.data);
