// --- FILE: src/api/analytics.js
import http from "./http";
import { tpath } from "../lib/tenantPath";

// ===================== F5B existentes =====================

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

// Cobros pendientes (AR overview)
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

// ===================== F7 PRO nuevas =====================

// Margen (por category|product|customer|seller)
export const apiGetMargins = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/margins/"), { params })
    .then((res) => res.data);

// Cashflow (inflows/outflows/net por day|week|month)
export const apiGetCashflow = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/cashflow/"), { params })
    .then((res) => res.data);

// Aging de cobros (AR)
export const apiGetAgingReceivables = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/aging/receivables/"), { params })
    .then((res) => res.data);

// Aging de pagos (AP)
export const apiGetAgingPayables = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/aging/payables/"), { params })
    .then((res) => res.data);

// Top productos (por revenue o margin)
// ANTES: "/analytics/top-products/"
export const apiGetTopProducts = (orgSlug, params = {}) =>
  http
    .get(tpath(orgSlug, "/analytics/products/top/"), { params })
    .then((res) => res.data);
