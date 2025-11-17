// --- FILE: src/api/analytics.js
import http from "./http";
import { tpath } from "../lib/tenantPath";

// Yearly summary: ingresos / gastos / beneficio por año
export const apiGetYearlySummary = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/yearly-summary/"), { params })
    .then((res) => res.data);

// Serie temporal de ventas (ingresos)
export const apiGetSalesTimeseries = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/sales-timeseries/"), { params })
    .then((res) => res.data);

// Serie temporal de gastos
export const apiGetExpensesTimeseries = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/expenses-timeseries/"), { params })
    .then((res) => res.data);

// Cobros pendientes
export const apiGetReceivables = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/receivables/"), { params })
    .then((res) => res.data);

// IVA repercutido
export const apiGetVatSummary = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/vat/"), { params })
    .then((res) => res.data);

// Top clientes
export const apiGetTopCustomers = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/top-customers/"), { params })
    .then((res) => res.data);

// Presupuestado vs facturado
export const apiGetQuotesVsInvoices = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/quotes-vs-invoices/"), { params })
    .then((res) => res.data);
