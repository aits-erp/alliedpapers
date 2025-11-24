"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";
import CountUp from "react-countup";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function SalesReportsPage() {
  const [data, setData] = useState(null);
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
    loadReports(decoded.companyId);
  }, []);

  async function loadReports(cid = companyId) {
    if (!cid) return;

    setLoading(true);

    const query = new URLSearchParams({
      companyId: cid,
      ...(from && { from }),
      ...(to && { to }),
    }).toString();

    const res = await fetch(`/api/reports/sales?${query}`);
    const json = await res.json();

    setData(json.data);
    setLoading(false);
  }

  /* ✅ EXPORT TO EXCEL */
  const exportToExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summary = [
      ["Total Orders", data.summaryOfOrders.totalOrders],
      ["Dispatched Orders", data.summaryOfOrders.totalDispatchedOrders],
      ["Pending Orders", data.summaryOfOrders.totalPendingDispatchOrders],
      ["Total Quantity", data.summaryOfOrders.totalQty],
      ["Total Amount", data.summaryOfOrders.totalAmount],
      ["Average NSR", data.averageNSR.overall],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    // Stage Report Sheet
    const ws2 = XLSX.utils.json_to_sheet(data.salesStageReport);
    XLSX.utils.book_append_sheet(wb, ws2, "Sales Stages");

    // NSR Product Sheet
    const ws3 = XLSX.utils.json_to_sheet(data.averageNSR.byProduct);
    XLSX.utils.book_append_sheet(wb, ws3, "Product NSR");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), "Sales_Report.xlsx");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-bold animate-pulse">
          Loading Reports...
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
            📊 Sales Reports Dashboard
          </h1>
          <p className="text-gray-500">
            Company: <span className="font-semibold">{companyId}</span>
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="mt-4 sm:mt-0 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
        >
          📤 Export to Excel
        </button>
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
            onClick={() => loadReports()}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            🔍 Apply Filter
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            <Card title="Total Orders" value={data.summaryOfOrders.totalOrders} />
            <Card title="Dispatched" value={data.summaryOfOrders.totalDispatchedOrders} />
            <Card title="Pending" value={data.summaryOfOrders.totalPendingDispatchOrders} />
            <Card title="Total Qty" value={data.summaryOfOrders.totalQty} />
            <Card title="Total Amount" value={`₹ ${data.summaryOfOrders.totalAmount}`} />
            <Card title="Avg NSR" value={`₹ ${data.averageNSR.overall}`} />
          </div>

          {/* SALES STAGE BAR CHART */}
          <div className="bg-white p-6 shadow-xl rounded-xl mb-10">
            <h2 className="text-xl font-bold mb-4">
              📊 Sales Stage Overview
            </h2>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.salesStageReport}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalOrders" fill="#3b82f6" />
                <Bar dataKey="totalAmount" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* NSR LINE CHART */}
          <div className="bg-white p-6 shadow-xl rounded-xl mb-10">
            <h2 className="text-xl font-bold mb-4">
              📈 Product NSR Trend
            </h2>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.averageNSR.byProduct}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="itemName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="nsrPerUnit" stroke="#6366f1" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>


     {/* NSR */}
          <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-2">
              📌 Average NSR
            </h2>

            <div className="text-4xl font-bold text-blue-600 mb-6">
              ₹ {data?.averageNSR?.overall?.toFixed(2)}
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
                  {data?.averageNSR?.byProduct?.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-2 border">{p.itemName}</td>
                      <td className="p-2 border">{p.totalQty}</td>
                      <td className="p-2 border">₹ {p.totalNetAmount}</td>
                      <td className="p-2 border font-semibold text-blue-700">
                        ₹ {p.nsrPerUnit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SALES STAGE TABLE */}
          <div className="bg-white shadow-xl rounded-xl p-6 mb-10">
            <h2 className="text-xl font-bold mb-4">
              📋 Sales Stage Report (Table)
            </h2>

            <table className="w-full border text-sm">
              <thead className="bg-indigo-100">
                <tr>
                  <th className="border p-2">Stage</th>
                  <th className="border p-2">Orders</th>
                  <th className="border p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.salesStageReport.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border p-2">{s.stage}</td>
                    <td className="border p-2">{s.totalOrders}</td>
                    <td className="border p-2 font-bold">₹ {s.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* CARD */


/* ✅ INTERACTIVE CARD */
function Card({ title, value, icon = "📊", onClick, href, color = "blue" }) {
  const router = useRouter();

  const colorMap = {
    blue: "from-blue-500 to-blue-700",
    green: "from-green-500 to-green-700",
    red: "from-red-500 to-red-700",
    purple: "from-purple-500 to-purple-700",
    yellow: "from-yellow-400 to-yellow-600",
  };

  const handleClick = () => {
    if (onClick) onClick();
    if (href) router.push(href);
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer bg-white rounded-2xl p-5 shadow-md hover:shadow-2xl 
      transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden"
    >
      {/* Gradient stripe */}
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colorMap[color]}`}
      />

      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm font-semibold">{title}</p>

        <div className="text-2xl p-2 bg-gray-100 rounded-full
        group-hover:bg-opacity-80 transition-all">
          {icon}
        </div>
      </div>

      <h2 className="text-3xl font-extrabold mt-3 transition-all group-hover:text-blue-600">
        {typeof value === "number" ? (
          <CountUp end={value} duration={1.5} separator="," />
        ) : (
          value
        )}
      </h2>

      <p className="text-xs mt-1 text-gray-400 group-hover:text-gray-600">
        Click for details →
      </p>
    </div>
  );
}







// "use client";

// import { useEffect, useState } from "react";
// import { jwtDecode } from "jwt-decode";

// export default function SalesReportsPage() {
//   const [data, setData] = useState(null);
//   const [companyId, setCompanyId] = useState("");
//   const [from, setFrom] = useState("");
//   const [to, setTo] = useState("");
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const token = localStorage.getItem("token"); // <-- Your saved token

//     if (!token) {
//       alert("Please login again");
//       return;
//     }

//     const decoded = jwtDecode(token);

//     if (!decoded.companyId) {
//       alert("No companyId found in token");
//       return;
//     }

//     setCompanyId(decoded.companyId);
//     loadReports(decoded.companyId);

//   }, []);

//   async function loadReports(newCompanyId = companyId) {
//     if (!newCompanyId) return;

//     setLoading(true);

//     const query = new URLSearchParams({
//       companyId: newCompanyId,
//       ...(from && { from }),
//       ...(to && { to }),
//     }).toString();

//     const res = await fetch(`/api/reports/sales?${query}`);
//     const json = await res.json();

//     setData(json.data);
//     setLoading(false);
//   }

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
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold text-gray-800">
//           📊 Sales Reports Dashboard
//         </h1>
//         <p className="text-gray-500">
//           Company: <span className="font-semibold text-black">{companyId}</span>
//         </p>
//       </div>

//       {/* FILTERS */}
//       <div className="bg-white shadow-md rounded-xl p-5 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6">

//         <div>
//           <label className="text-sm text-gray-600 font-semibold">
//             From Date
//           </label>
//           <input
//             type="date"
//             value={from}
//             onChange={(e) => setFrom(e.target.value)}
//             className="w-full mt-1 border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div>
//           <label className="text-sm text-gray-600 font-semibold">
//             To Date
//           </label>
//           <input
//             type="date"
//             value={to}
//             onChange={(e) => setTo(e.target.value)}
//             className="w-full mt-1 border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div className="flex items-end">
//           <button
//             onClick={() => loadReports(companyId)}
//             className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-semibold"
//           >
//             🔍 Load Report
//           </button>
//         </div>

//       </div>

//       {!data && (
//         <p className="text-gray-500 text-center">
//           No data loaded yet
//         </p>
//       )}

//       {data && (
//         <>
//           {/* SUMMARY */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
//             <Card title="Total Orders" value={data?.summaryOfOrders?.totalOrders} />
//             <Card title="Dispatched" value={data?.summaryOfOrders?.totalDispatchedOrders} />
//             <Card title="Pending" value={data?.summaryOfOrders?.totalPendingDispatchOrders} />
//             <Card title="Total Qty" value={data?.summaryOfOrders?.totalQty} />
//             <Card title="Total Amount" value={`₹ ${data?.summaryOfOrders?.totalAmount}`} />
//           </div>



//            {/* SALES STAGES REPORT */}
// <div className="bg-white shadow-xl rounded-xl p-6 mb-8">
//   <h2 className="text-xl font-bold mb-4">📌 Sales Stage Report</h2>

//   {data?.salesStageReport?.length === 0 ? (
//     <p className="text-gray-500">No stage data available</p>
//   ) : (
//     <table className="w-full text-sm border">
//       <thead className="bg-indigo-100">
//         <tr>
//           <th className="border p-2">Stage</th>
//           <th className="border p-2">Total Orders</th>
//           <th className="border p-2">Total Amount</th>
//         </tr>
//       </thead>
//       <tbody>
//         {data.salesStageReport.map((stage, i) => (
//           <tr key={i} className="hover:bg-gray-50">
//             <td className="border p-2 font-semibold">{stage.stage}</td>
//             <td className="border p-2">{stage.count}</td>
//             <td className="border p-2 font-bold text-blue-700">
//               ₹ {stage.amount}
//             </td>
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   )}
// </div>

//           {/* NSR */}
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

//           {/* DELAY */}
//           <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
//             <h2 className="text-xl font-semibold mb-2">⏰ Delay Intimation</h2>

//             {data.delayIntimation.length === 0 ? (
//               <p className="text-green-600 font-semibold">
//                 ✅ No delayed orders
//               </p>
//             ) : (
//               <table className="w-full text-sm border">
//                 <thead className="bg-red-100">
//                   <tr>
//                     <th className="border p-2">SO No</th>
//                     <th className="border p-2">Customer</th>
//                     <th className="border p-2">Expected Date</th>
//                     <th className="border p-2">Days</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {data.delayIntimation.map((d, i) => (
//                     <tr key={i}>
//                       <td className="border p-2">{d.salesNumber}</td>
//                       <td className="border p-2">{d.customerName}</td>
//                       <td className="border p-2">
//                         {new Date(d.expectedDeliveryDate).toLocaleDateString()}
//                       </td>
//                       <td className="border p-2 text-red-600 font-bold">
//                         {d.daysDelayed}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// /* Card UI */
// function Card({ title, value }) {
//   return (
//     <div className="bg-white shadow-md rounded-xl p-4 hover:shadow-lg transition-all">
//       <p className="text-gray-500 text-sm">{title}</p>
//       <h2 className="text-2xl font-bold text-gray-800 mt-1">
//         {value ?? 0}
//       </h2>


      
//     </div>
//   );
// }
