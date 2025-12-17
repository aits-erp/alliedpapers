"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Loader2, 
  Calendar, 
  Search,
  AlertCircle
} from "lucide-react";

/* ---- CONSTANTS ---- */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);
const ZONES = ["East", "West", "South", "Bangalore"]; // Fixed 'Bang' to 'Bangalore' based on typical usage
const LINERS = ["Plain", "Inprint", "PET", "Yellow printed"];
const GROUPS = ["Thermal", "Paper", "Film", "Film PET", "Sheet", "Spl", "PET+paper"];

const emptyRow = {
  zone: "",
  productCode: "",
  productName: "",
  qty: "",
  liner: "",
  group: "",
  remark: "",
};

export default function ProjectionPage() {
  const today = new Date();

  // State
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Filter/Search State
  const [searchTerm, setSearchTerm] = useState("");

  // Data State
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  
  // 'rows' is for the Modal (The form inputs)
  const [rows, setRows] = useState([emptyRow]);
  
  // 'list' is for the Table (Flattened view)
  const [list, setList] = useState([]); 
  
  // 'rawData' stores the original API structure (needed for editing)
  const [rawData, setRawData] = useState([]);
  
  const [editId, setEditId] = useState(null);

  /* ---- LOAD DATA ---- */
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/projection", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const originalData = res.data.data || [];
      setRawData(originalData); // Store the original structure

      // FLATTEN THE DATA FOR THE TABLE
      // We extract every row from every month and add parent info to it
      const flattenedList = originalData.flatMap(doc => 
        doc.rows.map((row, index) => ({
          ...row,
          // We attach parent info to the row so the table can display Year/Month
          parentId: doc._id,
          year: doc.year,
          month: doc.month,
          // Create a unique key for the table row (fallback to index if _id missing)
          uniqueKey: row._id || `${doc._id}-${index}`
        }))
      );

      setList(flattenedList);
    } catch (err) {
      console.error("Failed to load data", err);
      setError("Failed to load projections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ---- FORM HANDLERS ---- */
  const updateRow = (index, field, value) => {
    const copy = [...rows];
    if (field === "productCode") {
      copy[index][field] = value.replace(/[^A-Za-z0-9()-]/g, "").toUpperCase();
    } else {
      copy[index][field] = value;
    }
    setRows(copy);
  };

  const addRow = () => setRows([...rows, { ...emptyRow }]);
  
  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, x) => x !== index));
    }
  };

  /* ---- CRUD OPERATIONS ---- */
  const handleSave = async () => {
    setSubmitting(true);
    setError("");
    const token = localStorage.getItem("token");

    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      };

      if (editId) {
        // Update (PUT)
        // Important: We send the 'rows' array, not just rows[0]
        await axios.put(`/api/projection/${editId}`, { rows: rows }, config);
      } else {
        // Create (POST)
        await axios.post("/api/projection", { year, month, rows }, config);
      }

      setOpen(false);
      setRows([emptyRow]);
      setEditId(null);
      await loadData();

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Something went wrong while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  // When clicking Edit on a table row
  const editRow = (clickedItem) => {
    // 1. Find the parent document (the full month) from our rawData
    const parentDoc = rawData.find(d => d._id === clickedItem.parentId);

    if (parentDoc) {
        setEditId(parentDoc._id);
        setYear(parentDoc.year);
        setMonth(parentDoc.month);
        // 2. Load ALL rows from that month into the modal
        setRows(parentDoc.rows.length > 0 ? parentDoc.rows : [emptyRow]);
        setOpen(true);
        setError("");
    } else {
        alert("Error: Could not find original document");
    }
  };

  const deleteRow = async (parentId) => {
    if (!window.confirm("This will delete the entire projection for this month. Are you sure?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/projection/${parentId}`, {
         headers: { Authorization: `Bearer ${token}` }
      });
      loadData(); // Reload to refresh list
    } catch (err) {
      alert("Failed to delete");
    }
  };

  // Search Filter
  const filteredList = list.filter(r => 
    r.productCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.zone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-blue-600">📊</span> Projections
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage sales and inventory planning</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search code or zone..." 
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              setEditId(null);
              setRows([emptyRow]);
              setOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Projection
          </button>
        </div>
      </div>

      {/* --- ERROR MESSAGE --- */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* --- DATA TABLE --- */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Year/Month</th>
                  <th className="px-6 py-4">Zone</th>
                  <th className="px-6 py-4">Item Code</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4 text-right">Qty</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-400 italic">
                      No data found.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((r) => (
                    <tr key={r.uniqueKey} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-700">{r.month} {r.year}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
                          {r.zone}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">
                        {r.productCode}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{r.productName}</td>
                      <td className="px-6 py-4 text-right font-medium">{r.qty}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => editRow(r)}
                            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                            title="Edit this Month's Sheet"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteRow(r.parentId)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
                            title="Delete this Month"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL --- */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
          />

          {/* Modal Content */}
          <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {editId ? "Edit Projection" : "New Projection"}
                </h2>
                <p className="text-sm text-gray-500">
                    {editId ? `Editing details for ${month} ${year}` : "Create a new monthly plan"}
                </p>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1">
              
              {/* Common Fields (Year/Month) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div>
                  <label className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 block">Year</label>
                  <select 
                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={year} 
                    onChange={e => setYear(e.target.value)}
                    disabled={!!editId} // Disable year change in edit mode to prevent duplicates
                  >
                    {YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 block">Month</label>
                  <select 
                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={month} 
                    onChange={e => setMonth(e.target.value)}
                    disabled={!!editId} // Disable month change in edit mode
                  >
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Dynamic Rows */}
              <div className="space-y-4">
                {rows.map((r, i) => (
                  <div key={i} className="relative group bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    
                    {/* Delete Row Button (Only if more than 1 row) */}
                    {rows.length > 1 && (
                      <button 
                        onClick={() => removeRow(i)} 
                        className="absolute -top-3 -right-3 bg-red-100 text-red-600 p-1.5 rounded-full shadow hover:bg-red-200 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      
                      <div className="md:col-span-1">
                        <Label>Zone</Label>
                        <Select 
                          value={r.zone} 
                          onChange={e => updateRow(i, 'zone', e.target.value)}
                          options={ZONES}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Item Code</Label>
                        <Input 
                          value={r.productCode} 
                          onChange={e => updateRow(i, 'productCode', e.target.value)}
                          placeholder="JT-1001"
                          className="font-mono font-semibold uppercase text-blue-700"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label>Product Name</Label>
                        <Input 
                          value={r.productName} 
                          onChange={e => updateRow(i, 'productName', e.target.value)}
                        />
                      </div>

                      <div className="md:col-span-1">
                        <Label>Qty</Label>
                        <Input 
                          type="number"
                          value={r.qty} 
                          onChange={e => updateRow(i, 'qty', e.target.value)}
                        />
                      </div>

                      <div className="md:col-span-1">
                        <Label>Liner</Label>
                        <Select 
                          value={r.liner} 
                          onChange={e => updateRow(i, 'liner', e.target.value)}
                          options={LINERS}
                        />
                      </div>

                      <div className="md:col-span-1">
                        <Label>Group</Label>
                        <Select 
                          value={r.group} 
                          onChange={e => updateRow(i, 'group', e.target.value)}
                          options={GROUPS}
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label>Remark</Label>
                        <Input 
                          value={r.remark} 
                          onChange={e => updateRow(i, 'remark', e.target.value)}
                          placeholder="Optional notes"
                        />
                      </div>

                    </div>
                  </div>
                ))}
              </div>

              {/* Add Row Button */}
              <button 
                  onClick={addRow} 
                  className="mt-6 flex items-center gap-2 text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded-lg transition"
                >
                  <Plus className="w-4 h-4" /> Add Another Item
                </button>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button 
                onClick={() => setOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-white transition"
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {submitting ? "Saving..." : "Save Projection"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

/* ---- REUSABLE UI COMPONENTS ---- */

function Label({ children }) {
  return <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{children}</label>;
}

function Input({ className = "", ...props }) {
  return (
    <input 
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${className}`}
      {...props}
    />
  );
}

function Select({ options, value, onChange, placeholder = "Select" }) {
  return (
    <select 
      value={value} 
      onChange={onChange}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
    >
      <option value="">{placeholder}</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}
// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";
// import { 
//   Plus, 
//   Trash2, 
//   Edit, 
//   Save, 
//   X, 
//   Loader2, 
//   Calendar, 
//   Search,
//   AlertCircle
// } from "lucide-react";

// /* ---- CONSTANTS ---- */
// const MONTHS = [
//   "January", "February", "March", "April", "May", "June",
//   "July", "August", "September", "October", "November", "December"
// ];
// const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);
// const ZONES = ["East", "West", "South", "Bangalore"];
// const LINERS = ["Plain", "Inprint", "PET", "Yellow printed"];
// const GROUPS = ["Thermal", "Paper", "Film", "Film PET", "Sheet", "Spl", "PET+paper"];

// const emptyRow = {
//   zone: "",
//   productCode: "",
//   productName: "",
//   qty: "",
//   liner: "",
//   group: "",
//   remark: "",
// };

// export default function ProjectionPage() {
//   const today = new Date();

//   // State
//   const [open, setOpen] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState("");
  
//   // Filter/Search State
//   const [searchTerm, setSearchTerm] = useState("");

//   // Data State
//   const [year, setYear] = useState(today.getFullYear());
//   const [month, setMonth] = useState(MONTHS[today.getMonth()]);
//   const [rows, setRows] = useState([emptyRow]);
//   const [list, setList] = useState([]);
//   const [editId, setEditId] = useState(null);

//   /* ---- LOAD DATA ---- */
//   const loadData = async () => {
//     setLoading(true);
//     try {
//       const res = await axios.get("/api/projection",
//         {
//             headers: {
//                 Authorization: `Bearer ${localStorage.getItem("token")}`,
//             },
//         }
       
//       );
//        console.log("test projection data",res.data.data);
//       // Assuming API returns { success: true, data: [...] }
//       setList(res.data.data || []);
//     } catch (err) {
//       console.error("Failed to load data", err);
//       setError("Failed to load projections.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadData();
//   }, []);

//   /* ---- FORM HANDLERS ---- */
//   const updateRow = (index, field, value) => {
//     const copy = [...rows];
//     if (field === "productCode") {
//       // Strict Uppercase & Alphanumeric regex
//       copy[index][field] = value.replace(/[^A-Za-z0-9()-]/g, "").toUpperCase();
//     } else {
//       copy[index][field] = value;
//     }
//     setRows(copy);
//   };

//   const addRow = () => setRows([...rows, { ...emptyRow }]);
  
//   const removeRow = (index) => {
//     if (rows.length > 1) {
//       setRows(rows.filter((_, x) => x !== index));
//     }
//   };

//   /* ---- CRUD OPERATIONS ---- */
//   const handleSave = async () => {
//     setSubmitting(true);
//     setError("");
//     const token = localStorage.getItem("token");

//     try {
//       // Configure Headers
//       const config = {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: token ? `Bearer ${token}` : "",
//         },
//       };

//       if (editId) {
//         // Update (PUT)
//         await axios.put("/api/projection", { _id: editId, ...rows[0] }, config);
//       } else {
//         // Create (POST)
//         await axios.post("/api/projection", { year, month, rows }, config);
//       }

//       // Reset and Reload
//       setOpen(false);
//       setRows([emptyRow]);
//       setEditId(null);
//       await loadData();

//     } catch (err) {
//       console.error(err);
//       setError(err.response?.data?.message || "Something went wrong while saving.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const editRow = (r) => {
//     setEditId(r._id);
//     setYear(r.year);
//     setMonth(r.month);
//     // Populate form with existing data
//     setRows([{
//       zone: r.zone,
//       productCode: r.productCode,
//       productName: r.productName,
//       qty: r.qty,
//       liner: r.liner,
//       group: r.group,
//       remark: r.remark,
//     }]);
//     setOpen(true);
//     setError("");
//   };

//   const deleteRow = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this projection?")) return;

//     try {
//       await axios.delete("/api/projection", { data: { id } });
//       setList(list.filter((item) => item._id !== id));
//     } catch (err) {
//       alert("Failed to delete");
//     }
//   };

//   // Simple client-side search filter
//   const filteredList = list.filter(r => 
//     r.productCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     r.zone?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      
//       {/* --- HEADER SECTION --- */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
//             <span className="text-blue-600">📊</span> Projections
//           </h1>
//           <p className="text-sm text-gray-500 mt-1">Manage sales and inventory planning</p>
//         </div>
        
//         <div className="flex gap-3">
//           <div className="relative">
//             <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
//             <input 
//               type="text" 
//               placeholder="Search code or zone..." 
//               className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-64"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>
//           <button
//             onClick={() => {
//               setEditId(null);
//               setRows([emptyRow]);
//               setOpen(true);
//             }}
//             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
//           >
//             <Plus className="w-4 h-4" /> New Projection
//           </button>
//         </div>
//       </div>

//       {/* --- ERROR MESSAGE --- */}
//       {error && (
//         <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-2">
//           <AlertCircle className="w-5 h-5" />
//           {error}
//         </div>
//       )}

//       {/* --- DATA TABLE --- */}
//       <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
//         {loading ? (
//           <div className="p-12 flex justify-center text-gray-400">
//             <Loader2 className="w-8 h-8 animate-spin" />
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm text-left">
//               <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-semibold uppercase tracking-wider">
//                 <tr>
//                   <th className="px-6 py-4">Year/Month</th>
//                   <th className="px-6 py-4">Zone</th>
//                   <th className="px-6 py-4">Item Code</th>
//                   <th className="px-6 py-4">Product Name</th>
//                   <th className="px-6 py-4 text-right">Qty</th>
//                   <th className="px-6 py-4 text-center">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100">
//                 {filteredList.length === 0 ? (
//                   <tr>
//                     <td colSpan="6" className="p-8 text-center text-gray-400 italic">
//                       No data found.
//                     </td>
//                   </tr>
//                 ) : (
//                   filteredList.map((r) => (
//                     <tr key={r._id} className="hover:bg-blue-50/50 transition-colors group">
//                       <td className="px-6 py-4">
//                         <div className="flex items-center gap-2">
//                           <Calendar className="w-4 h-4 text-gray-400" />
//                           <span className="font-medium text-gray-700">{r.month} {r.year}</span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4">
//                         <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
//                           {r.zone}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 font-mono font-bold text-blue-600">
//                         {r.productCode}
//                       </td>
//                       <td className="px-6 py-4 text-gray-600">{r.productName}</td>
//                       <td className="px-6 py-4 text-right font-medium">{r.qty}</td>
//                       <td className="px-6 py-4">
//                         <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                           <button 
//                             onClick={() => editRow(r)}
//                             className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
//                           >
//                             <Edit className="w-4 h-4" />
//                           </button>
//                           <button 
//                             onClick={() => deleteRow(r._id)}
//                             className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
//                           >
//                             <Trash2 className="w-4 h-4" />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* --- MODAL --- */}
//       {open && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//           {/* Backdrop */}
//           <div 
//             className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
//             onClick={() => setOpen(false)}
//           />

//           {/* Modal Content */}
//           <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
            
//             {/* Modal Header */}
//             <div className="flex justify-between items-center p-6 border-b border-gray-100">
//               <div>
//                 <h2 className="text-xl font-bold text-gray-800">
//                   {editId ? "Edit Projection" : "New Projection"}
//                 </h2>
//                 <p className="text-sm text-gray-500">Fill in the details below</p>
//               </div>
//               <button 
//                 onClick={() => setOpen(false)}
//                 className="p-2 hover:bg-gray-100 rounded-full transition"
//               >
//                 <X className="w-5 h-5 text-gray-500" />
//               </button>
//             </div>

//             {/* Scrollable Body */}
//             <div className="p-6 overflow-y-auto flex-1">
              
//               {/* Common Fields (Year/Month) */}
//               <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
//                 <div>
//                   <label className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 block">Year</label>
//                   <select 
//                     className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
//                     value={year} 
//                     onChange={e => setYear(e.target.value)}
//                   >
//                     {YEARS.map(y => <option key={y}>{y}</option>)}
//                   </select>
//                 </div>
//                 <div>
//                   <label className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 block">Month</label>
//                   <select 
//                     className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
//                     value={month} 
//                     onChange={e => setMonth(e.target.value)}
//                   >
//                     {MONTHS.map(m => <option key={m}>{m}</option>)}
//                   </select>
//                 </div>
//               </div>

//               {/* Dynamic Rows */}
//               <div className="space-y-4">
//                 {rows.map((r, i) => (
//                   <div key={i} className="relative group bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    
//                     {/* Delete Row Button (Only if more than 1 row) */}
//                     {rows.length > 1 && (
//                       <button 
//                         onClick={() => removeRow(i)} 
//                         className="absolute -top-3 -right-3 bg-red-100 text-red-600 p-1.5 rounded-full shadow hover:bg-red-200 transition"
//                       >
//                         <X className="w-4 h-4" />
//                       </button>
//                     )}

//                     <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      
//                       <div className="md:col-span-1">
//                         <Label>Zone</Label>
//                         <Select 
//                           value={r.zone} 
//                           onChange={e => updateRow(i, 'zone', e.target.value)}
//                           options={ZONES}
//                         />
//                       </div>

//                       <div className="md:col-span-2">
//                         <Label>Item Code</Label>
//                         <Input 
//                           value={r.productCode} 
//                           onChange={e => updateRow(i, 'productCode', e.target.value)}
//                           placeholder="JT-1001"
//                           className="font-mono font-semibold uppercase text-blue-700"
//                         />
//                       </div>

//                       <div className="md:col-span-3">
//                         <Label>Product Name</Label>
//                         <Input 
//                           value={r.productName} 
//                           onChange={e => updateRow(i, 'productName', e.target.value)}
//                         />
//                       </div>

//                       <div className="md:col-span-1">
//                         <Label>Qty</Label>
//                         <Input 
//                           type="number"
//                           value={r.qty} 
//                           onChange={e => updateRow(i, 'qty', e.target.value)}
//                         />
//                       </div>

//                       <div className="md:col-span-1">
//                         <Label>Liner</Label>
//                         <Select 
//                           value={r.liner} 
//                           onChange={e => updateRow(i, 'liner', e.target.value)}
//                           options={LINERS}
//                         />
//                       </div>

//                       <div className="md:col-span-1">
//                         <Label>Group</Label>
//                         <Select 
//                           value={r.group} 
//                           onChange={e => updateRow(i, 'group', e.target.value)}
//                           options={GROUPS}
//                         />
//                       </div>

//                       <div className="md:col-span-3">
//                         <Label>Remark</Label>
//                         <Input 
//                           value={r.remark} 
//                           onChange={e => updateRow(i, 'remark', e.target.value)}
//                           placeholder="Optional notes"
//                         />
//                       </div>

//                     </div>
//                   </div>
//                 ))}
//               </div>

//               {/* Add Row Button (Only for Create mode) */}
//               {!editId && (
//                 <button 
//                   onClick={addRow} 
//                   className="mt-6 flex items-center gap-2 text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded-lg transition"
//                 >
//                   <Plus className="w-4 h-4" /> Add Another Item
//                 </button>
//               )}
//             </div>

//             {/* Modal Footer */}
//             <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
//               <button 
//                 onClick={() => setOpen(false)}
//                 className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-white transition"
//                 disabled={submitting}
//               >
//                 Cancel
//               </button>
//               <button 
//                 onClick={handleSave}
//                 disabled={submitting}
//                 className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
//               >
//                 {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
//                 {submitting ? "Saving..." : "Save Projection"}
//               </button>
//             </div>

//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ---- REUSABLE UI COMPONENTS ---- */

// function Label({ children }) {
//   return <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{children}</label>;
// }

// function Input({ className = "", ...props }) {
//   return (
//     <input 
//       className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${className}`}
//       {...props}
//     />
//   );
// }

// function Select({ options, value, onChange, placeholder = "Select" }) {
//   return (
//     <select 
//       value={value} 
//       onChange={onChange}
//       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
//     >
//       <option value="">{placeholder}</option>
//       {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
//     </select>
//   );
// }