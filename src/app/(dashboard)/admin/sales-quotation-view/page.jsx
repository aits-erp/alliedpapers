'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
  FaEllipsisV,
} from "react-icons/fa";

export default function SalesQuotationList() {
  const [quotations, setQuotations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/sales-quotation");
      if (res.data.success) setQuotations(res.data.data);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return quotations;
    return quotations.filter((q) =>
      (q.customerName || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [quotations, search]);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      const res = await axios.delete(`/api/sales-quotation/${id}`);
      if (res.data.success)
        setQuotations((prev) => prev.filter((q) => q._id !== id));
    } catch {
      alert("Failed to delete quotation");
    }
  };

  const handleCopyTo = (quotation, dest) => {
    if (dest === "Order") {
      sessionStorage.setItem("salesOrderData", JSON.stringify(quotation));
      router.push("/admin/sales-order-view/new");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
        Sales Quotations
      </h1>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex-1 relative max-w-sm">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by customer name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Link href="/admin/sales-quotation-view/new">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
            <FaEdit className="mr-2" />
            Create New Quotation
          </button>
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  {["#", "Ref Number", "Customer", "Date", "Status", "Total", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-100">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((q, idx) => (
                  <tr key={q._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3">{q.refNumber}</td>
                    <td className="px-4 py-3">{q.customerName}</td>
                    <td className="px-4 py-3">{q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB") : ""}</td>
                    <td className="px-4 py-3">{q.status}</td>
                    <td className="px-4 py-3">₹ {q.grandTotal}</td>
                    <td className="px-4 py-3">
                      <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-gray-500 dark:text-gray-400">
                      No matching quotations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filtered.map((q, idx) => (
              <div key={q._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-gray-700 dark:text-gray-100">
                    #{idx + 1} • {q.refNumber}
                  </div>
                  <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} isMobile />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Customer:</strong> {q.customerName}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Date:</strong> {q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB") : ""}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Status:</strong> {q.status}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Total:</strong> ₹ {q.grandTotal}</div>
              </div>
            ))}
            {!filtered.length && <div className="text-center text-gray-500 dark:text-gray-400">No matching quotations.</div>}
          </div>
        </>
      )}
    </div>
  );
}

function RowMenu({ quotation, onDelete, onCopy }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  const MenuItem = ({ icon, label, onClick, color = "" }) => (
    <button
      onClick={() => {
        onClick();
        setOpen(false);
      }}
      className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
    >
      <span className={color}>{icon}</span> {label}
    </button>
  );

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        onClick={() => setOpen((p) => !p)}
        className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full focus:ring-2 focus:ring-blue-500"
      >
        <FaEllipsisV size={16} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-50">
          <MenuItem icon={<FaEye />} label="View" onClick={() => (window.location.href = `/admin/sales-quotation-view/view/${quotation._id}`)} />
          <MenuItem icon={<FaEdit />} label="Edit" onClick={() => (window.location.href = `/admin/sales-quotation-view/new?editId=${quotation._id}`)} />
          <MenuItem icon={<FaCopy />} label="Copy → Order" onClick={() => onCopy(quotation, "Order")} />
          <MenuItem icon={<FaEnvelope />} label="Email" onClick={() => (window.location.href = `/admin/sales-quotation-email/${quotation._id}`)} />
          <MenuItem icon={<FaWhatsapp />} label="WhatsApp" onClick={() => (window.location.href = `/admin/sales-quotation-whatsapp/${quotation._id}`)} />
          <MenuItem icon={<FaTrash />} label="Delete" color="text-red-600" onClick={() => onDelete(quotation._id)} />
        </div>
      )}
    </div>
  );
}



// "use client";

// import { useState, useEffect, useMemo } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import {
//   FaEdit,
//   FaTrash,
//   FaCopy,
//   FaEye,
//   FaEnvelope,
//   FaWhatsapp,
//   FaSearch,
// } from "react-icons/fa";

// export default function SalesQuotationList() {
//   const [quotations, setQuotations] = useState([]);
//   const [search, setSearch] = useState("");
//   const router = useRouter();

//   useEffect(() => {
//     const fetchQuotations = async () => {
//       try {
//         const res = await axios.get("/api/sales-quotation");
//         if (res.data.success) setQuotations(res.data.data);
//       } catch (error) {
//         console.error("Error fetching quotations:", error);
//       }
//     };
//     fetchQuotations();
//   }, []);

//   const filtered = useMemo(() => {
//     if (!search.trim()) return quotations;
//     return quotations.filter((q) =>
//       (q.customerName || "").toLowerCase().includes(search.toLowerCase())
//     );
//   }, [quotations, search]);

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this quotation?")) return;
//     try {
//       const res = await axios.delete(`/api/sales-quotation/${id}`);
//       if (res.data.success)
//         setQuotations((prev) => prev.filter((q) => q._id !== id));
//     } catch {
//       alert("Failed to delete quotation");
//     }
//   };

//   const handleCopyTo = (quotation, dest) => {
//     if (dest === "Order") {
//       sessionStorage.setItem("salesOrderData", JSON.stringify(quotation));
//       router.push("/admin/sales-order-view/new");
//     }
//   };

