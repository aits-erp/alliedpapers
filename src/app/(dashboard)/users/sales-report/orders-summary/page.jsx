"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function OrdersSummaryPage() {
  const [orders, setOrders] = useState([]);
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

    const res = await fetch(`/api/reports/order-summary?${query}`);
    const json = await res.json();

    setOrders(json.rawOrders || []);
    setLoading(false);
  }

  /* ✅ EXPORT TO EXCEL */
  const exportToExcel = () => {
    if (!orders.length) return alert("No orders to export");

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
    XLSX.utils.book_append_sheet(wb, ws, "Orders");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), "Orders_Summary.xlsx");
  };

  /* ✅ EXPORT TO PDF */
  const exportToPDF = () => {
    if (!orders.length) return alert("No orders to export");

    const doc = new jsPDF();

    doc.text("Summary of Orders Received & Dispatched", 14, 15);

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

    doc.save("Orders_Summary.pdf");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-bold animate-pulse">
          Loading Orders...
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
            📦 Summary of Orders Received & Dispatched
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

      {/* TABLE */}
      <div className="bg-white shadow-xl rounded-xl p-6">

        <h2 className="text-xl font-bold mb-4">
          📋 Orders Table
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-indigo-100">
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
                    No Orders Found
                  </td>
                </tr>
              )}

              {orders.map((o, i) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="border p-2">
                    {o.orderDate
                      ? new Date(o.orderDate).toLocaleDateString("en-IN")
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

                  {/* ✅ STATUS LIKE YOUR STYLE */}
                  <td className="border p-2">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full
                        ${
                          o.status?.toLowerCase() === "open"
                            ? "bg-yellow-100 text-yellow-700"
                            : o.status?.toLowerCase() === "dispatched"
                            ? "bg-blue-100 text-blue-700"
                            : o.status?.toLowerCase() === "delivered"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {o.status}
                    </span>
                  </td>

                  {/* ✅ SALES STAGE LIKE YOUR STYLE */}
                  <td className="border p-2">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full
                        ${
                          o.statusStages?.toLowerCase().includes("dispatch")
                            ? "bg-indigo-100 text-indigo-700"
                            : o.statusStages?.toLowerCase().includes("production")
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                    >
                      {o.statusStages || "N/A"}
                    </span>
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
