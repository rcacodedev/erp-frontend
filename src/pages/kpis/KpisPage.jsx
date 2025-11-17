// --- FILE: src/pages/kpis/KpisPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import {
  apiGetYearlySummary,
  apiGetSalesTimeseries,
  apiGetExpensesTimeseries,
  apiGetReceivables,
  apiGetVatSummary,
  apiGetTopCustomers,
  apiGetQuotesVsInvoices,
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
} from "recharts";

export default function KpisPage() {
  const { org } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [yearlySummary, setYearlySummary] = useState(null);
  const [salesTimeseries, setSalesTimeseries] = useState(null);
  const [expensesTimeseries, setExpensesTimeseries] = useState(null);
  const [receivables, setReceivables] = useState(null);
  const [vatSummary, setVatSummary] = useState(null);
  const [topCustomers, setTopCustomers] = useState(null);
  const [quotesVsInvoices, setQuotesVsInvoices] = useState(null);

  // Filtro de periodo
  const [rangePreset, setRangePreset] = useState("current_year");

  useEffect(() => {
    if (!org?.slug) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const now = new Date();
    let paramsRange = {};

    if (rangePreset === "current_year") {
      const year = now.getFullYear();
      paramsRange = {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      };
    } else if (rangePreset === "last_year") {
      const year = now.getFullYear() - 1;
      paramsRange = {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      };
    } else if (rangePreset === "all") {
      paramsRange = {};
    }

    Promise.all([
      apiGetYearlySummary(org.slug, paramsRange),
      apiGetSalesTimeseries(org.slug, { ...paramsRange, group_by: "month" }),
      apiGetExpensesTimeseries(org.slug, {
        ...paramsRange,
        group_by: "month",
      }),
      apiGetReceivables(org.slug, paramsRange),
      apiGetVatSummary(org.slug, { ...paramsRange, group_by: "month" }),
      apiGetTopCustomers(org.slug, { ...paramsRange, limit: 5 }),
      apiGetQuotesVsInvoices(org.slug, paramsRange),
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
          if (!isMounted) return;

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
        console.error("Error cargando KPIs:", err);
        if (isMounted) {
          setError(err);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [org?.slug, rangePreset]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">KPIs</h1>
        <p className="text-sm text-gray-500">Cargando KPIs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">KPIs</h1>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold mb-1">Error al cargar los KPIs</p>
          <p>{error.message || "Error desconocido"}</p>
        </div>
      </div>
    );
  }

  // ========= Helpers =========
  const currency = receivables?.currency || "EUR";

  const toNumber = (value, fallback = 0) => {
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isNaN(n) ? fallback : n;
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(toNumber(value));

  const formatPercent = (value) => {
    const n = toNumber(value);
    return `${(n * 100).toFixed(1)} %`;
  };

  const yearlyTotals = yearlySummary?.totals || {};
  const totalIncome = toNumber(yearlyTotals.income_amount);
  const totalExpenses = toNumber(yearlyTotals.expenses_amount);
  const totalProfit = toNumber(yearlyTotals.profit_amount);

  const totalPending = toNumber(receivables?.total_pending);
  const totalVat = toNumber(vatSummary?.totals?.tax_amount);

  const conversionRatio = toNumber(quotesVsInvoices?.conversion_ratio);

  // === Serie Ingresos vs Gastos por periodo ===
  const buildIncomeExpenseSeries = () => {
    const map = new Map();

    const addItems = (items, key) => {
      if (!items || !Array.isArray(items)) return;
      items.forEach((item) => {
        const period =
          item.period || item.label || item.date || item.month || item.year;
        if (!period) return;

        const value = toNumber(
          item.amount ?? item.total ?? item.value ?? item.sum
        );

        const existing = map.get(period) || {
          period,
          income: 0,
          expenses: 0,
        };
        existing[key] = value;
        map.set(period, existing);
      });
    };

    addItems(salesTimeseries?.items, "income");
    addItems(expensesTimeseries?.items, "expenses");

    return Array.from(map.values()).sort((a, b) =>
      String(a.period).localeCompare(String(b.period))
    );
  };

  const incomeExpenseSeries = buildIncomeExpenseSeries();

  // === Datos Top clientes ===
  const topCustomersItems = Array.isArray(topCustomers?.items)
    ? topCustomers.items
    : [];

  const topCustomersChartData = topCustomersItems.map((c) => ({
    name: c.customer_name || `ID ${c.customer_id}`,
    totalBase:
      toNumber(c.total_base) ?? toNumber(c.totalBase) ?? toNumber(c.total) ?? 0,
    invoicesCount: c.invoices_count ?? c.invoicesCount ?? 0,
  }));

  // === Datos IVA por periodo ===
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

  // === Presupuestado vs facturado (totales) ===
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

  // ========= Render =========
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">KPIs</h1>
          <p className="text-sm text-gray-500">
            Panel de indicadores clave de tu organización (Fase F5B).
          </p>
        </div>

        {/* Filtros de periodo */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600">Periodo:</span>
          <select
            value={rangePreset}
            onChange={(e) => setRangePreset(e.target.value)}
            className="text-xs rounded-md border border-gray-300 bg-white px-2 py-1"
          >
            <option value="current_year">Año actual</option>
            <option value="last_year">Año anterior</option>
            <option value="all">Todo el histórico</option>
          </select>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            ({rangeLabel})
          </span>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Ingresos totales
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Gastos totales
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(totalExpenses)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Beneficio total
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(totalProfit)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Cobros pendientes
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(totalPending)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            IVA repercutido
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(totalVat)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Conversión presupuestos → facturas
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatPercent(conversionRatio)}
          </p>
        </div>
      </section>

      {/* Gráfica Ingresos vs Gastos */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">
          Ingresos vs Gastos por periodo
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Basado en las series temporales de ventas y gastos (agrupadas por
          periodo).
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
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Gastos"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-gray-500">
              No hay datos suficientes para mostrar la gráfica.
            </div>
          )}
        </div>
      </section>

      {/* Top clientes */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Top clientes</h2>
          <p className="text-xs text-gray-500">
            Clientes con mayor facturación (base).
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Gráfica barras */}
          <div className="h-64">
            {topCustomersChartData && topCustomersChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomersChartData} margin={{ top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "Facturado") {
                        return [formatCurrency(value), name];
                      }
                      if (name === "Facturas") {
                        return [value, name];
                      }
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="totalBase"
                    name="Facturado"
                    fill="#0ea5e9"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-500">
                No hay datos suficientes para mostrar el top de clientes.
              </div>
            )}
          </div>

          {/* Lista resumida */}
          <div className="space-y-2">
            {topCustomersItems && topCustomersItems.length > 0 ? (
              topCustomersItems.map((c) => (
                <div
                  key={c.customer_id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {c.customer_name || `ID ${c.customer_id}`}
                    </p>
                    <p className="text-xs text-gray-500">
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
              <p className="text-xs text-gray-500">
                Sin clientes destacados todavía.
              </p>
            )}
          </div>
        </div>

        {/* JSON bruto para debug (lo podemos quitar en Fase PULIR) */}
        <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
          {JSON.stringify(topCustomers, null, 2)}
        </pre>
      </section>

      {/* IVA por periodo */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">IVA repercutido por periodo</h2>
          <p className="text-xs text-gray-500">
            Base imponible e IVA de las facturas emitidas.
          </p>
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
                <Bar
                  dataKey="baseAmount"
                  name="Base"
                  fill="#4b5563"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="taxAmount"
                  name="IVA"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-gray-500">
              No hay datos suficientes para mostrar la evolución del IVA.
            </div>
          )}
        </div>

        <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
          {JSON.stringify(vatSummary, null, 2)}
        </pre>
      </section>

      {/* Presupuestado vs facturado */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Presupuestado vs facturado</h2>
          <p className="text-xs text-gray-500">
            Compara el total de base imponible presupuestada y facturada en el
            periodo seleccionado.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Totales */}
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Total presupuestado</p>
              <p className="text-lg font-semibold">
                {formatCurrency(quotesBaseTotal)}
              </p>
              <p className="text-[11px] text-gray-500">
                Nº presupuestos: {quotesCount}
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Total facturado</p>
              <p className="text-lg font-semibold">
                {formatCurrency(invoicesBaseTotal)}
              </p>
              <p className="text-[11px] text-gray-500">
                Nº facturas (desde presupuesto): {invoicesCount}
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">
                Conversión presupuestos → facturas
              </p>
              <p className="text-lg font-semibold">
                {formatPercent(conversionRatio)}
              </p>
            </div>
          </div>

          {/* Gráfica barras */}
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
                <Bar
                  dataKey="amount"
                  name="Importe"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
          {JSON.stringify(quotesVsInvoices, null, 2)}
        </pre>
      </section>

      {/* Resumen por año (JSON) */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Resumen por año</h2>
        <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
          {JSON.stringify(yearlySummary, null, 2)}
        </pre>
      </section>

      {/* Sales / Expenses JSON */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">
            Ventas (serie temporal)
          </h2>
          <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
            {JSON.stringify(salesTimeseries, null, 2)}
          </pre>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">
            Gastos (serie temporal)
          </h2>
          <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
            {JSON.stringify(expensesTimeseries, null, 2)}
          </pre>
        </div>
      </section>

      {/* Cobros pendientes JSON */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Cobros pendientes</h2>
        <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
          {JSON.stringify(receivables, null, 2)}
        </pre>
      </section>
    </div>
  );
}
