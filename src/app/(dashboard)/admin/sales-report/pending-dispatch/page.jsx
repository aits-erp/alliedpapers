"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PendingDispatchPage() {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [companyId, setCompanyId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login again");
      return;
    }

    const decoded = jwtDecode(token);

    if (!decoded.companyId) {
      alert("CompanyId missing in token");
      return;
    }

    setCompanyId(decoded.companyId);
    loadOrders(decoded.companyId);
  }, []);

  async function loadOrders(cid = companyId) {
    if (!cid) return;

    setLoading(true);

    const query = new URLSearchParams({
      companyId: cid,
      ...(from && { from }),
      ...(to && { to }),
    }).toString();

    const res = await fetch(`/api/reports/pending-dispatch?${query}`);
    const json = await res.json();

    setOrders(json.rawOrders || []);
    setSummary(json.data);
    setLoading(false);
  }

  /* ✅ EXPORT TO EXCEL */
  const exportToExcel = () => {
    if (!orders.length) return alert("No data to export");

    const ws = XLSX.utils.json_to_sheet(
      orders.map((o) => ({
        "Order Date": o.orderDate
          ? new Date(o.orderDate).toLocaleDateString()
          : "",
        "Order Number": o.salesNumber,
        "Customer Name": o.customerName,
        "Order Amount": o.grandTotal,
        Status: o.status,
        "Sales Stage": o.statusStages,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pending Dispatch");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), "Pending_Dispatch.xlsx");
  };

  /* ✅ EXPORT TO PDF */
  const exportToPDF = () => {
    if (!orders.length) return alert("No data to export");

    const doc = new jsPDF();

    doc.text("Pending SC For Dispatch", 14, 15);

    const tableData = orders.map((o) => [
      o.orderDate ? new Date(o.orderDate).toLocaleDateString() : "",
      o.salesNumber,
      o.customerName,
      `₹ ${o.grandTotal}`,
      o.status,
      o.statusStages,
    ]);

    autoTable(doc, {
      startY: 22,
      head: [[
        "Order Date",
        "Order Number",
        "Customer Name",
        "Order Amount",
        "Status",
        "Sales Stage",
      ]],
      body: tableData,
    });

    doc.save("Pending_Dispatch.pdf");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-bold animate-pulse">
          Loading Pending Dispatch...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            🚚 Pending SC For Dispatch
          </h1>
          <p className="text-gray-500">
            Company: <span className="font-semibold">{companyId}</span>
          </p>
        </div>

        <div className="flex gap-3 mt-4 sm:mt-0">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
          >
            📤 Export Excel
          </button>

          <button
            onClick={exportToPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-5 shadow-md rounded-xl mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <label className="text-sm font-semibold">From Date</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2 mt-1"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-semibold">To Date</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2 mt-1"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => loadOrders()}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            🔍 Apply Filter
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <SummaryBox label="Pending Orders" value={summary.totalPendingOrders} />
          <SummaryBox label="Total Quantity" value={summary.totalQty} />
          <SummaryBox label="Total Amount" value={`₹ ${summary.totalAmount}`} />
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white shadow-xl rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">
          📋 Pending Dispatch Orders
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-red-100">
              <tr>
                <th className="border p-2">Order Date</th>
                <th className="border p-2">Order Number</th>
                <th className="border p-2">Customer Name</th>
                <th className="border p-2">Order Amount</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Sales Stage</th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center p-6 text-gray-500">
                    No Pending Orders Found
                  </td>
                </tr>
              )}

              {orders.map((o, i) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="border p-2">
                    {o.orderDate
                      ? new Date(o.orderDate).toLocaleDateString()
                      : "-"}
                  </td>

                  <td className="border p-2 font-semibold text-blue-700">
                    {o.salesNumber}
                  </td>

                  <td className="border p-2">
                    {o.customerName}
                  </td>

                  <td className="border p-2 font-semibold">
                    ₹ {o.grandTotal}
                  </td>

                  <td className="border p-2 text-yellow-700 font-semibold">
                    {o.status || "Open"}
                  </td>

                  <td className="border p-2 text-indigo-700 font-semibold">
                    {o.statusStages || "Pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

function SummaryBox({ label, value }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <p className="text-gray-500 text-sm">{label}</p>
      <h2 className="text-2xl font-bold mt-2">{value}</h2>
    </div>
  );
}
