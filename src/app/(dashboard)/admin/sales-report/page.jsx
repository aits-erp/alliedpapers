"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import CountUp from "react-countup";

/**
 * Interactive Reports Dashboard — single-file
 * - Paste into ./src/app/(dashboard)/admin/sales-report/page.jsx
 * - Requires endpoints: /api/reports/avg-product-zone and /api/reports/sales
 */




// safe date helpers — add near the top, after imports
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(val, locale = "en-IN", options = {}) {
  const d = parseDate(val);
  if (!d) return "-";
  // default options: day-month-year short
  const opts = Object.keys(options).length ? options : { day: "2-digit", month: "short", year: "numeric" };
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

/* -------------------- Top-level Dashboard -------------------- */
export default function ReportsDashboard() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <HeaderTabs tab={tab} setTab={setTab} />
        <div className="mt-6">
          {tab === "overview" && <Overview />}
          {tab === "avg" && <AvgProductZonePage />}
          {tab === "sales" && <SalesReportPage />}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Header / Tabs -------------------- */
function HeaderTabs({ tab, setTab }) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">📊 Reports Dashboard</h1>
          <p className="text-sm text-slate-500">Zone-wise & Product-wise Sales / NSR — interactive charts</p>
        </div>

        <div className="flex items-center gap-2">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabButton>
          <TabButton active={tab === "avg"} onClick={() => setTab("avg")}>Avg Product / Zone</TabButton>
          <TabButton active={tab === "sales"} onClick={() => setTab("sales")}>Sales Reports</TabButton>
        </div>
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        active ? "bg-sky-600 text-white shadow" : "bg-white border text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

/* -------------------- Overview -------------------- */
function Overview() {
  // small overview that links to interactive Sales page via chart clicks
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [zoneAgg, setZoneAgg] = useState([]);
  const [kpis, setKpis] = useState({});

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) return;
    const d = jwtDecode(t);
    if (!d.companyId) return;
    setCompanyId(d.companyId);
    loadBoth(d.companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBoth(cid) {
    setLoading(true);
    try {
      const [avgRes, salesRes] = await Promise.all([
        fetch(`/api/reports/avg-product-zone?companyId=${cid}`).then(r => r.json()).catch(() => ({ records: [] })),
        fetch(`/api/reports/sales?companyId=${cid}`).then(r => r.json()).catch(() => ({ data: null })),
      ]);

      const records = avgRes?.records ?? [];
      const salesRows = (salesRes?.data?.salesRows) ?? [];

      const map = {};
      salesRows.forEach(r => {
        const zone = String(r.zone || "Unspecified");
        if (!map[zone]) map[zone] = { zone, totalQty: 0, totalNet: 0 };
        map[zone].totalQty += Number(r.qty || 0);
        map[zone].totalNet += Number(r.netAmount || 0);
      });

      if (Object.keys(map).length === 0 && records.length) {
        records.forEach(r => {
          const zone = String(r.zone || "Unspecified");
          if (!map[zone]) map[zone] = { zone, totalQty: 0, totalNet: 0 };
          map[zone].totalQty += Number(r.totalQty || 0);
          map[zone].totalNet += Number(r.totalNetAmount || 0);
        });
      }

      const agg = Object.values(map).sort((a,b) => b.totalNet - a.totalNet).slice(0,8);
      setZoneAgg(agg);

      setKpis({
        zones: new Set(records.map(x => x.zone)).size || new Set(salesRows.map(x => x.zone)).size,
        products: new Set(records.map(x => x.itemName)).size || new Set(salesRows.map(x => x.itemName)).size,
        totalOrders: salesRes?.data?.summaryOfOrders?.totalOrders ?? 0,
        avgNSR: salesRes?.data?.averageNSR?.overall ?? 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <CardShell><div className="py-8 text-center">Loading overview…</div></CardShell>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Zones" value={kpis.zones ?? 0} />
        <MetricCard title="Products" value={kpis.products ?? 0} />
        <MetricCard title="Total Orders" value={kpis.totalOrders ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CardShell>
          <h3 className="font-semibold mb-3">Top Zones by Amount</h3>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={zoneAgg}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="zone" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(v)=>`₹ ${Number(v).toFixed(2)}`} />
                <Bar dataKey="totalNet" fill="#06b6d4" onClick={(d) => {
                  window.dispatchEvent(new CustomEvent("reports.filter", { detail: { zone: d.zone } }));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 mt-2">Click a bar to filter Sales Report by that zone.</p>
        </CardShell>

        <CardShell>
          <h3 className="font-semibold mb-3">Stage Distribution</h3>
          <StagePieMini companyId={companyId} />
        </CardShell>

        <CardShell>
          <h3 className="font-semibold mb-3">Quick KPIs</h3>
          <div className="grid grid-cols-2 gap-3">
            <SmallBox label="Avg NSR" value={`₹ ${kpis.avgNSR ?? 0}`} />
            <SmallBox label="Orders" value={kpis.totalOrders ?? 0} />
            <SmallBox label="Zones" value={kpis.zones ?? 0} />
            <SmallBox label="Products" value={kpis.products ?? 0} />
          </div>
        </CardShell>
      </div>
    </div>
  );
}

/* tiny pie component for overview (fetches sales endpoint stages) */
function StagePieMini({ companyId }) {
  const [data, setData] = useState([]);
  const COLORS = ["#06b6d4", "#34d399", "#f97316", "#ef4444", "#8b5cf6", "#f59e0b"];

  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/reports/sales?companyId=${companyId}`).then(r => r.json()).then(json => {
      const stages = (json?.data?.salesStageReport) ?? [];
      setData(stages.map(s => ({ name: s.stage, value: s.totalAmount || s.totalOrders || 0 })));
    }).catch(()=>{});
  }, [companyId]);

  if (!data.length) return <div className="text-sm text-slate-500">No stage data</div>;

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={70} innerRadius={38} onClick={(d) => {
            window.dispatchEvent(new CustomEvent("reports.filter", { detail: { stage: d.name } }));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}>
            {data.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Legend verticalAlign="bottom" height={36} />
          <Tooltip formatter={(v)=>v} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 mt-2">Click a slice to filter sales by stage.</p>
    </div>
  );
}

/* -------------------- Avg Product / Zone page -------------------- */
function AvgProductZonePage() {
  const [companyId, setCompanyId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState({ summary: null, records: [] });
  const [loading, setLoading] = useState(false);
  const [productFilter, setProductFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [search, setSearch] = useState("");
  const [zonesState, setZonesState] = useState([]);
  const [productsState, setProductsState] = useState([]);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) return;
    const d = jwtDecode(t);
    if (!d.companyId) return;
    setCompanyId(d.companyId);
    loadAvg(d.companyId);
    // listen for global filter events (chart->page)
    const handler = (e) => {
      const { zone, product } = e.detail ?? {};
      if (zone) setZoneFilter(zone);
      if (product) setProductFilter(product);
    };
    window.addEventListener("reports.filter", handler);
    return () => window.removeEventListener("reports.filter", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAvg(cid = companyId) {
    if (!cid) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ companyId: cid, ...(from && { from }), ...(to && { to }) }).toString();
      const res = await fetch(`/api/reports/avg-product-zone?${q}`);
      const json = await res.json();
      const recs = Array.isArray(json.records) ? json.records : [];
      setData({ summary: json.summary ?? null, records: recs });

      const zs = Array.from(new Set(recs.map(r => String(r.zone || "").trim()).filter(Boolean))).sort();
      const ps = Array.from(new Set(recs.map(r => String(r.itemName || "").trim()).filter(Boolean))).sort();
      setZonesState(zs);
      setProductsState(ps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const recs = data.records || [];
    const prod = String(productFilter || "").trim().toLowerCase();
    const zone = String(zoneFilter || "").trim().toLowerCase();
    const q = String(search || "").trim().toLowerCase();
    return recs.filter(r => {
      const matchP = prod ? String(r.itemName || "").toLowerCase().includes(prod) : true;
      const matchZ = zone ? String(r.zone || "").toLowerCase() === zone : true;
      const matchQ = q ? ((String(r.itemName||"") + " " + String(r.zone||"") + " " + String(r.customerName||"")).toLowerCase().includes(q)) : true;
      return matchP && matchZ && matchQ;
    });
  }, [data.records, productFilter, zoneFilter, search]);

  const zones = zonesState.length ? zonesState : Array.from(new Set((data.records || []).map(r => String(r.zone || "").trim()).filter(Boolean))).sort();
  const products = productsState.length ? productsState : Array.from(new Set((data.records || []).map(r => String(r.itemName || "").trim()).filter(Boolean))).sort();

  function exportExcel() {
    if (!filtered.length) return alert("No data");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtered), "Avg_Product_Zone");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `avg_product_zone_${companyId || "company"}.xlsx`);
  }

  function exportPDF() {
    if (!filtered.length) return alert("No data");
    const doc = new jsPDF();
    doc.text("Avg Product Zone", 14, 20);
    const rows = filtered.map(r => [r.zone, r.itemName, r.totalQty, `₹ ${r.totalNetAmount}`, `₹ ${r.averageRate}`]);
    autoTable(doc, { startY: 30, head: [["Zone","Product","Qty","Net","Avg"]], body: rows });
    doc.save(`avg_product_zone_${companyId || "company"}.pdf`);
  }

  if (loading) return <CardShell><div className="py-8 text-center">Loading...</div></CardShell>;

  return (
    <div className="space-y-6">
      <CardShell>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500">From</label>
            <input value={from} onChange={e=>setFrom(e.target.value)} type="date" className="mt-1 w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="text-xs text-slate-500">To</label>
            <input value={to} onChange={e=>setTo(e.target.value)} type="date" className="mt-1 w-full border rounded px-3 py-2" />
          </div>

          <div className="flex gap-2 items-center">
            <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="border px-3 py-2 rounded w-full">
              <option value="">All Zones {zones.length ? `(${zones.length})` : ""}</option>
              {zones.length ? zones.map(z => <option key={z} value={z}>{z}</option>) : <option disabled>No zones</option>}
            </select>

            <select value={productFilter} onChange={e=>setProductFilter(e.target.value)} className="border px-3 py-2 rounded w-full">
              <option value="">All Products {products.length ? `(${products.length})` : ""}</option>
              {products.length ? products.map(p => <option key={p} value={p}>{p}</option>) : <option disabled>No products</option>}
            </select>

            <button onClick={()=>loadAvg(companyId)} className="bg-sky-600 text-white px-4 py-2 rounded ml-1">Apply</button>
          </div>
        </div>
      </CardShell>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 items-center">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product or zone..." className="border rounded px-3 py-2 w-64" />
          <button onClick={()=>{ setSearch(''); setProductFilter(''); setZoneFilter(''); }} className="border px-3 py-2 rounded">Clear</button>
        </div>

        <div className="flex gap-2">
          <button onClick={exportExcel} className="bg-emerald-600 text-white px-3 py-2 rounded">Excel</button>
          <button onClick={exportPDF} className="bg-rose-600 text-white px-3 py-2 rounded">PDF</button>
        </div>
      </div>

      {/* Add a product NSR bar chart (click -> filter) */}
      <CardShell>
        <h3 className="font-semibold mb-3">Product NSR (by product)</h3>
        <div style={{ width: "100%", height: 320 }}>
          <ProductNSRChart data={data.records} onProductClick={(p) => {
            setProductFilter(p);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }} />
        </div>
      </CardShell>
      
      <CardShell>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Zone</th>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-right">Total Qty</th>
                <th className="p-3 text-right">Net Amount</th>
                <th className="p-3 text-right">Avg Rate</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No data</td></tr>}
              {filtered.map((r,i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="p-3 max-w-xs truncate" title={r.zone}>{r.zone || "-"}</td>
                  <td className="p-3 max-w-xs truncate" title={r.itemName}>
                    <button title={`Filter by ${r.itemName}`} className="text-slate-700 hover:underline" onClick={() => { setProductFilter(r.itemName); }}>{r.itemName}</button>
                  </td>
                  <td className="p-3 text-right">{r.totalQty}</td>
                  <td className="p-3 text-right">₹ {Number(r.totalNetAmount || 0).toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold">₹ {Number(r.averageRate || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardShell>
    </div>
  );
}

/* Product NSR chart component */
function ProductNSRChart({ data = [], onProductClick }) {
  // aggregate by product
  const ag = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const map = {};
    data.forEach(r => {
      const p = r.itemName || "Unknown";
      if (!map[p]) map[p] = { product: p, qty: 0, net: 0 };
      map[p].qty += Number(r.totalQty || 0);
      map[p].net += Number(r.totalNetAmount || 0);
    });
    return Object.values(map).map(m => ({ ...m, avg: m.qty ? Number((m.net / m.qty).toFixed(2)) : 0 })).sort((a,b) => b.net - a.net).slice(0, 20);
  }, [data]);

  const COLORS = ["#06b6d4", "#34d399", "#f97316", "#ef4444", "#8b5cf6"];

  if (!ag.length) return <div className="text-slate-500">No product NSR data</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={ag} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="product" type="category" width={180} />
        <Tooltip formatter={(v)=>`₹ ${v}`} />
        <Bar dataKey="net" name="Net Amount" onClick={(d) => onProductClick && onProductClick(d.product)}>
          {ag.map((entry, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* -------------------- Sales Report page (zone-wise) -------------------- */
function SalesReportPage() {
  const [companyId, setCompanyId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState({ summaryOfOrders: {}, salesStageReport: [], salesRows: [], averageNSR: {} });
  const [loading, setLoading] = useState(false);
  const [zoneFilter, setZoneFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(null);
  const [zonesState, setZonesState] = useState([]);
  const [productsState, setProductsState] = useState([]);
  const [visibleSeries, setVisibleSeries] = useState({ zoneAmount: true, zoneQty: true, avgRate: true });

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) return;
    const d = jwtDecode(t);
    if (!d.companyId) return;
    setCompanyId(d.companyId);
    loadSales(d.companyId);

    // handle global chart filter events (overview -> this page)
    const handler = (e) => {
      const { zone, stage, product } = e.detail ?? {};
      if (zone) setZoneFilter(zone);
      if (stage) setStageFilter(stage);
      if (product) setProductFilter(product);
    };
    window.addEventListener("reports.filter", handler);

    return () => window.removeEventListener("reports.filter", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSales(cid = companyId) {
    if (!cid) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ companyId: cid, ...(from && { from }), ...(to && { to }) }).toString();
      const res = await fetch(`/api/reports/sales?${q}`);
      const json = await res.json();
      const payload = json.data ?? { summaryOfOrders: {}, salesStageReport: [], salesRows: [], averageNSR: {} };
      setData(payload);

      const zs = Array.from(new Set((payload.salesRows || []).map(r => String(r.zone || "").trim()).filter(Boolean))).sort();
      const ps = Array.from(new Set((payload.salesRows || []).map(r => String(r.itemName || "").trim()).filter(Boolean))).sort();
      setZonesState(zs);
      setProductsState(ps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const rows = data.salesRows || [];

  useEffect(() => {
    async function fallbackFill() {
      if ((zonesState && zonesState.length) || (productsState && productsState.length)) return;
      if (!companyId) return;
      try {
        const res = await fetch(`/api/reports/avg-product-zone?companyId=${companyId}`);
        const json = await res.json();
        const recs = json.records || [];
        const zs = Array.from(new Set(recs.map(r => String(r.zone || "").trim()).filter(Boolean))).sort();
        const ps = Array.from(new Set(recs.map(r => String(r.itemName || "").trim()).filter(Boolean))).sort();
        if (zs.length && !zonesState.length) setZonesState(zs);
        if (ps.length && !productsState.length) setProductsState(ps);
      } catch (e) {
        // ignore
      }
    }
    fallbackFill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const filtered = useMemo(() => {
    const z = String(zoneFilter || "").trim().toLowerCase();
    const p = String(productFilter || "").trim().toLowerCase();
    const q = String(search || "").trim().toLowerCase();
    const s = String(stageFilter || "").trim().toLowerCase();
    const d = dateFilter ? (new Date(dateFilter).toDateString()) : null;

    return (rows || []).filter(r => {
      const matchZ = z ? String(r.zone || "").toLowerCase() === z : true;
      const matchP = p ? String(r.itemName || "").toLowerCase().includes(p) : true;
      const matchQ = q ? ((String(r.customerName||"") + " " + String(r.itemName||"") + " " + String(r.stage||"")).toLowerCase().includes(q)) : true;
      const matchS = s ? String(r.stage || "").toLowerCase() === s : true;
      const matchD = d ? (new Date(r.orderDate || r.date || r.orderDate).toDateString() === d) : true;
      return matchZ && matchP && matchQ && matchS && matchD;
    });
  }, [rows, zoneFilter, productFilter, search, stageFilter, dateFilter]);

  // zone summary for chart
  const zoneSummary = useMemo(() => {
    const map = {};
    (rows || []).forEach(r => {
      const z = String(r.zone || "Unspecified");
      if (!map[z]) map[z] = { zone: z, qty: 0, amount: 0, orders: 0, sumRateQty: 0, sumFirstTime: 0, firstTimeCount: 0 };
      map[z].qty += Number(r.qty || 0);
      map[z].amount += Number(r.netAmount || 0);
      map[z].orders += 1;
      map[z].sumRateQty += (Number(r.averageRate || r.rate || 0) * Number(r.qty || 0));
      const firstN = Number(r.firstTimeNSR ?? r.initialNSR ?? r.firstNsr ?? 0);
      if (firstN > 0) { map[z].sumFirstTime += firstN; map[z].firstTimeCount += 1; }
    });
    return Object.values(map).map(m => ({ ...m, avgRate: m.qty ? Number((m.sumRateQty / m.qty).toFixed(2)) : 0, avgFirstTimeNSR: m.firstTimeCount ? Number((m.sumFirstTime / m.firstTimeCount).toFixed(2)) : 0 })).sort((a,b)=> b.amount - a.amount);
  }, [rows]);

  // orders over time (date series)
  const dateSeries = useMemo(() => {
    const map = {};
    (rows || []).forEach(r => {
      const d = r.orderDate ? new Date(r.orderDate) : (r.date ? new Date(r.date) : null);
      if (!d || isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0,10);
      if (!map[key]) map[key] = { date: key, orders: 0, amount: 0 };
      map[key].orders += 1;
      map[key].amount += Number(r.netAmount || 0);
    });
    return Object.values(map).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [rows]);

  function exportExcel() {
    if (!rows.length) return alert("No data");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Total Orders", data.summaryOfOrders?.totalOrders ?? 0],
      ["Dispatched", data.summaryOfOrders?.totalDispatchedOrders ?? 0],
      ["Pending", data.summaryOfOrders?.totalPendingDispatchOrders ?? 0],
      ["Total Qty", data.summaryOfOrders?.totalQty ?? 0],
      ["Total Amount", data.summaryOfOrders?.totalAmount ?? 0],
      ["Average NSR", data.averageNSR?.overall ?? 0],
    ]), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.salesStageReport || []), "Sales Stages");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtered.map(r => ({ zone: r.zone, customer: r.customerName, product: r.itemName, qty: r.qty, net: r.netAmount, avgRate: r.averageRate, firstTimeNSR: r.firstTimeNSR ?? r.initialNSR ?? r.firstNsr ?? "-" }))), "Sales Rows");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `sales_zone_${companyId || "company"}.xlsx`);
  }

  function exportPDF() {
    if (!rows.length) return alert("No data");
    const doc = new jsPDF();
    doc.text(`Sales Report - Zones (${companyId || "company"})`, 14, 20);
    const rowsPdf = filtered.map(r => [r.zone||"-", r.customerName||"-", r.itemName||"-", r.qty||0, `₹ ${r.netAmount||0}`, r.stage||"-", r.orderDate||"-", r.firstTimeNSR ?? r.initialNSR ?? r.firstNsr ?? "-"]);
    autoTable(doc, { startY: 30, head: [["Zone","Customer","Product","Qty","Net","Stage","Date","FirstTime NSR"]], body: rowsPdf, styles: { fontSize: 9 } });
    doc.save(`sales_zone_${companyId || "company"}.pdf`);
  }

  if (loading) return <CardShell><div className="py-8 text-center">Loading sales...</div></CardShell>;

  const zones = zonesState.length ? zonesState : Array.from(new Set(rows.map(r => String(r.zone || "").trim()).filter(Boolean))).sort();
  const products = productsState.length ? productsState : Array.from(new Set(rows.map(r => String(r.itemName || "").trim()).filter(Boolean))).sort();

  return (
    <div className="space-y-6">
      <CardShell>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500">From</label>
            <input value={from} onChange={e=>setFrom(e.target.value)} type="date" className="mt-1 w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="text-xs text-slate-500">To</label>
            <input value={to} onChange={e=>setTo(e.target.value)} type="date" className="mt-1 w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="text-xs text-slate-500">Zone</label>
            <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
              <option value="">All Zones {zones.length ? `(${zones.length})` : ""}</option>
              {zones.length ? zones.map(z => <option key={z} value={z}>{z}</option>) : <option disabled>No zones</option>}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500">Product</label>
            <select value={productFilter} onChange={e=>setProductFilter(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
              <option value="">All Products {products.length ? `(${products.length})` : ""}</option>
              {products.length ? products.map(p => <option key={p} value={p}>{p}</option>) : <option disabled>No products</option>}
            </select>
          </div>
        </div>

        <div className="mt-3 flex gap-2 items-center">
          <input className="flex-1 border rounded px-3 py-2" placeholder="Search customer/product/stage..." value={search} onChange={e=>setSearch(e.target.value)} />
          <button onClick={()=>loadSales(companyId)} className="bg-sky-600 text-white px-4 py-2 rounded">Apply</button>
          <button onClick={()=>{ setFrom(''); setTo(''); setZoneFilter(''); setProductFilter(''); setSearch(''); setStageFilter(''); setDateFilter(null); loadSales(companyId); }} className="border px-4 py-2 rounded">Reset</button>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-slate-600 mr-2">Series:</label>
            {["zoneAmount","zoneQty","avgRate"].map(k => (
              <button key={k} onClick={() => setVisibleSeries(v => ({ ...v, [k]: !v[k] }))} className={`px-3 py-1 rounded text-sm ${visibleSeries[k] ? "bg-slate-800 text-white" : "bg-white border"}`}>
                {k === "zoneAmount" ? "Amount" : k === "zoneQty" ? "Qty" : "AvgRate"}
              </button>
            ))}
          </div>
        </div>
      </CardShell>

  {/* Interactive charts row */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  {/* 1) Zone Amount (Bar) */}
  <CardShell>
    <h3 className="font-semibold mb-2">Zone Amount (click to filter)</h3>
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={zoneSummary}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="zone" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip formatter={(v) => (typeof v === "number" ? `₹ ${Number(v).toFixed(2)}` : v)} />
          {visibleSeries.zoneAmount && (
            <Bar
              dataKey="amount"
              fill="#06b6d4"
              onClick={(payload, index) => {
                // payload shape may vary; try payload.zone or payload.payload.zone
                const zone = payload?.zone ?? payload?.payload?.zone ?? null;
                if (zone) setZoneFilter(zone);
              }}
            />
          )}
          {visibleSeries.zoneQty && (
            <Bar
              dataKey="qty"
              fill="#34d399"
              onClick={(payload) => {
                const zone = payload?.zone ?? payload?.payload?.zone ?? null;
                if (zone) setZoneFilter(zone);
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </CardShell>

 {/* =========================== */}
{/*   FULL WIDTH ZONE SUMMARY   */}
{/* =========================== */}
<CardShell className="mt-6">
  <h2 className="text-xl font-bold mb-4">📊 Zone Summary</h2>

  {!zoneSummary || zoneSummary.length === 0 ? (
    <div className="p-6 text-center text-slate-500">No zone data available</div>
  ) : (
    <>
      {/* Only PIE (no line chart) */}
      <div className="bg-white rounded-xl p-4 shadow mb-6">
        <h3 className="font-semibold mb-3">Zone Amount Share</h3>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={zoneSummary.slice(0, 10)}
                dataKey="amount"
                nameKey="zone"
                outerRadius="85%"
                innerRadius="45%"
                paddingAngle={2}
                onClick={(entry) => {
                  const zone = entry?.name ?? entry?.payload?.zone;
                  if (zone) setZoneFilter(zone);
                }}
              >
                {zoneSummary.slice(0, 10).map((entry, i) => (
                  <Cell
                    key={i}
                    fill={[
                      "#06b6d4", "#34d399", "#f97316", "#ef4444",
                      "#8b5cf6", "#f59e0b", "#60a5fa", "#7c3aed",
                      "#0ea5e9", "#16a34a"
                    ][i % 10]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `₹ ${Number(v).toFixed(2)}`} />
              <Legend verticalAlign="bottom" height={40} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-slate-500 mt-2">
          Click a slice to filter the table by that zone.
        </p>
      </div>

      {/* Top zone list */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">Top Performing Zones</h3>

        {zoneSummary.slice(0, 8).map((z, i) => (
          <div key={i} className="flex justify-between border-b last:border-0 py-2">
            <div className="text-sm truncate max-w-[180px]" title={z.zone}>{z.zone}</div>
            <div className="font-semibold text-slate-700">
              ₹ {Number(z.amount || 0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </>
  )}
</CardShell>



  {/* 3) Orders Over Time (Line) */}
  <CardShell>
    <h3 className="font-semibold mb-2">Orders Over Time (click date)</h3>
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={dateSeries}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis />
          <Tooltip formatter={(v) => `₹ ${Number(v).toFixed(2)}`} />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 3 }}
            onClick={(point) => {
              // try multiple possible shapes
              const date = point?.payload?.date ?? point?.activeLabel ?? null;
              if (date) setDateFilter(date);
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <p className="text-xs text-slate-500 mt-2">Click a point to filter table by that date.</p>
  </CardShell>
</div>
   <div className="grid grid-cols-1  gap-4">
        <div className="lg:col-span-2">
          <CardShell>
            <h3 className="font-semibold mb-3">Sales Rows (filtered)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Zone</th>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Net</th>
                    <th className="p-3 text-left">Stage</th>
                    
                    <th className="p-3 text-center">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500">No rows</td></tr>}
                  {filtered.map((r,i) => (
                    <tr key={i} className="border-b hover:bg-slate-50">
                      <td className="p-2">{formatDate(r.orderDate ?? r.date, "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</td>

                     
                      <td className="p-2 max-w-xs truncate" title={r.zone}>{r.zone || "-"}</td>
                      <td className="p-2 max-w-xs truncate" title={r.customerName}>{r.customerName || r.customerId || "-"}</td>
                      <td className="p-2 max-w-xs truncate" title={r.itemName}>{r.itemName || "-"}</td>
                      <td className="p-2 text-right">{r.qty ?? 0}</td>
                      <td className="p-2 text-right">₹ {Number(r.netAmount || 0).toFixed(2)}</td>
                      <td className="p-2">{r.stage || "-"}</td>
                      
                      <td className="p-2 text-center" style={{ width: 140 }}>
                        <div style={{ width: 120, height: 40 }}>
                          <ResponsiveContainer width="100%" height={40}>
                            <LineChart data={(r.nsrHistory || []).length ? r.nsrHistory.map(v => ({ v })) : [{ v: r.averageRate || 0 }, { v: r.averageRate || 0 }, { v: r.averageRate || 0 }]}>
                              <Line type="monotone" dataKey="v" dot={false} stroke="#06b6d4" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardShell>
        </div>

      </div>

      {/* NSR LINE CHART (Product NSR Trend) */}
      <div className="bg-white p-6 shadow-xl rounded-xl mb-10">
        <h2 className="text-xl font-bold mb-4">📈 Product NSR Trend</h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.averageNSR?.byProduct || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="itemName" />
            <YAxis />
            <Tooltip formatter={(v)=>`₹ ${Number(v).toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="nsrPerUnit" stroke="#6366f1" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      

      {/* NSR Summary (Average NSR and by-product table) */}
      <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-2">📌 Average NSR</h2>

        <div className="text-4xl font-bold text-blue-600 mb-6">
          ₹ {Number(data?.averageNSR?.overall ?? 0).toFixed(2)}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Item Name</th>
                <th className="p-2 border">Total Qty</th>
                <th className="p-2 border">Net Amount</th>
                <th className="p-2 border">NSR / Unit</th>
              </tr>
            </thead>
            <tbody>
              {(data?.averageNSR?.byProduct || []).map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-2 border">{p.itemName}</td>
                  <td className="p-2 border">{p.totalQty}</td>
                  <td className="p-2 border">₹ {Number(p.totalNetAmount || 0).toFixed(2)}</td>
                  <td className="p-2 border font-semibold text-blue-700">₹ {Number(p.nsrPerUnit || p.avg || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

   

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          
      

          </div>
        </div>

      <div className="flex justify-end gap-3">
        <button onClick={exportExcel} className="bg-emerald-600 text-white px-4 py-2 rounded">Export Excel</button>
        <button onClick={exportPDF} className="bg-rose-600 text-white px-4 py-2 rounded">Export PDF</button>
      </div>
    </div>
  );
}

/* -------------------- UI helpers -------------------- */
function CardShell({ children }) {
  return <div className="bg-white rounded-2xl p-4 shadow-sm border overflow-hidden">{children}</div>;
}

function MetricCard({ title, value, suffix = "" }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between">
      <div>
        <div className="text-xs text-slate-500">{title}</div>
        <div className="text-2xl font-bold">
          {typeof value === "number" ? <CountUp end={value} duration={1.1} separator="," /> : value}{" "}
          <span className="text-sm text-slate-500">{suffix}</span>
        </div>
      </div>
      <div className="text-3xl opacity-80">📈</div>
    </div>
  );
}

function SmallBox({ label, value }) {
  return (
    <div className="bg-slate-50 p-3 rounded-lg border">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}





// "use client";

// import { useEffect, useState } from "react";
// import { jwtDecode } from "jwt-decode";
// import { useRouter } from "next/navigation";
// import CountUp from "react-countup";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   CartesianGrid,
//   LineChart,
//   Line,
//   Legend,
// } from "recharts";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";

// export default function SalesReportsPage() {
//   const [data, setData] = useState(null);
//   const [companyId, setCompanyId] = useState("");
//   const [from, setFrom] = useState("");
//   const [to, setTo] = useState("");
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const token = localStorage.getItem("token");

//     if (!token) {
//       alert("Please login again");
//       return;
//     }

//     const decoded = jwtDecode(token);

//     if (!decoded.companyId) {
//       alert("CompanyId missing in token");
//       return;
//     }

//     setCompanyId(decoded.companyId);
//     loadReports(decoded.companyId);
//   }, []);

//   async function loadReports(cid = companyId) {
//     if (!cid) return;

//     setLoading(true);

//     const query = new URLSearchParams({
//       companyId: cid,
//       ...(from && { from }),
//       ...(to && { to }),
//     }).toString();

//     const res = await fetch(`/api/reports/sales?${query}`);
//     const json = await res.json();

//     setData(json.data);
//     setLoading(false);
//   }

//   /* ✅ EXPORT TO EXCEL */
//   const exportToExcel = () => {
//     if (!data) return;

//     const wb = XLSX.utils.book_new();

//     // Summary Sheet
//     const summary = [
//       ["Total Orders", data.summaryOfOrders.totalOrders],
//       ["Dispatched Orders", data.summaryOfOrders.totalDispatchedOrders],
//       ["Pending Orders", data.summaryOfOrders.totalPendingDispatchOrders],
//       ["Total Quantity", data.summaryOfOrders.totalQty],
//       ["Total Amount", data.summaryOfOrders.totalAmount],
//       ["Average NSR", data.averageNSR.overall],
//     ];
//     const ws1 = XLSX.utils.aoa_to_sheet(summary);
//     XLSX.utils.book_append_sheet(wb, ws1, "Summary");

//     // Stage Report Sheet
//     const ws2 = XLSX.utils.json_to_sheet(data.salesStageReport);
//     XLSX.utils.book_append_sheet(wb, ws2, "Sales Stages");

//     // NSR Product Sheet
//     const ws3 = XLSX.utils.json_to_sheet(data.averageNSR.byProduct);
//     XLSX.utils.book_append_sheet(wb, ws3, "Product NSR");

//     const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
//     saveAs(new Blob([buf]), "Sales_Report.xlsx");
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-xl font-bold animate-pulse">
//           Loading Reports...
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">

//       {/* HEADER */}
//       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-800">
//             📊 Sales Reports Dashboard
//           </h1>
//           <p className="text-gray-500">
//             Company: <span className="font-semibold">{companyId}</span>
//           </p>
//         </div>

//         <button
//           onClick={exportToExcel}
//           className="mt-4 sm:mt-0 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
//         >
//           📤 Export to Excel
//         </button>
//       </div>

//       {/* FILTERS */}
//       <div className="bg-white p-5 shadow-md rounded-xl mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
//         <div>
//           <label className="text-sm font-semibold">From Date</label>
//           <input
//             type="date"
//             className="w-full border rounded px-3 py-2 mt-1"
//             value={from}
//             onChange={(e) => setFrom(e.target.value)}
//           />
//         </div>

//         <div>
//           <label className="text-sm font-semibold">To Date</label>
//           <input
//             type="date"
//             className="w-full border rounded px-3 py-2 mt-1"
//             value={to}
//             onChange={(e) => setTo(e.target.value)}
//           />
//         </div>

//         <div className="flex items-end">
//           <button
//             onClick={() => loadReports()}
//             className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
//           >
//             🔍 Apply Filter
//           </button>
//         </div>
//       </div>

//       {data && (
//         <>
//           {/* SUMMARY CARDS */}
//           <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
//             <Card title="Total Orders" value={data.summaryOfOrders.totalOrders} />
//             <Card title="Dispatched" value={data.summaryOfOrders.totalDispatchedOrders} />
//             <Card title="Pending" value={data.summaryOfOrders.totalPendingDispatchOrders} />
//             <Card title="Total Qty" value={data.summaryOfOrders.totalQty} />
//             <Card title="Total Amount" value={`₹ ${data.summaryOfOrders.totalAmount}`} />
//             <Card title="Avg NSR" value={`₹ ${data.averageNSR.overall}`} />
//           </div>

//           {/* SALES STAGE BAR CHART */}
//           <div className="bg-white p-6 shadow-xl rounded-xl mb-10">
//             <h2 className="text-xl font-bold mb-4">
//               📊 Sales Stage Overview
//             </h2>

//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={data.salesStageReport}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="stage" />
//                 <YAxis />
//                 <Tooltip />
//                 <Legend />
//                 <Bar dataKey="totalOrders" fill="#3b82f6" />
//                 <Bar dataKey="totalAmount" fill="#22c55e" />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           {/* NSR LINE CHART */}
//           <div className="bg-white p-6 shadow-xl rounded-xl mb-10">
//             <h2 className="text-xl font-bold mb-4">
//               📈 Product NSR Trend
//             </h2>

//             <ResponsiveContainer width="100%" height={300}>
//               <LineChart data={data.averageNSR.byProduct}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="itemName" />
//                 <YAxis />
//                 <Tooltip />
//                 <Legend />
//                 <Line type="monotone" dataKey="nsrPerUnit" stroke="#6366f1" strokeWidth={3} />
//               </LineChart>
//             </ResponsiveContainer>
//           </div>


//      {/* NSR */}
//           <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
//             <h2 className="text-xl font-semibold mb-2">
//               📌 Average NSR
//             </h2>

//             <div className="text-4xl font-bold text-blue-600 mb-6">
//               ₹ {data?.averageNSR?.overall?.toFixed(2)}
//             </div>

//             <div className="overflow-x-auto">
//               <table className="w-full text-sm border">
//                 <thead className="bg-gray-100">
//                   <tr>
//                     <th className="p-2 border">Item Name</th>
//                     <th className="p-2 border">Total Qty</th>
//                     <th className="p-2 border">Net Amount</th>
//                     <th className="p-2 border">NSR / Unit</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {data?.averageNSR?.byProduct?.map((p, i) => (
//                     <tr key={i} className="hover:bg-gray-50">
//                       <td className="p-2 border">{p.itemName}</td>
//                       <td className="p-2 border">{p.totalQty}</td>
//                       <td className="p-2 border">₹ {p.totalNetAmount}</td>
//                       <td className="p-2 border font-semibold text-blue-700">
//                         ₹ {p.nsrPerUnit.toFixed(2)}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* SALES STAGE TABLE */}
          
//         </>
//       )}
//     </div>
//   );
// }

// /* CARD */


// /* ✅ INTERACTIVE CARD */
// function Card({ title, value, icon = "📊", onClick, href, color = "blue" }) {
//   const router = useRouter();

//   const colorMap = {
//     blue: "from-blue-500 to-blue-700",
//     green: "from-green-500 to-green-700",
//     red: "from-red-500 to-red-700",
//     purple: "from-purple-500 to-purple-700",
//     yellow: "from-yellow-400 to-yellow-600",
//   };

//   const handleClick = () => {
//     if (onClick) onClick();
//     if (href) router.push(href);
//   };

//   return (
//     <div
//       onClick={handleClick}
//       className="group cursor-pointer bg-white rounded-2xl p-5 shadow-md hover:shadow-2xl 
//       transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden"
//     >
//       {/* Gradient stripe */}
//       <div
//         className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colorMap[color]}`}
//       />

//       <div className="flex items-center justify-between">
//         <p className="text-gray-500 text-sm font-semibold">{title}</p>

//         <div className="text-2xl p-2 bg-gray-100 rounded-full
//         group-hover:bg-opacity-80 transition-all">
//           {icon}
//         </div>
//       </div>

//       <h2 className="text-3xl font-extrabold mt-3 transition-all group-hover:text-blue-600">
//         {typeof value === "number" ? (
//           <CountUp end={value} duration={1.5} separator="," />
//         ) : (
//           value
//         )}
//       </h2>

//       <p className="text-xs mt-1 text-gray-400 group-hover:text-gray-600">
//         Click for details →
//       </p>
//     </div>
//   );
// }