//   return (
//     <div className="container mx-auto px-4 py-6">
//       <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
//         Sales Quotations
//       </h1>

//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
//         <div className="flex-1 relative max-w-sm">
//           <FaSearch className="absolute top-3 left-3 text-gray-400" />
//           <input
//             type="text"
//             placeholder="Filter by customer name…"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <Link href="/admin/sales-quotation-view/new">
//           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
//             <FaEdit className="mr-2" />
//             Create New Quotation
//           </button>
//         </Link>
//       </div>

//       <div className="hidden md:block overflow-x-auto">
//         <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
//           <thead className="bg-gray-100 dark:bg-gray-700">
//             <tr>
//               {["Sr. No.", "Ref Number", "Customer", "Date", "Status", "Total", "Actions"].map(
//                 (h) => (
//                   <th
//                     key={h}
//                     className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-100"
//                   >
//                     {h}
//                   </th>
//                 )
//               )}
//             </tr>
//           </thead>
//           <tbody>
//             {filtered.map((q, idx) => (
//               <tr
//                 key={q._id}
//                 className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
//               >
//                 <td className="px-4 py-3">{idx + 1}</td>
//                 <td className="px-4 py-3">{q.refNumber}</td>
//                 <td className="px-4 py-3">{q.customerName}</td>
//                 <td className="px-4 py-3">
//                   {q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB") : ""}
//                 </td>
//                 <td className="px-4 py-3">{q.status}</td>
//                 <td className="px-4 py-3">₹ {q.grandTotal}</td>
//                 <td className="px-4 py-3">
//                   <ActionBar quotation={q} handleDelete={handleDelete} handleCopyTo={handleCopyTo} />
//                 </td>
//               </tr>
//             ))}
//             {!filtered.length && (
//               <tr>
//                 <td colSpan={7} className="text-center py-5 text-gray-500 dark:text-gray-400">
//                   No matching quotations.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       <div className="md:hidden space-y-4">
//         {filtered.map((q, idx) => (
//           <div
//             key={q._id}
//             className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700"
//           >
//             <div className="font-semibold text-gray-700 dark:text-gray-100">
//               {idx + 1}. Ref {q.refNumber}
//             </div>
//             <div className="text-sm text-gray-500 dark:text-gray-300">Customer: {q.customerName}</div>
//             <div className="text-sm text-gray-500 dark:text-gray-300">
//               Date: {q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB") : ""}
//             </div>
//             <div className="text-sm text-gray-500 dark:text-gray-300">Status: {q.status}</div>
//             <div className="text-sm text-gray-500 dark:text-gray-300">Total: ₹ {q.grandTotal}</div>
//             <div className="flex flex-wrap gap-2 mt-3">
//               <ActionBar
//                 quotation={q}
//                 handleDelete={handleDelete}
//                 handleCopyTo={handleCopyTo}
//                 isMobile
//               />
//             </div>
//           </div>
//         ))}
//         {!filtered.length && (
//           <div className="text-center text-gray-500 dark:text-gray-400">No matching quotations.</div>
//         )}
//       </div>
//     </div>
//   );
// }

// function ActionBar({ quotation, handleDelete, handleCopyTo, isMobile = false }) {
//   return (
//     <div className={`flex ${isMobile ? "gap-3" : "flex-wrap gap-2 justify-center"}`}>
//       <IconBtn href={`/admin/sales-quotation-view/view/${quotation._id}`} tooltip="View" color="indigo">
//         <FaEye />
//       </IconBtn>
//       <IconBtn href={`/admin/sales-quotation-view/new?editId=${quotation._id}`} tooltip="Edit" color="blue">
//         <FaEdit />
//       </IconBtn>
//       <button
//         onClick={() => handleDelete(quotation._id)}
//         title="Delete"
//         className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
//       >
//         <FaTrash />
//       </button>
//       <CopyToDropdown quotation={quotation} onSelect={handleCopyTo} />
//       <IconBtn href={`/admin/sales-quotation-email/${quotation._id}`} tooltip="Email" color="blue">
//         <FaEnvelope />
//       </IconBtn>
//       <IconBtn href={`/admin/sales-quotation-whatsapp/${quotation._id}`} tooltip="WhatsApp" color="green">
//         <FaWhatsapp />
//       </IconBtn>
//     </div>
//   );
// }

// function IconBtn({ href, tooltip, color, children }) {
//   return (
//     <Link href={href}>
//       <button
//         className={`flex items-center px-2 py-1 bg-${color}-600 text-white rounded hover:bg-${color}-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500`}
//         title={tooltip}
//       >
//         {children}
//       </button>
//     </Link>
//   );
// }

// function CopyToDropdown({ quotation, onSelect }) {
//   const [open, setOpen] = useState(false);
//   return (
//     <div className="relative">
//       <button
//         onClick={() => setOpen((p) => !p)}
//         className="flex items-center px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
//         title="Copy To"
//       >
//         <FaCopy />
//       </button>
//       {open && (
//         <div
//           onMouseLeave={() => setOpen(false)}
//           className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-10"
//         >
//           <button
//             onClick={() => {
//               onSelect(quotation, "Order");
//               setOpen(false);
//             }}
//             className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
//           >
//             Order
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }
