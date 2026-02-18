"use client";

import { useEffect, useState, useMemo } from "react";
import { jwtDecode } from "jwt-decode";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AvgProductZoneRatePage() {
  const [data, setData] = useState(null);
  const [companyId, setCompanyId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Load token & companyId
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login again");
      return;
    }

    const decoded = jwtDecode(token);

    if (!decoded.companyId) {
      alert("CompanyId missing");
      return;
    }

    setCompanyId(decoded.companyId);
    loadReport(decoded.companyId);
  }, []);

  // ✅ Call API
  async function loadReport(cid = companyId) {
    if (!cid) return;
    setLoading(true);

    const query = new URLSearchParams({
      companyId: cid,
      ...(from && { from }),
      ...(to && { to }),
    }).toString();

    const res = await fetch(`/api/reports/avg-product-zone?${query}`);
    const json = await res.json();

    setData(json);
    setLoading(false);
  }

  // ✅ Filter by Product & Zone (frontend)
  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];

    return data.records.filter((r) => {
      const matchProduct = r.itemName
        ?.toLowerCase()
        .includes(productFilter.trim().toLowerCase());

      const matchZone = r.zone
        ?.toLowerCase()
        .includes(zoneFilter.trim().toLowerCase());

      return matchProduct && matchZone;
    });
  }, [data, productFilter, zoneFilter]);

  /* ✅ EXPORT TO EXCEL */
  const exportToExcel = () => {
    if (!filteredRecords.length) {
      alert("No data to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(filteredRecords);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Avg Rate - Product Zone");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), "Average_Product_Zone_Rate.xlsx");
  };

  /* ✅ EXPORT TO PDF */
  const exportToPDF = () => {
    if (!filteredRecords.length) {
      alert("No data to export");
      return;
    }

    const doc = new jsPDF();
    doc.text("Average Rate - Product wise, Zone wise", 14, 15);

    const rows = filteredRecords.map((r) => [
      r.zone,
      r.itemName,
      r.totalQty,
      `₹ ${r.totalNetAmount}`,
      `₹ ${r.averageRate}`,
    ]);

    autoTable(doc, {
      startY: 22,
      head: [["Zone", "Product", "Total Qty", "Net Amount", "Avg Rate"]],
      body: rows,
    });

    doc.save("Average_Product_Zone_Rate.pdf");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-xl font-bold animate-pulse">
        Loading Report...
      </div>
    );
  }

  // ✅ Summary based on filtered data (not full)
  const totalZones = new Set(filteredRecords.map((r) => r.zone)).size;
  const totalProducts = new Set(filteredRecords.map((r) => r.itemName)).size;
  const sumQty = filteredRecords.reduce((s, r) => s + r.totalQty, 0);
  const sumNet = filteredRecords.reduce(
    (s, r) => s + r.totalNetAmount,
    0
  );
  const avgRate =
    sumQty > 0 ? (sumNet / sumQty).toFixed(2) : 0;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            📊 Average Rate – Product & Zone Wise
          </h1>
          <p className="text-gray-500">
            Company: <b>{companyId}</b>
          </p>
        </div>

        <div className="flex gap-3 mt-4 sm:mt-0">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export Excel
          </button>

          <button
            onClick={exportToPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 grid grid-cols-1 sm:grid-cols-5 gap-4">

        <div>
          <label className="text-sm font-semibold">From</label>
          <input
            type="date"
            className="w-full border px-3 py-2 rounded"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-semibold">To</label>
          <input
            type="date"
            className="w-full border px-3 py-2 rounded"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Product Name</label>
          <input
            type="text"
            placeholder="Search product..."
            className="w-full border px-3 py-2 rounded"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Zone</label>
          <input
            type="text"
            placeholder="Search zone..."
            className="w-full border px-3 py-2 rounded"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => loadReport()}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Zones" value={totalZones} />
          <SummaryCard label="Products" value={totalProducts} />
          <SummaryCard label="Net Amount" value={`₹ ${sumNet.toFixed(2)}`} />
          <SummaryCard label="Avg Rate" value={`₹ ${avgRate}`} />
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">
          📋 Product & Zone wise Rate
        </h2>

        <table className="w-full border text-sm">
          <thead className="bg-green-100">
            <tr>
              <th className="border p-2">Zone</th>
              <th className="border p-2">Product</th>
              <th className="border p-2">Total Qty</th>
              <th className="border p-2">Net Amount</th>
              <th className="border p-2">Avg Rate</th>
            </tr>
          </thead>

          <tbody>
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center p-6 text-gray-500">
                  No data found
                </td>
              </tr>
            )}

            {filteredRecords.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="border p-2 font-semibold">{r.zone}</td>
                <td className="border p-2">{r.itemName}</td>
                <td className="border p-2">{r.totalQty}</td>
                <td className="border p-2">₹ {r.totalNetAmount}</td>
                <td className="border p-2 font-semibold text-blue-600">
                  ₹ {r.averageRate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-gray-500 text-sm">{label}</p>
      <h2 className="text-2xl font-bold mt-1">{value}</h2>
    </div>
  );
}
