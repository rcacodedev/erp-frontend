// --- FILE: src/pages/kpis/KpisPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import {
  apiGetYearlySummary,
  apiGetSalesTimeseries,
  apiGetExpensesTimeseries,
  apiGetReceivables,
  apiGetVatSummary,
  apiGetTopCustomers,
  apiGetQuotesVsInvoices,
  apiGetMargins,
  apiGetCashflow,
  apiGetAgingReceivables,
  apiGetAgingPayables,
  apiGetTopProducts,
} from "../../api/analytics";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { useSearchParams } from "react-router-dom";
import ExportPdfButton from "../../components/ExportPdfButton.jsx";

/** ===== Utilidad: genera y descarga un CSV (sin dependencias) ===== */
function downloadCsv({ filename, columns, rows }) {
  if (!rows?.length) return;
  const headers = columns
    .map((c) => `"${(c.label ?? c.key).replace(/"/g, '""')}"`)
    .join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        const cell = val === null || val === undefined ? "" : String(val);
        return `"${cell.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  const csv = [headers, ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** ===== Botón Export CSV ===== */
function ExportCsvButton({ filename, columns, rows, className = "" }) {
  const disabled = !rows || rows.length === 0;
  return (
    <button
      type="button"
      onClick={() => downloadCsv({ filename, columns, rows })}
      disabled={disabled}
      className={
        "text-xs rounded-md border px-2 py-1 bg-white hover:bg-gray-50 transition dark:bg-slate-900 dark:border-slate-700 " +
        (disabled ? "opacity-50 cursor-not-allowed " : "") +
        className
      }
      title={disabled ? "No hay datos para exportar" : "Exportar CSV"}
    >
      Exportar CSV
    </button>
  );
}

/** ===== Página KPIs ===== */
export default function KpisPage() {
  const { org } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const captureRef = useRef(null);

  // Helpers URL <-> estado
  const getParam = (key, fallback) => {
    const v = searchParams.get(key);
    return v ?? fallback;
  };
  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === "") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  // Filtros (se leen de URL al iniciar)
  const ALLOWED_RANGE = new Set(["current_year", "last_year", "all"]);
  const ALLOWED_GROUPBY = new Set([
    "category",
    "product",
    "customer",
    "seller",
  ]);
  const ALLOWED_BUCKET = new Set(["day", "week", "month"]);
  const ALLOWED_TOPBY = new Set(["revenue", "margin"]);

  const [rangePreset, setRangePreset] = useState(() => {
    const p = getParam("range", "current_year");
    return ALLOWED_RANGE.has(p) ? p : "current_year";
  });
  const [groupBy, setGroupBy] = useState(() => {
    const p = getParam("groupBy", "category");
    return ALLOWED_GROUPBY.has(p) ? p : "category";
  });
  const [bucket, setBucket] = useState(() => {
    const p = getParam("bucket", "month");
    return ALLOWED_BUCKET.has(p) ? p : "month";
  });
  const [topBy, setTopBy] = useState(() => {
    const p = getParam("topBy", "revenue");
    return ALLOWED_TOPBY.has(p) ? p : "revenue";
  });

  // Sincroniza URL al cambiar filtros
  useEffect(() => {
    setParam("range", rangePreset);
  }, [rangePreset]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setParam("groupBy", groupBy);
  }, [groupBy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setParam("bucket", bucket);
  }, [bucket]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setParam("topBy", topBy);
  }, [topBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Datos & estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // F5B (básico)
  const [yearlySummary, setYearlySummary] = useState(null);
  const [salesTimeseries, setSalesTimeseries] = useState(null);
  const [expensesTimeseries, setExpensesTimeseries] = useState(null);
  const [receivables, setReceivables] = useState(null);
  const [vatSummary, setVatSummary] = useState(null);
  const [topCustomers, setTopCustomers] = useState(null);
  const [quotesVsInvoices, setQuotesVsInvoices] = useState(null);

  // F7 (PRO)
  const [margins, setMargins] = useState({ rows: [], totals: null });
  const [cashflow, setCashflow] = useState({ series: [] });
  const [agingAR, setAgingAR] = useState(null);
  const [agingAP, setAgingAP] = useState(null);
  const [topProducts, setTopProducts] = useState({ rows: [] });

  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    if (rangePreset === "current_year") {
      const y = now.getFullYear();
      return { fromDate: `${y}-01-01`, toDate: `${y}-12-31` };
    }
    if (rangePreset === "last_year") {
      const y = now.getFullYear() - 1;
      return { fromDate: `${y}-01-01`, toDate: `${y}-12-31` };
    }
    return { fromDate: undefined, toDate: undefined }; // all
  }, [rangePreset]);

  const toNumber = (value, fallback = 0) => {
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isNaN(n) ? fallback : n;
  };

  /** Serie Ingresos vs Gastos (mensual) */
  const incomeExpenseSeries = useMemo(() => {
    const map = new Map();
    const addItems = (items, key) => {
      if (!items || !Array.isArray(items)) return;
      items.forEach((item) => {
        const period =
          item.period || item.label || item.date || item.month || item.year;
        if (!period) return;
        const value = toNumber(
          item.invoiced_base ??
            item.expenses_amount ??
            item.amount ??
            item.total ??
            item.value ??
            item.sum
        );
        const existing = map.get(period) || { period, income: 0, expenses: 0 };
        existing[key] = value;
        map.set(period, existing);
      });
    };
    addItems(salesTimeseries?.items, "income");
    addItems(expensesTimeseries?.items, "expenses");
    return Array.from(map.values()).sort((a, b) =>
      String(a.period).localeCompare(String(b.period))
    );
  }, [salesTimeseries, expensesTimeseries]);

  /** ===== Fetch básico (F5B) ===== */
  useEffect(() => {
    if (!org?.slug) return;
    let alive = true;
    setLoading(true);
    setError(null);

    const commonRange = {};
    if (fromDate) commonRange.from = fromDate;
    if (toDate) commonRange.to = toDate;

    Promise.all([
      apiGetYearlySummary(org.slug, commonRange),
      apiGetSalesTimeseries(org.slug, { ...commonRange, group_by: "month" }),
      apiGetExpensesTimeseries(org.slug, { ...commonRange, group_by: "month" }),
      apiGetReceivables(org.slug, commonRange),
      apiGetVatSummary(org.slug, { ...commonRange, group_by: "month" }),
      apiGetTopCustomers(org.slug, { ...commonRange, limit: 5 }),
      apiGetQuotesVsInvoices(org.slug, commonRange),
    ])
      .then(
        ([
          yearlySummaryData,
          salesTimeseriesData,
          expensesTimeseriesData,
          receivablesData,
          vatSummaryData,
          topCustomersData,
          quotesVsInvoicesData,
        ]) => {
          if (!alive) return;
          setYearlySummary(yearlySummaryData);
          setSalesTimeseries(salesTimeseriesData);
          setExpensesTimeseries(expensesTimeseriesData);
          setReceivables(receivablesData);
          setVatSummary(vatSummaryData);
          setTopCustomers(topCustomersData);
          setQuotesVsInvoices(quotesVsInvoicesData);
        }
      )
      .catch((err) => {
        console.error("Error KPIs:", err);
        if (alive) setError(err);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [org?.slug, fromDate, toDate]);

  /** ===== Fetch PRO (F7) ===== */
  useEffect(() => {
    if (!org?.slug) return;

    const proRange = {};
    if (fromDate) proRange.from = fromDate;
    if (toDate) proRange.to = toDate;

    Promise.all([
      apiGetMargins(org.slug, { ...proRange, group_by: groupBy }),
      apiGetCashflow(org.slug, { ...proRange, bucket }),
      apiGetAgingReceivables(org.slug, { as_of: toDate || undefined }),
      apiGetAgingPayables(org.slug, { as_of: toDate || undefined }),
      apiGetTopProducts(org.slug, { ...proRange, by: topBy, limit: 10 }),
    ])
      .then(([m, cf, ar, ap, tp]) => {
        setMargins(m || { rows: [], totals: null });
        setCashflow(cf || { series: [] });
        setAgingAR(ar || null);
        setAgingAP(ap || null);
        setTopProducts(tp || { rows: [] });
      })
      .catch((err) => console.error("Error KPIs PRO:", err));
  }, [org?.slug, groupBy, bucket, topBy, fromDate, toDate]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">KPIs</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Cargando KPIs...
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-700 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">KPIs</h1>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          <p className="font-semibold mb-1">Error al cargar los KPIs</p>
          <p>{error.message || "Error desconocido"}</p>
        </div>
      </div>
    );
  }

  /** ========= Helpers ========= */
  const currency = receivables?.currency || "EUR";
  const formatCurrency = (value) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(toNumber(value));
  const money = (n) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(toNumber(n));
  const formatPercent = (value) => {
    const n = toNumber(value);
    return `${(n * 100).toFixed(1)} %`;
  };
  const compact = (n) =>
    new Intl.NumberFormat("es-ES", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(toNumber(n));
  const PIE_COLORS = ["#16a34a", "#eab308", "#ef4444", "#0ea5e9", "#a855f7"];

  const yearlyTotals = yearlySummary?.totals || {};
  const totalIncome = toNumber(yearlyTotals.income_amount);
  const totalExpenses = toNumber(yearlyTotals.expenses_amount);
  const totalProfit = toNumber(yearlyTotals.profit_amount);

  const totalPending = toNumber(receivables?.total_pending);
  const totalVat = toNumber(vatSummary?.totals?.tax_amount);
  const conversionRatio = toNumber(quotesVsInvoices?.conversion_ratio);

  /** Top clientes (barras + lista) */
  const topCustomersItems = Array.isArray(topCustomers?.items)
    ? topCustomers.items
    : [];
  const topCustomersChartData = topCustomersItems.map((c) => ({
    name: c.customer_name || `ID ${c.customer_id}`,
    totalBase:
      toNumber(c.total_base) ?? toNumber(c.totalBase) ?? toNumber(c.total) ?? 0,
    invoicesCount: c.invoices_count ?? c.invoicesCount ?? 0,
  }));

  /** IVA por periodo (barras) */
  const vatItems = Array.isArray(vatSummary?.items) ? vatSummary.items : [];
  const vatChartData = vatItems.map((item) => ({
    period: item.period,
    baseAmount:
      toNumber(item.base_amount) ??
      toNumber(item.baseAmount) ??
      toNumber(item.base) ??
      0,
    taxAmount:
      toNumber(item.tax_amount) ??
      toNumber(item.taxAmount) ??
      toNumber(item.tax) ??
      0,
  }));

  /** Presupuestado vs facturado (totales) */
  const quotesTotals = quotesVsInvoices?.totals || {};
  const quotesBaseTotal =
    toNumber(quotesTotals.quotes_base) ??
    toNumber(quotesTotals.quotesBase) ??
    toNumber(quotesTotals.quotes_amount) ??
    toNumber(quotesTotals.quotes) ??
    toNumber(quotesVsInvoices?.quotes_total) ??
    0;
  const invoicesBaseTotal =
    toNumber(quotesTotals.invoices_base) ??
    toNumber(quotesTotals.invoicesBase) ??
    toNumber(quotesTotals.invoices_amount) ??
    toNumber(quotesTotals.invoices) ??
    toNumber(quotesVsInvoices?.invoices_total) ??
    0;
  const quotesCount =
    quotesTotals.quotes_count ??
    quotesTotals.quotesCount ??
    quotesVsInvoices?.quotes_count ??
    0;
  const invoicesCount =
    quotesTotals.invoices_count ??
    quotesTotals.invoicesCount ??
    quotesVsInvoices?.invoices_count ??
    0;
  const quotesInvoicesChartData = [
    { label: "Presupuestado", amount: quotesBaseTotal },
    { label: "Facturado", amount: invoicesBaseTotal },
  ];

  const rangeLabel =
    rangePreset === "current_year"
      ? "Año actual"
      : rangePreset === "last_year"
      ? "Año anterior"
      : "Todo el histórico";

  /** Resumen por año -> dataset + export rows */
  const yearlyItems = Array.isArray(yearlySummary?.items)
    ? yearlySummary.items
    : Array.isArray(yearlySummary?.years)
    ? yearlySummary.years
    : [];
  const yearlyChartData = yearlyItems
    .map((it) => ({
      year: it.year ?? it.label ?? it.period,
      income: toNumber(it.income_amount ?? it.income ?? it.total_income),
      expenses: toNumber(
        it.expenses_amount ?? it.expenses ?? it.total_expenses
      ),
      profit:
        toNumber(it.profit_amount ?? it.profit) ||
        toNumber(it.income_amount ?? 0) - toNumber(it.expenses_amount ?? 0),
    }))
    .filter((d) => d.year);
  const yearlyExportRows = yearlyChartData.map((d) => ({
    year: d.year,
    income: d.income,
    expenses: d.expenses,
    profit: d.profit,
  }));

  /** Cobros pendientes (overview con aging) */
  const arBuckets = agingAR?.buckets || {};
  const c0_30 = toNumber(arBuckets["0-30"]);
  const c31_60 = toNumber(arBuckets["31-60"]);
  const c61_90 = toNumber(arBuckets["61-90"]);
  const c90p = toNumber(arBuckets[">90"]);
  const arOverdue = c31_60 + c61_90 + c90p;
  const arCurrent = c0_30;
  const arTotal = arCurrent + arOverdue || totalPending;
  const arPieData = [
    { name: "Al día (0-30)", value: arCurrent },
    { name: "Vencido (31+)", value: arOverdue },
  ].filter((d) => d.value > 0);
  const arExportRows = [
    { tramo: "0-30", amount: c0_30 },
    { tramo: "31-60", amount: c31_60 },
    { tramo: "61-90", amount: c61_90 },
    { tramo: ">90", amount: c90p },
    { tramo: "TOTAL", amount: arTotal },
  ];

  /** Datasets de export para otros bloques */
  const ieExportRows = (incomeExpenseSeries || []).map((r) => ({
    period: r.period,
    income: r.income,
    expenses: r.expenses,
  }));

  const topCustomersExportRows = (topCustomersItems || []).map((c) => ({
    customer: c.customer_name || `ID ${c.customer_id}`,
    invoices_count: c.invoices_count ?? 0,
    total_base:
      toNumber(c.total_base) ?? toNumber(c.totalBase) ?? toNumber(c.total) ?? 0,
  }));

  const vatExportRows = (vatChartData || []).map((v) => ({
    period: v.period,
    base_amount: v.baseAmount,
    tax_amount: v.taxAmount,
  }));

  const qviExportRows = [
    { metric: "Presupuestado (base)", amount: quotesBaseTotal },
    { metric: "Facturado (base)", amount: invoicesBaseTotal },
    { metric: "Conversión (0–1)", amount: conversionRatio },
    { metric: "Nº presupuestos", amount: quotesCount },
    { metric: "Nº facturas (desde presupuesto)", amount: invoicesCount },
  ];

  const marginsExportRows = (margins?.rows || []).map((r) => ({
    key: r.key,
    revenue: r.revenue ?? 0,
    cogs: r.cogs ?? 0,
    margin: r.margin ?? 0,
    margin_pct: r.margin_pct ?? 0,
  }));

  const cashflowExportRows = (cashflow?.series || []).map((s) => ({
    date: s.date,
    inflows: s.inflows ?? 0,
    outflows: s.outflows ?? 0,
    net: s.net ?? 0,
  }));

  const agingAPExportRows = [
    { tramo: "0-30", amount: Number(agingAP?.buckets?.["0-30"] || 0) },
    { tramo: "31-60", amount: Number(agingAP?.buckets?.["31-60"] || 0) },
    { tramo: "61-90", amount: Number(agingAP?.buckets?.["61-90"] || 0) },
    { tramo: ">90", amount: Number(agingAP?.buckets?.[">90"] || 0) },
  ];

  const topProductsExportRows = (topProducts?.rows || []).map((r) => ({
    product: r.product__name || "",
    revenue: r.revenue ?? 0,
    margin: r.margin ?? 0,
  }));

  /** ===== Barra de acciones (permalink/reset/export todo/pdf) ===== */
  const resetFilters = () => {
    setRangePreset("current_year");
    setGroupBy("category");
    setBucket("month");
    setTopBy("revenue");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyPermalink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {}
  };

  const exportAll = () => {
    downloadCsv({
      filename: "resumen-por-ano.csv",
      columns: [
        { key: "year", label: "Año" },
        { key: "income", label: "Ingresos" },
        { key: "expenses", label: "Gastos" },
        { key: "profit", label: "Beneficio" },
      ],
      rows: yearlyExportRows,
    });
    downloadCsv({
      filename: "ingresos-vs-gastos.csv",
      columns: [
        { key: "period", label: "Periodo" },
        { key: "income", label: "Ingresos" },
        { key: "expenses", label: "Gastos" },
      ],
      rows: ieExportRows,
    });
    downloadCsv({
      filename: "top-clientes.csv",
      columns: [
        { key: "customer", label: "Cliente" },
        { key: "invoices_count", label: "Nº facturas" },
        { key: "total_base", label: "Facturado base" },
      ],
      rows: topCustomersExportRows,
    });
    downloadCsv({
      filename: "iva-por-periodo.csv",
      columns: [
        { key: "period", label: "Periodo" },
        { key: "base_amount", label: "Base" },
        { key: "tax_amount", label: "IVA" },
      ],
      rows: vatExportRows,
    });
    downloadCsv({
      filename: "presupuestado-vs-facturado.csv",
      columns: [
        { key: "metric", label: "Métrica" },
        { key: "amount", label: "Importe" },
      ],
      rows: qviExportRows,
    });
    downloadCsv({
      filename: `margen-por-${groupBy}.csv`,
      columns: [
        { key: "key", label: groupBy },
        { key: "revenue", label: "Ingresos" },
        { key: "cogs", label: "COGS" },
        { key: "margin", label: "Margen" },
        { key: "margin_pct", label: "Margen %" },
      ],
      rows: marginsExportRows,
    });
    downloadCsv({
      filename: `cashflow-${bucket}.csv`,
      columns: [
        { key: "date", label: "Fecha" },
        { key: "inflows", label: "Entradas" },
        { key: "outflows", label: "Salidas" },
        { key: "net", label: "Neto" },
      ],
      rows: cashflowExportRows,
    });
    downloadCsv({
      filename: "cobros-pendientes-aging.csv",
      columns: [
        { key: "tramo", label: "Tramo" },
        { key: "amount", label: "Importe" },
      ],
      rows: arExportRows,
    });
    downloadCsv({
      filename: "aging-ap.csv",
      columns: [
        { key: "tramo", label: "Tramo" },
        { key: "amount", label: "Importe" },
      ],
      rows: agingAPExportRows,
    });
    downloadCsv({
      filename: `top-productos-${topBy}.csv`,
      columns: [
        { key: "product", label: "Producto" },
        { key: "revenue", label: "Facturación" },
        { key: "margin", label: "Margen" },
      ],
      rows: topProductsExportRows,
    });
  };

  /** ========= Render ========= */
  return (
    <div className="p-6 space-y-6">
      {/* Header + acciones */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between sticky top-0 z-10 bg-white/75 backdrop-blur border-b border-gray-100 pb-3 dark:bg-slate-950/75 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-semibold mb-1">KPIs</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Panel de indicadores clave de tu organización (F5B + PRO F7).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtros de periodo */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
              Periodo:
            </span>
            <select
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value)}
              className="text-xs rounded-md border border-gray-300 bg-white px-2 py-1 dark:bg-slate-900 dark:border-slate-700"
            >
              <option value="current_year">Año actual</option>
              <option value="last_year">Año anterior</option>
              <option value="all">Todo el histórico</option>
            </select>
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              ({rangeLabel})
            </span>
          </div>

          {/* Acciones rápidas */}
          <div className="ml-2 flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs rounded-md border px-2 py-1 bg-white hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700"
              title="Reset filtros"
            >
              Reset filtros
            </button>
            <button
              type="button"
              onClick={copyPermalink}
              className="text-xs rounded-md border px-2 py-1 bg-white hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700"
              title="Copiar enlace con filtros"
            >
              Copiar enlace
            </button>
            <button
              type="button"
              onClick={exportAll}
              className="text-xs rounded-md border px-2 py-1 bg-white hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700"
              title="Descargar todos los CSV"
            >
              Exportar todo (CSV × N)
            </button>

            {/* NUEVO: Exportar PDF */}
            <ExportPdfButton
              className="ml-1"
              filename={`KPIs-${
                org?.name || org?.slug || "org"
              }-${rangePreset}.pdf`}
              getElement={() => captureRef.current}
              pixelRatio={2}
              marginPt={24}
            />
          </div>
        </div>
      </div>

      {/* Contenido exportable */}
      <div ref={captureRef} id="kpis-print" className="space-y-6">
        {/* Tarjetas resumen */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-slate-400">
              Ingresos totales
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalIncome)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-slate-400">
              Gastos totales
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalExpenses)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-slate-400">
              Beneficio total
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalProfit)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-slate-400">
              Cobros pendientes
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalPending)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-slate-400">
              IVA repercutido
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalVat)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-slate-400">
              Conversión presupuestos → facturas
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatPercent(conversionRatio)}
            </p>
          </div>
        </section>

        {/* Resumen por año */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Resumen por año</h2>
            <ExportCsvButton
              filename="resumen-por-ano.csv"
              columns={[
                { key: "year", label: "Año" },
                { key: "income", label: "Ingresos" },
                { key: "expenses", label: "Gastos" },
                { key: "profit", label: "Beneficio" },
              ]}
              rows={yearlyExportRows}
            />
          </div>

          <div className="h-80">
            {yearlyChartData.length ? (
              <ResponsiveContainer>
                <BarChart data={yearlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" name="Ingresos" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Gastos" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Beneficio"
                    strokeWidth={2}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-500 dark:text-slate-400">
                No hay datos para resumir por año.
              </div>
            )}
          </div>
        </section>

        {/* Ingresos vs Gastos */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">
              Ingresos vs Gastos por periodo
            </h2>
            <ExportCsvButton
              filename="ingresos-vs-gastos.csv"
              columns={[
                { key: "period", label: "Periodo" },
                { key: "income", label: "Ingresos" },
                { key: "expenses", label: "Gastos" },
              ]}
              rows={ieExportRows}
            />
          </div>
          <p className="text-xs text-gray-500 mb-3 dark:text-slate-400">
            Basado en las series temporales de ventas y gastos.
          </p>
          <div className="h-72">
            {incomeExpenseSeries && incomeExpenseSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={incomeExpenseSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Ingresos"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Gastos"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-500 dark:text-slate-400">
                No hay datos suficientes para mostrar la gráfica.
              </div>
            )}
          </div>
        </section>

        {/* Top clientes */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Top clientes</h2>
            <ExportCsvButton
              filename="top-clientes.csv"
              columns={[
                { key: "customer", label: "Cliente" },
                { key: "invoices_count", label: "Nº facturas" },
                { key: "total_base", label: "Facturado base" },
              ]}
              rows={topCustomersExportRows}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-64">
              {topCustomersChartData && topCustomersChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomersChartData} margin={{ top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "Facturado")
                          return [formatCurrency(value), name];
                        if (name === "Facturas") return [value, name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="totalBase"
                      name="Facturado"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  No hay datos suficientes para mostrar el top de clientes.
                </div>
              )}
            </div>

            <div className="space-y-2">
              {topCustomersItems && topCustomersItems.length > 0 ? (
                topCustomersItems.map((c) => (
                  <div
                    key={c.customer_id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {c.customer_name || `ID ${c.customer_id}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Facturas: {c.invoices_count ?? 0}
                      </p>
                    </div>
                    <div className="text-sm font-semibold">
                      {formatCurrency(
                        c.total_base ?? c.totalBase ?? c.total ?? 0
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Sin clientes destacados todavía.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* IVA por periodo */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              IVA repercutido por periodo
            </h2>
            <ExportCsvButton
              filename="iva-por-periodo.csv"
              columns={[
                { key: "period", label: "Periodo" },
                { key: "base_amount", label: "Base" },
                { key: "tax_amount", label: "IVA" },
              ]}
              rows={vatExportRows}
            />
          </div>

          <div className="h-72">
            {vatChartData && vatChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vatChartData} margin={{ top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "Base") return [formatCurrency(value), name];
                      if (name === "IVA") return [formatCurrency(value), name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="baseAmount" name="Base" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="taxAmount" name="IVA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-500 dark:text-slate-400">
                No hay datos suficientes para mostrar la evolución del IVA.
              </div>
            )}
          </div>
        </section>

        {/* Presupuestado vs facturado */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              Presupuestado vs facturado
            </h2>
            <ExportCsvButton
              filename="presupuestado-vs-facturado.csv"
              columns={[
                { key: "metric", label: "Métrica" },
                { key: "amount", label: "Importe" },
              ]}
              rows={qviExportRows}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:bg-slate-800 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Total presupuestado
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(quotesBaseTotal)}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Nº presupuestos: {quotesCount}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:bg-slate-800 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Total facturado
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(invoicesBaseTotal)}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Nº facturas (desde presupuesto): {invoicesCount}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:bg-slate-800 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Conversión presupuestos → facturas
                </p>
                <p className="text-lg font-semibold">
                  {formatPercent(conversionRatio)}
                </p>
              </div>
            </div>

            <div className="md:col-span-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quotesInvoicesChartData} margin={{ top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(value),
                      name === "amount" ? "Importe" : name,
                    ]}
                  />
                  <Bar dataKey="amount" name="Importe" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* === PRO CONTROLS === */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 dark:text-slate-400">
                Agrupar margen por
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="text-xs rounded-md border px-2 py-1 dark:bg-slate-900 dark:border-slate-700"
              >
                <option value="category">Categoría</option>
                <option value="product">Producto</option>
                <option value="customer">Cliente</option>
                <option value="seller">Vendedor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 dark:text-slate-400">
                Bucket cashflow
              </label>
              <select
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="text-xs rounded-md border px-2 py-1 dark:bg-slate-900 dark:border-slate-700"
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 dark:text-slate-400">
                Top productos por
              </label>
              <select
                value={topBy}
                onChange={(e) => setTopBy(e.target.value)}
                className="text-xs rounded-md border px-2 py-1 dark:bg-slate-900 dark:border-slate-700"
              >
                <option value="revenue">Facturación</option>
                <option value="margin">Margen</option>
              </select>
            </div>
          </div>
        </section>

        {/* Margen PRO */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Margen por {groupBy}</h2>
            <ExportCsvButton
              filename={`margen-por-${groupBy}.csv`}
              columns={[
                { key: "key", label: groupBy },
                { key: "revenue", label: "Ingresos" },
                { key: "cogs", label: "COGS" },
                { key: "margin", label: "Margen" },
                { key: "margin_pct", label: "Margen %" },
              ]}
              rows={marginsExportRows}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3 bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
              <div className="text-xs text-gray-500 dark:text-slate-400">
                Ingresos
              </div>
              <div className="text-lg font-semibold">
                {money(margins?.totals?.revenue || 0)}
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
              <div className="text-xs text-gray-500 dark:text-slate-400">
                COGS
              </div>
              <div className="text-lg font-semibold">
                {money(margins?.totals?.cogs || 0)}
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
              <div className="text-xs text-gray-500 dark:text-slate-400">
                Margen
              </div>
              <div className="text-lg font-semibold">
                {money(margins?.totals?.margin || 0)}
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
              <div className="text-xs text-gray-500 dark:text-slate-400">
                Margen %
              </div>
              <div className="text-lg font-semibold">
                {(Number(margins?.totals?.margin_pct || 0) * 100).toFixed(1)} %
              </div>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={margins?.rows || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="key" />
                <YAxis />
                <Tooltip formatter={(v, n) => [money(v), n]} />
                <Legend />
                <Bar
                  dataKey="revenue"
                  name="Ingresos"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="cogs"
                  name="COGS"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Cashflow PRO */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Cashflow ({bucket})</h2>
            <ExportCsvButton
              filename={`cashflow-${bucket}.csv`}
              columns={[
                { key: "date", label: "Fecha" },
                { key: "inflows", label: "Entradas" },
                { key: "outflows", label: "Salidas" },
                { key: "net", label: "Neto" },
              ]}
              rows={cashflowExportRows}
            />
          </div>
          <div className="h-80">
            <ResponsiveContainer>
              <AreaChart data={cashflow?.series || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v, n) => [money(v), n]} />
                <Legend />
                <Area type="monotone" dataKey="inflows" name="Entradas" />
                <Area type="monotone" dataKey="outflows" name="Salidas" />
                <Line type="monotone" dataKey="net" name="Neto" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Cobros pendientes (Overview + pie) */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Cobros pendientes (AR)</h2>
            <ExportCsvButton
              filename="cobros-pendientes-aging.csv"
              columns={[
                { key: "tramo", label: "Tramo" },
                { key: "amount", label: "Importe" },
              ]}
              rows={arExportRows}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="rounded-lg border bg-gray-50 p-3 dark:bg-slate-800 dark:border-slate-700">
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Pendiente total
                </div>
                <div className="text-xl font-semibold">
                  {formatCurrency(arTotal)}
                </div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 dark:bg-slate-800 dark:border-slate-700">
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Al día (0–30)
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(arCurrent)}
                </div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 dark:bg-slate-800 dark:border-slate-700">
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Vencido (31+)
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(arOverdue)}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 h-64">
              {arPieData.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Tooltip formatter={(v, n) => [formatCurrency(v), n]} />
                    <Legend />
                    <Pie
                      data={arPieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                    >
                      {arPieData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  No hay datos de aging para mostrar.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Aging AR/AP */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Aging Cobros (AR)</h2>
              <ExportCsvButton
                filename="aging-ar.csv"
                columns={[
                  { key: "tramo", label: "Tramo" },
                  { key: "amount", label: "Importe" },
                ]}
                rows={[
                  { tramo: "0-30", amount: c0_30 },
                  { tramo: "31-60", amount: c31_60 },
                  { tramo: "61-90", amount: c61_90 },
                  { tramo: ">90", amount: c90p },
                ]}
              />
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart
                  data={[
                    { bucket: "0-30", amount: c0_30 },
                    { bucket: "31-60", amount: c31_60 },
                    { bucket: "61-90", amount: c61_90 },
                    { bucket: ">90", amount: c90p },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend />
                  <Bar
                    dataKey="amount"
                    name="Pendiente"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border p-4 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Aging Pagos (AP)</h2>
              <ExportCsvButton
                filename="aging-ap.csv"
                columns={[
                  { key: "tramo", label: "Tramo" },
                  { key: "amount", label: "Importe" },
                ]}
                rows={agingAPExportRows}
              />
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart
                  data={[
                    {
                      bucket: "0-30",
                      amount: Number(agingAP?.buckets?.["0-30"] || 0),
                    },
                    {
                      bucket: "31-60",
                      amount: Number(agingAP?.buckets?.["31-60"] || 0),
                    },
                    {
                      bucket: "61-90",
                      amount: Number(agingAP?.buckets?.["61-90"] || 0),
                    },
                    {
                      bucket: ">90",
                      amount: Number(agingAP?.buckets?.[">90"] || 0),
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend />
                  <Bar
                    dataKey="amount"
                    name="Pendiente"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Top productos */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">
              Top productos por {topBy === "margin" ? "margen" : "facturación"}
            </h2>
            <ExportCsvButton
              filename={`top-productos-${topBy}.csv`}
              columns={[
                { key: "product", label: "Producto" },
                { key: "revenue", label: "Facturación" },
                { key: "margin", label: "Margen" },
              ]}
              rows={topProductsExportRows}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={topProducts?.rows || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product__name" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend />
                  <Bar
                    dataKey={topBy}
                    name={topBy === "margin" ? "Margen" : "Facturación"}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {(topProducts?.rows || []).map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
                >
                  <div className="text-sm">{r.product__name || "—"}</div>
                  <div className="text-sm font-semibold">
                    {money(r[topBy] || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
