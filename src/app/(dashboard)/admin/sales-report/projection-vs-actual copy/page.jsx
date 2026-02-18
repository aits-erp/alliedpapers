"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { 
  BarChart2, 
  Search, 
  Download, 
  Filter,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2
} from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ProjectionVsActualPage() {
  const today = new Date();
  
  // Filters
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("All");

  // Data
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState([]);

  // Fetch Data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/reports/projection-vs-actual?year=${year}&month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setReport(res.data.data);
        // Extract unique zones for filter dropdown
        const uniqueZones = [...new Set(res.data.data.map(i => i.zone))];
        setZones(uniqueZones);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch on filter change
  useEffect(() => {
    fetchReport();
  }, [year, month]);

  // Client-side filtering
  const filteredData = report.filter(row => {
    const matchesSearch = 
      row.itemCode.toLowerCase().includes(search.toLowerCase()) || 
      row.itemName.toLowerCase().includes(search.toLowerCase());
    const matchesZone = zoneFilter === "All" || row.zone === zoneFilter;
    return matchesSearch && matchesZone;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="text-blue-600" />
            Target vs Actual Report
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Compare planned projections against actual sales by Item & Zone.
          </p>
        </div>
        
        {/* Date Filters */}
        <div className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border">
          <select 
            className="bg-transparent font-medium outline-none px-2"
            value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
          <div className="w-px bg-gray-300 mx-1"></div>
          <select 
            className="bg-transparent font-medium outline-none px-2"
            value={year} onChange={e => setYear(e.target.value)}>
            {Array.from({length: 5}, (_, i) => today.getFullYear() - 2 + i).map(y => (
               <option key={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Item Code or Name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Zone Filter */}
        <div className="w-full md:w-48">
          <select 
            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white outline-none"
            value={zoneFilter}
            onChange={e => setZoneFilter(e.target.value)}
          >
            <option value="All">All Zones</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600"/></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Zone</th>
                  <th className="px-6 py-4">Item Details</th>
                  <th className="px-6 py-4 text-center">Target (Qty)</th>
                  <th className="px-6 py-4 text-center">Actual (Qty)</th>
                  <th className="px-6 py-4 text-center">Variance</th>
                  <th className="px-6 py-4 text-center">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-400">No data found matching criteria.</td></tr>
                ) : filteredData.map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50/50 transition">
                    <td className="px-6 py-4 font-medium text-gray-600">{row.zone}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{row.itemCode}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{row.itemName}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-gray-500">
                      {row.projectedQty}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-gray-800">
                      {row.actualQty}
                    </td>
                    <td className={`px-6 py-4 text-center font-bold ${row.difference >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {row.difference > 0 ? "+" : ""}{row.difference}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          parseFloat(row.performance) >= 100 ? "bg-green-100 text-green-700" : 
                          parseFloat(row.performance) >= 50 ? "bg-yellow-100 text-yellow-700" : 
                          "bg-red-100 text-red-700"
                        }`}>
                          {row.performance}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}