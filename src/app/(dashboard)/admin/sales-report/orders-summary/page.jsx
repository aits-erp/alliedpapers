"use client";

import { useEffect, useState, useMemo } from "react";
import { jwtDecode } from "jwt-decode";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* 🎨 COLORS FOR CHARTS */
const COLORS = [
  "#2563EB", "#16A34A", "#EA580C", "#7C3AED",
  "#0891B2", "#DB2777", "#CA8A04", "#0D9488",
];

export default function OrdersSummaryPage() {
  const [orders, setOrders] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [zone, setZone] = useState("ALL");
  const [loading, setLoading] = useState(false);

  /* ================= HELPERS ================= */
  const num = (v) => Number(v ?? 0);
  const fmtQty = (v) => num(v).toFixed(2);
  const fmtAmt = (v) =>
    num(v).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  /* ================= LOAD ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Login again");

    const decoded = jwtDecode(token);
    setCompanyId(decoded.companyId);
    loadOrders(decoded.companyId);
  }, []);

  async function loadOrders(cid) {
    setLoading(true);
    const q = new URLSearchParams({
      companyId: cid,
      ...(from && { from }),
      ...(to && { to }),
    }).toString();

    const res = await fetch(`/api/reports/order-summary?${q}`);
    const json = await res.json();
    setOrders(json.rawOrders || []);
    setLoading(false);
  }

  /* ================= FILTER ================= */
  const filteredOrders =
    zone === "ALL"
      ? orders
      : orders.filter(o => (o.zone || "Unknown") === zone);

  /* ================= SUMMARY ================= */
  const summary = useMemo(() => {
    let totalOrders = 0,
      dispatched = 0,
      pending = 0,
      qty = 0,
      nsr = 0;

    for (const o of filteredOrders) {
      totalOrders++;
      qty += num(o.qty);
      nsr += num(o.grandTotal);

      o.statusStages?.toLowerCase().includes("dispatch")
        ? dispatched++
        : pending++;
    }

    return { totalOrders, dispatched, pending, qty, nsr };
  }, [filteredOrders]);

  /* ================= ZONE SUMMARY ================= */
  const zoneSummary = useMemo(() => {
    const z = {};
    for (const o of orders) {
      const zone = o.zone || "Unknown";
      if (!z[zone]) {
        z[zone] = { orders: 0, qty: 0, nsr: 0 };
      }
      z[zone].orders++;
      z[zone].qty += num(o.qty);
      z[zone].nsr += num(o.grandTotal);
    }
    return z;
  }, [orders]);

  const zones = ["ALL", ...Object.keys(zoneSummary)];

  /* ================= CHART DATA ================= */
  const chartQty = Object.entries(zoneSummary).map(([z, v]) => ({
    zone: z,
    value: Number(v.qty.toFixed(2)),
  }));

  const chartNSR = Object.entries(zoneSummary).map(([z, v]) => ({
    zone: z,
    value: Number(v.nsr.toFixed(2)),
  }));

  /* ================= EXPORT ================= */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredOrders.map(o => ({
        Date: o.orderDate?.slice(0, 10),
        Order: o.salesNumber,
        Customer: o.customerName,
        Zone: o.zone,
        Qty: fmtQty(o.qty),
        Amount: fmtAmt(o.grandTotal),
        Stage: o.statusStages,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]), "Orders.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Orders Summary", 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [["Date","Order","Customer","Zone","Qty","Amount","Stage"]],
      body: filteredOrders.map(o => [
        o.orderDate?.slice(0,10),
        o.salesNumber,
        o.customerName,
        o.zone,
        fmtQty(o.qty),
        `₹ ${fmtAmt(o.grandTotal)}`,
        o.statusStages,
      ]),
    });
    doc.save("Orders.pdf");
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-slate-100 p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Orders Dashboard</h1>
          <p className="text-sm text-gray-500">Company: {companyId}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="btn-primary">Excel</button>
          <button onClick={exportPDF} className="btn-danger">PDF</button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow flex gap-4 flex-wrap">
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="input"/>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="input"/>
        <select value={zone} onChange={e=>setZone(e.target.value)} className="input">
          {zones.map(z => <option key={z}>{z}</option>)}
        </select>
        <button onClick={()=>loadOrders(companyId)} className="btn-primary">Apply</button>
      </div>

      {/* KPI SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPI title="Total Orders" value={summary.totalOrders}/>
        <KPI title="Dispatched" value={summary.dispatched}/>
        <KPI title="Pending" value={summary.pending}/>
        <KPI title="Total Qty" value={fmtQty(summary.qty)}/>
        <KPI title="NSR" value={`₹ ${fmtAmt(summary.nsr)}`}/>
      </div>

      {/* ZONE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-solid border-gray-300 border p-4 rounded-xl bg-white shadow">
        {Object.entries(zoneSummary).map(([z,v],i)=>(
          <div
            key={z}
            onClick={()=>setZone(z)}
            className={`p-4 rounded-xl cursor-pointer border
              ${zone===z ? "bg-indigo-50 border-indigo-500" : "bg-white"}`}
          >
            <p className="text-sm text-gray-500">{z}</p>
            <p className="text-xl font-bold"> {v.orders}</p>
            <p className="text-xs text-gray-500">Qty: {fmtQty(v.qty)}</p>
            {/* <p className="text-xs text-gray-500"> ₹ {fmtAmt(v.nsr)}</p> */}
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart title="Zone-wise Quantity" data={chartQty}/>
        <Chart title="Zone-wise NSR" data={chartNSR}/>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Order</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Zone</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-left">Stage</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o,i)=>(
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-3">{o.orderDate?.slice(0,10)}</td>
                <td className="p-3 text-indigo-600 font-medium">{o.salesNumber}</td>
                <td className="p-3">{o.customerName}</td>
                <td className="p-3">{o.zone}</td>
                <td className="p-3 text-right">{fmtQty(o.qty)}</td>
                <td className="p-3 text-right">₹ {fmtAmt(o.grandTotal)}</td>
                <td className="p-3">{o.statusStages}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
          <div className="bg-white px-6 py-3 rounded shadow">Loading…</div>
        </div>
      )}
    </div>
  );
}

