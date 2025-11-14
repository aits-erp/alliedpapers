"use client";
import { useEffect, useState } from "react";

export default function SalesReport() {
  const [datewise, setDatewise] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Add state for filters
  const [selectedDate, setSelectedDate] = useState("2025-08-25"); // default today
  const [month, setMonth] = useState(8); // August
  const [year, setYear] = useState(2025);

  // ✅ Fetch reports whenever filters change
  useEffect(() => {
    fetchReports();
  }, [selectedDate, month, year]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      const res1 = await fetch(`/api/reports/datewise?date=${selectedDate}`);
      const res2 = await fetch(`/api/reports/monthly?month=${month}&year=${year}`);

      const data1 = await res1.json();
      const data2 = await res2.json();

      setDatewise(data1.datewise || []);
      setMonthly(data2.monthly || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading reports...</div>;

  return (
    <div className="p-6 space-y-8">
      {/* Filter Controls */}
      <div className="flex space-x-4 mb-6">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border px-2 py-1 rounded"
        />
        <input
          type="number"
          value={month}
          min={1}
          max={12}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border px-2 py-1 rounded w-20"
        />
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border px-2 py-1 rounded w-28"
        />
      </div>

      {/* Datewise Report */}
      <div>
        <h2 className="text-xl font-bold mb-3">📅 Datewise Report</h2>
        <table className="w-full border border-gray-300 text-sm">
          <thead>
            <tr className="bg-yellow-300 text-black">
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Zone</th>
              <th className="border px-2 py-1">Salesperson</th>
              <th className="border px-2 py-1">Total Qty (SQM)</th>
              <th className="border px-2 py-1">Order Value</th>
              <th className="border px-2 py-1">Dispatched</th>
              <th className="border px-2 py-1">Pending</th>
            </tr>
          </thead>
          <tbody>
            {datewise.map((row, i) => (
              <tr key={i} className="text-center">
                <td className="border px-2 py-1">{row._id.date}</td>
                <td className="border px-2 py-1">{row._id.zone}</td>
               <td className="border px-2 py-1">
  {row._id?.salesperson || "Unknown Salesperson"}
</td>
                <td className="border px-2 py-1">{row.totalQty}</td>
                <td className="border px-2 py-1">{row.totalValue}</td>
                <td className="border px-2 py-1">{row.totalDispatched}</td>
                <td className="border px-2 py-1">{row.totalPending}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly Report */}
      <div>
        <h2 className="text-xl font-bold mb-3">📊 Cumulative of Month</h2>
        <table className="w-full border border-gray-300 text-sm">
          <thead>
            <tr className="bg-green-300 text-black">
              <th className="border px-2 py-1">Zone</th>
              <th className="border px-2 py-1">Salesperson</th>
              <th className="border px-2 py-1">Total Qty (SQM)</th>
              <th className="border px-2 py-1">Order Value</th>
              <th className="border px-2 py-1">Dispatched till Date</th>
              <th className="border px-2 py-1">Pending till Date</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((row, i) => (
              <tr key={i} className="text-center">
                <td className="border px-2 py-1">{row._id.zone}</td>
                <td className="border px-2 py-1">{row._id.salesperson}</td>
                <td className="border px-2 py-1">{row.totalQty}</td>
                <td className="border px-2 py-1">{row.totalValue}</td>
                <td className="border px-2 py-1">{row.totalDispatched}</td>
                <td className="border px-2 py-1">{row.totalPending}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}





