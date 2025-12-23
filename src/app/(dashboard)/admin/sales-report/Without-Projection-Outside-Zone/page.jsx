"use client";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  BarChart2,
  Search,
  Loader2,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const ZONE_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
];

export default function ProjectionVsActualPage() {
  const today = new Date();

  /* =======================
     STATE
  ======================= */
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("All");
  const [projectionMode, setProjectionMode] = useState("WITHOUT"); // WITH | WITHOUT

  const [report, setReport] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);

  /* =======================
     FETCH DATA
  ======================= */
  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `/api/reports/projection-vs-actual?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setReport(res.data.data || []);
        setZones([...new Set(res.data.data.map(r => r.zone).filter(Boolean))]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [year, month]);

  /* =======================
     FILTERED DATA
  ======================= */
  const filteredData = useMemo(() => {
    return report.filter(row => {
      const hasProjection = Number(row.projectedQty) > 0;
      const noProjection =
        row.projectedQty === null ||
        row.projectedQty === undefined ||
        Number(row.projectedQty) === 0;

      if (projectionMode === "WITH" && !hasProjection) return false;
      if (projectionMode === "WITHOUT" && !noProjection) return false;

      const matchesSearch =
        row.itemCode?.toLowerCase().includes(search.toLowerCase()) ||
        row.itemName?.toLowerCase().includes(search.toLowerCase());

      const matchesZone =
        zoneFilter === "All" || row.zone === zoneFilter;

      return matchesSearch && matchesZone;
    });
  }, [report, search, zoneFilter, projectionMode]);

  /* =======================
     ZONE WISE TOTAL ACTUAL QTY
  ======================= */
  const zoneTotals = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      const z = r.zone || "Unknown";
      map[z] = (map[z] || 0) + Number(r.actualQty || 0);
    });

    return Object.entries(map).map(([zone, qty]) => ({
      zone,
      qty,
    }));
  }, [filteredData]);

  /* =======================
     SUMMARY
  ======================= */
  const summary = useMemo(() => {
    const totalItems = filteredData.length;
    const totalProjected = filteredData.reduce(
      (s, r) => s + Number(r.projectedQty || 0), 0
    );
    const totalActual = filteredData.reduce(
      (s, r) => s + Number(r.actualQty || 0), 0
    );
    return { totalItems, totalProjected, totalActual };
  }, [filteredData]);

  /* =======================
     EXPORT EXCEL
  ======================= */
  const exportExcel = () => {
    if (!filteredData.length) return alert("No data to export");

    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projection Report");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), "Projection_Report.xlsx");
  };

  /* =======================
     EXPORT PDF
  ======================= */
  const exportPDF = () => {
    if (!filteredData.length) return alert("No data to export");

    const doc = new jsPDF("l");
    doc.setFontSize(14);
    doc.text(
      `Projection vs Actual (${projectionMode === "WITHOUT" ? "Without" : "With"} Projection)`,
      14,
      15
    );
    doc.setFontSize(10);
    doc.text(`Month: ${month} | Year: ${year}`, 14, 22);

    const rows = filteredData.map(r => [
      r.zone,
      r.itemCode,
      r.itemName,
      r.projectedQty || 0,
      r.actualQty || 0,
      (r.actualQty || 0) - (r.projectedQty || 0),
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["Zone","Item Code","Item Name","Projection","Actual","Variance"]],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`Projection_vs_Actual_${projectionMode}_${month}_${year}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="text-blue-600" />
            Projection vs Actual
          </h1>
          <p className="text-sm text-gray-500">
            {projectionMode === "WITHOUT"
              ? "Showing items without projection"
              : "Showing items with projection"}
          </p>
        </div>

        <div className="flex gap-2 bg-white p-2 rounded-xl border">
          <select value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(e.target.value)}>
            {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i)
              .map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 py-2 rounded-xl border"
            placeholder="Search Item..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="px-4 py-2 rounded-xl border"
          value={zoneFilter}
          onChange={e => setZoneFilter(e.target.value)}
        >
          <option value="All">All Zones</option>
          {zones.map(z => <option key={z}>{z}</option>)}
        </select>

        <select
          className="px-4 py-2 rounded-xl border"
          value={projectionMode}
          onChange={e => setProjectionMode(e.target.value)}
        >
          <option value="WITH">With Projection</option>
          <option value="WITHOUT">Without Projection</option>
        </select>

        <button
          onClick={exportExcel}
          className="flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl px-4"
        >
          <Download size={16} /> Excel
        </button>

        <button
          onClick={exportPDF}
          className="flex items-center justify-center gap-2 bg-red-600 text-white rounded-xl px-4"
        >
          📥 PDF
        </button>
      </div>

      {/* ZONE WISE TOTALS */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-3">📍 Zone-wise Total Actual Qty</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {zoneTotals.map((z, i) => (
            <div
              key={z.zone}
              onClick={() =>
                setZoneFilter(zoneFilter === z.zone ? "All" : z.zone)
              }
              className={`cursor-pointer text-white rounded-xl p-4 shadow-lg transition transform hover:scale-105
                ${ZONE_COLORS[i % ZONE_COLORS.length]}
                ${zoneFilter === z.zone ? "ring-4 ring-offset-2 ring-black" : ""}
              `}
            >
              <div className="text-sm opacity-80">Zone</div>
              <div className="text-xl font-bold truncate">{z.zone}</div>
              <div className="mt-3 text-2xl font-extrabold">
                {z.qty.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Click a zone card to filter the table
        </p>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Summary label="Items" value={summary.totalItems} />
        <Summary label="Projected Qty" value={summary.totalProjected} />
        {/* two decimal places */}
        <Summary label="Actual Qty"  value={Number(summary.totalActual || 0).toFixed(2)} />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 uppercase text-gray-500">
              <tr>
                <th className="p-4 text-left">Zone</th>
                <th className="p-4 text-left">Item</th>
                <th className="p-4 text-center">Projection</th>
                <th className="p-4 text-center">Actual</th>
                <th className="p-4 text-center">DIFFERENCE</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400">
                    No data found
                  </td>
                </tr>
              ) : filteredData.map((r, i) => (
                <tr
                  key={i}
                  className={`border-t ${
                    Number(r.projectedQty) === 0
                      ? "bg-red-50"
                      : "hover:bg-blue-50"
                  }`}
                >
                  <td className="p-4">{r.zone}</td>
                  <td className="p-4">
                    <div className="font-bold">{r.itemCode}</div>
                    <div className="text-xs text-gray-500">{r.itemName}</div>
                  </td>
                  <td className="p-4 text-center font-bold text-red-600">
                    {Number(r.projectedQty) || 0}
                  </td>
                  <td className="p-4 text-center">{r.actualQty}</td>
                  <td className="p-4 text-center font-bold">
                    {r.actualQty - (Number(r.projectedQty) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* =======================
   SUMMARY CARD
======================= */
function Summary({ label, value }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow border">
      <p className="text-sm text-gray-500">{label}</p>
      <h2 className="text-2xl font-bold mt-1">{value}</h2>
    </div>
  );
}