/* ===== REUSABLE COMPONENTS ===== */

function KPI({ title, value }) {
  return (
    <div className="
      bg-white rounded-xl p-4
      shadow-sm hover:shadow-md transition
      border-l-4 border-blue-500
    ">
      <p className="text-xs text-gray-500 uppercase tracking-wide">
        {title}
      </p>
      <p className="text-2xl font-bold mt-1 text-gray-800">
        {value}
      </p>
    </div>
  );
}


function Chart({ title, data }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <XAxis dataKey="zone"/>
          <YAxis/>
          <Tooltip/>
          <Bar dataKey="value" radius={[6,6,0,0]}>
            {data.map((_,i)=>(
              <Cell key={i} fill={COLORS[i % COLORS.length]}/>
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


// "use client";

// import { useEffect, useState } from "react";
// import { jwtDecode } from "jwt-decode";
// import { useRouter } from "next/navigation";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";

// export default function OrdersSummaryPage() {
//   const [orders, setOrders] = useState([]);
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
//     loadOrders(decoded.companyId);
//   }, []);

//   async function loadOrders(cid = companyId) {
//     if (!cid) return;

//     setLoading(true);

//     const query = new URLSearchParams({
//       companyId: cid,
//       ...(from && { from }),
//       ...(to && { to }),
//     }).toString();

//     const res = await fetch(`/api/reports/order-summary?${query}`);
//     const json = await res.json();

//     setOrders(json.rawOrders || []);
//     setLoading(false);
//   }

//   /* ✅ EXPORT TO EXCEL */
//   const exportToExcel = () => {
//     if (!orders.length) return alert("No orders to export");

//     const ws = XLSX.utils.json_to_sheet(
//       orders.map((o) => ({
//         "Order Date": o.orderDate
//           ? new Date(o.orderDate).toLocaleDateString()
//           : "",
//         "Order Number": o.salesNumber,
//         "Customer Name": o.customerName,
//         "Order Amount": o.grandTotal,
       
//         "Sales Stage": o.statusStages,
//       }))
//     );

//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Orders");

//     const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
//     saveAs(new Blob([buf]), "Orders_Summary.xlsx");
//   };

//   /* ✅ EXPORT TO PDF */
//   const exportToPDF = () => {
//     if (!orders.length) return alert("No orders to export");

//     const doc = new jsPDF();

//     doc.text("Summary of Orders Received & Dispatched", 14, 15);

//     const tableData = orders.map((o) => [
//       o.orderDate ? new Date(o.orderDate).toLocaleDateString() : "",
//       o.salesNumber,
//       o.customerName,
//       `₹ ${o.grandTotal}`,
//       o.status,
//       o.statusStages,
//     ]);

//     autoTable(doc, {
//       startY: 22,
//       head: [[
//         "Order Date",
//         "Order Number",
//         "Customer Name",
//         "Order Amount",
       
//         "Sales Stage",
//       ]],
//       body: tableData,
//     });

//     doc.save("Orders_Summary.pdf");
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-xl font-bold animate-pulse">
//           Loading Orders...
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
//             📦 Summary of Orders Received & Dispatched
//           </h1>
//           <p className="text-gray-500">
//             Company: <span className="font-semibold">{companyId}</span>
//           </p>
//         </div>

//         <div className="flex gap-3 mt-4 sm:mt-0">
//           <button
//             onClick={exportToExcel}
//             className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
//           >
//             📤 Export Excel
//           </button>

//           <button
//             onClick={exportToPDF}
//             className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
//           >
//             📄 Export PDF
//           </button>
//         </div>
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
//             onClick={() => loadOrders()}
//             className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
//           >
//             🔍 Apply Filter
//           </button>
//         </div>
//       </div>

//       {/* TABLE */}
//       <div className="bg-white shadow-xl rounded-xl p-6">

//         <h2 className="text-xl font-bold mb-4">
//           📋 Orders Table
//         </h2>

//         <div className="overflow-x-auto">
//           <table className="w-full border text-sm">
//             <thead className="bg-indigo-100">
//               <tr>
//                 <th className="border p-2">Order Date</th>
//                 <th className="border p-2">Order Number</th>
//                 <th className="border p-2">Customer Name</th>
//                 <th className="border p-2">Order Amount</th>
//                 {/* <th className="border p-2">Status</th> */}
//                 <th className="border p-2">Sales Stage</th>
//               </tr>
//             </thead>

//             <tbody>
//               {orders.length === 0 && (
//                 <tr>
//                   <td colSpan="6" className="text-center p-6 text-gray-500">
//                     No Orders Found
//                   </td>
//                 </tr>
//               )}

//               {orders.map((o, i) => (
//                 <tr key={i} className="hover:bg-gray-50 transition">
//                   <td className="border p-2">
//                     {o.orderDate
//                       ? new Date(o.orderDate).toLocaleDateString("en-IN")
//                       : "-"}
//                   </td>

//                   <td className="border p-2 font-semibold text-blue-700">
//                     {o.salesNumber}
//                   </td>

//                   <td className="border p-2">
//                     {o.customerName}
//                   </td>

//                   <td className="border p-2 font-semibold">
//                     ₹ {o.grandTotal}
//                   </td>

               

//                   {/* ✅ SALES STAGE LIKE YOUR STYLE */}
//                   <td className="border p-2">
//                     <span
//                       className={`px-3 py-1 text-xs font-semibold rounded-full
//                         ${
//                           o.statusStages?.toLowerCase().includes("dispatch")
//                             ? "bg-indigo-100 text-indigo-700"
//                             : o.statusStages?.toLowerCase().includes("production")
//                             ? "bg-orange-100 text-orange-700"
//                             : "bg-gray-200 text-gray-700"
//                         }`}
//                     >
//                       {o.statusStages || "N/A"}
//                     </span>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>

//       </div>
//     </div>
//   );
// }
