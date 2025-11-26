// --- FILE: src/api/integrations.js
import http from "./http";
import { tpath } from "../lib/tenantPath";

const unwrapList = (data) =>
  Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : data?.items ?? [];

export const apiListWebhooks = (orgSlug) =>
  http
    .get(tpath(orgSlug, "/integrations/webhooks/"))
    .then((res) => unwrapList(res.data));

export const apiCreateWebhook = (orgSlug, payload) =>
  http
    .post(tpath(orgSlug, "/integrations/webhooks/"), payload)
    .then((res) => res.data);

export const apiUpdateWebhook = (orgSlug, id, payload) =>
  http
    .patch(tpath(orgSlug, `/integrations/webhooks/${id}/`), payload)
    .then((res) => res.data);

export const apiDeleteWebhook = (orgSlug, id) =>
  http
    .delete(tpath(orgSlug, `/integrations/webhooks/${id}/`))
    .then((res) => res.data);

export const apiListWebhookLogs = (orgSlug, endpointId) =>
  http
    .get(tpath(orgSlug, `/integrations/webhooks/${endpointId}/logs/`))
    .then((res) => unwrapList(res.data));
