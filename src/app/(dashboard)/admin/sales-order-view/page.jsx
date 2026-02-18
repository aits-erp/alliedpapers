"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
  FaFilter,
  FaTimes,
} from "react-icons/fa";

/* ================================================================= */
/*  Sales Order List                                                 */
/* ================================================================= */
export default function SalesOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    salesNumber: "",
    customerName: "",
    date: "",
    statusStages: "",
    status: "",
    grandTotal: "",
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const router = useRouter();

  /* Email modal state */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Sales Order Details");
  const [message, setMessage] = useState(
    "Dear Customer,\n\nPlease find your sales order details attached."
  );
  const [sending, setSending] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const handleOpenEmailModal = (orderId, orderEmail) => {
    setSelectedOrderId(orderId);
    setEmail(orderEmail || "");
    setIsModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!email) return alert("Email is required");
    setSending(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/send-email",
        {
          email,
          subject,
          message,
          orderId: selectedOrderId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Email sent successfully!");
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/sales-order", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
      } else {
        console.warn("Unexpected response:", res.data);
      }
    } catch (error) {
      console.error(
        "Error fetching sales orders:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ---------- filtered list ---------- */
  const displayOrders = useMemo(() => {
    const filtered = orders.filter((o) => {
      const matchesSearch =
        !search ||
        (o.salesNumber || o.refNumber || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (o.customerName || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (o.status || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.statusStages || "").toLowerCase().includes(search.toLowerCase()) ||
        new Date(o.postingDate || o.orderDate)
          .toLocaleDateString("en-GB")
          .includes(search);

      const matchesFilters =
        (!filters.salesNumber ||
          (o.salesNumber || o.refNumber || "")
            .toLowerCase()
            .includes(filters.salesNumber.toLowerCase())) &&
        (!filters.customerName ||
          (o.customerName || "")
            .toLowerCase()
            .includes(filters.customerName.toLowerCase())) &&
        (!filters.date ||
          new Date(o.postingDate || o.orderDate)
            .toLocaleDateString("en-GB")
            .includes(filters.date)) &&
        (!filters.statusStages ||
          (o.statusStages || "")
            .toLowerCase()
            .includes(filters.statusStages.toLowerCase())) &&
        (!filters.status ||
          (o.status || "")
            .toLowerCase()
            .includes(filters.status.toLowerCase())) &&
        (!filters.grandTotal ||
          String(o.grandTotal || "").includes(filters.grandTotal));

      return matchesSearch && matchesFilters;
    });

    return filtered;
  }, [orders, search, filters]);

  /* ---------- row actions ---------- */
  const handleDelete = async (id) => {
    if (!confirm("Delete this order?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/sales-order/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders((prev) => prev.filter((o) => o._id !== id));
    } catch {
      alert("Failed to delete");
    }
  };

  const handleCopyTo = (order, dest) => {
    const data = { ...order, salesOrderId: order._id, sourceModel: "SalesOrder" };
    if (dest === "Delivery") {
      sessionStorage.setItem("deliveryData", JSON.stringify(data));
      router.push("/admin/delivery-view/new");
    } else {
      sessionStorage.setItem("SalesInvoiceData", JSON.stringify(data));
      router.push("/admin/sales-invoice-view/new");
    }
  };

  const resetFilters = () => {
    setFilters({
      salesNumber: "",
      customerName: "",
      date: "",
      statusStages: "",
      status: "",
      grandTotal: "",
    });
    setSearch("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
        Sales Orders
      </h1>

      {/* toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all fields..."
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 shadow"
          >
            <FaFilter /> Filters
          </button>

          <Link href="/admin/sales-order-view/new" className="sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
              <FaEdit /> New Order
            </button>
          </Link>
        </div>
      </div>

      {/* table */}
      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="hidden md:block overflow-x-auto">
          <Table
            orders={displayOrders}
            filters={filters}
            setFilters={setFilters}
            onDelete={handleDelete}
            onCopy={handleCopyTo}
            onEmail={handleOpenEmailModal}
          />
        </div>
      )}

      {/* mobile cards */}
      <div className="md:hidden grid gap-4">
        {displayOrders.length > 0 ? (
          displayOrders.map((o, i) => 
            (
            <Card
              key={o._id}
              order={o}
              idx={i}
              onDelete={handleDelete}
              onCopy={handleCopyTo}
              onEmail={handleOpenEmailModal}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No matching orders
          </p>
        )}
      </div>

      {/* Email Modal */}
      <EmailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSend={handleSendEmail}
        email={email}
        setEmail={setEmail}
        subject={subject}
        setSubject={setSubject}
        message={message}
        setMessage={setMessage}
        sending={sending}
      />
    </div>
  );
}

/* ================================================================= */
/*  Table Component                                                  */
/* ================================================================= */
function Table({ orders, filters, setFilters, onDelete, onCopy, onEmail }) {
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="overflow-x-auto border rounded-lg shadow">
      <table className="min-w-full bg-white dark:bg-gray-800">
        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 text-sm z-10">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Sales Order No.</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Sales Stages</th>
            {/* <th className="px-4 py-3">Status</th> */}
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Attachments</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
          <tr className="bg-gray-50 dark:bg-gray-800 text-xs">
            <td></td>
            {["salesNumber", "customerName", "date", "statusStages", "status", "grandTotal"].map(
              (field, idx) => (
                <td key={idx} className="px-4 py-2">
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filters[field]}
                    onChange={(e) => handleFilterChange(field, e.target.value)}
                    className="w-full px-2 py-1 rounded border text-xs"
                  />
                </td>
              )
            )}
            <td></td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {[...orders].reverse().map((o, i) => (
            <tr
              key={o._id}
              className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <td className="px-4 py-3">{i + 1}</td>
              <td className="px-4 py-3">{o.salesNumber || o.refNumber}</td>
              <td className="px-4 py-3">{o.customerName}</td>
              <td className="px-4 py-3">
                {new Date(o.postingDate || o.orderDate).toLocaleDateString("en-GB")}
              </td>
              <td className="px-4 py-3">{o.statusStages}</td>
              {/* <td className="px-4 py-3">{o.status}</td> */}
              <td className="px-4 py-3">₹{o.grandTotal}</td>
           
              <td className="px-4 py-3">
  {Array.isArray(o.attachments) && o.attachments.length > 0 ? (
    <div className="flex flex-col gap-1 max-w-[180px]">
      {o.attachments.slice(0, 3).map((file, idx) => {
        // normalize
        const rawUrl =
          typeof file === "string"
            ? file
            : file?.fileUrl || file?.url || file?.path || "";

        if (!rawUrl) return null;

        // ensure absolute path for local uploads
        const url = rawUrl.startsWith("http")
          ? rawUrl
          : `${window.location.origin}${rawUrl}`;

        const fileName =
          file?.fileName || rawUrl.split("/").pop() || "file";

        const isPdf =
          file?.fileType === "application/pdf" ||
          fileName.toLowerCase().endsWith(".pdf");

        return (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 text-xs underline truncate hover:text-blue-800"
            title={fileName}
          >
            <span>{isPdf ? "📄" : "🖼️"}</span>
            <span className="truncate">
              {fileName.length > 18 ? fileName.slice(0, 18) + "…" : fileName}
            </span>
          </a>
        );
      })}

      {o.attachments.length > 3 && (
        <span className="text-[10px] text-gray-400">
          +{o.attachments.length - 3} more
        </span>
      )}
    </div>
  ) : (
    <span className="text-xs text-gray-400">No files</span>
  )}
</td>

              <td className="px-4 py-3">
                <RowMenu
                  order={o}
                  onDelete={onDelete}
                  onCopy={onCopy}
                  onEmail={onEmail}
                />
              </td>
            </tr>
          ))}
          {!orders.length && (
            <tr>
              <td colSpan={9} className="text-center py-6 text-gray-500 dark:text-gray-400">
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


/* ================================================================= */
/*  Row Menu                                                        */
/* ================================================================= */
function RowMenu({ order, onDelete, onCopy, onEmail }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position dynamically to prevent overflow
  useEffect(() => {
    if (open && btnRef.current && menuRef.current) {
      const btnRect = btnRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = btnRect.bottom + 8;
      let left = btnRect.right - menuRect.width;

      // Adjust if overflow bottom
      if (top + menuRect.height > viewportHeight) {
        top = btnRect.top - menuRect.height - 8;
      }

      // Adjust if overflow right
      if (left + menuRect.width > viewportWidth) {
        left = viewportWidth - menuRect.width - 8;
      }

      // Adjust if overflow left
      if (left < 0) left = 8;

      setPosition({ top, left });
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
      >
        <FaEllipsisV size={16} />
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 50,
          }}
          className="w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg"
        >
          <MenuItem icon={<FaEye />} label="View" onClick={() => (window.location.href = `/admin/sales-order-view/view/${order._id}`)} />
          <MenuItem icon={<FaEdit />} label="Edit" onClick={() => (window.location.href = `/admin/sales-order-view/new?editId=${order._id}`)} />
          <MenuItem icon={<FaCopy />} label="Copy → Delivery" onClick={() => onCopy(order, "Delivery")} />
          <MenuItem icon={<FaCopy />} label="Copy → Invoice" onClick={() => onCopy(order, "Invoice")} />
          <MenuItem icon={<FaEnvelope />} label="Email" onClick={() => onEmail(order._id, order.customerEmail)} />
          <MenuItem icon={<FaWhatsapp />} label="WhatsApp" onClick={() => (window.location.href = `/admin/sales-order-whatsapp/${order._id}`)} />
          <MenuItem icon={<FaTrash />} label="Delete" color="text-red-600" onClick={() => onDelete(order._id)} />
        </div>
      )}
    </>
  );
}

function MenuItem({ icon, label, onClick, color = "" }) {
  return (
    <button
      onClick={() => {
        onClick();
      }}
      className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
    >
      <span className={color}>{icon}</span> {label}
    </button>
  );
}


/* ================================================================= */
/*  Email Modal                                                     */
/* ================================================================= */
function EmailModal({
  isOpen,
  onClose,
  onSend,
  email,
  setEmail,
  subject,
  setSubject,
  message,
  setMessage,
  sending,
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Send Email</h2>
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Recipient Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
          <textarea
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border rounded h-28"
          />
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
          <button
            onClick={onSend}
            disabled={sending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ================================================================= */
/*  Card Component for Mobile                                       */
/* ================================================================= */
function Card({ order, idx, onDelete, onCopy, onEmail }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {order.salesNumber || order.refNumber}
        </h3>
        <button
          onClick={() => onDelete(order._id)}
          className="text-red-600 hover:text-red-800"
        >
          <FaTrash />
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Customer: {order.customerName}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Date: {new Date(order.postingDate || order.orderDate).toLocaleDateString("en-GB")}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300">Stage: {order.statusStages}</p>
      <p className="text-sm text-gray-600 dark:text-gray-300">Status: {order.status}</p>
      <p className="text-sm font-bold mt-2 text-gray-800 dark:text-gray-200">
        ₹{order.grandTotal}
      </p>

      {/* Attachments */}
      {Array.isArray(order.attachments) && order.attachments.length > 0 ? (
    <div className="flex flex-col gap-1 max-w-[180px]">
      {order.attachments.slice(0, 3).map((file, idx) => {
        // normalize
        const rawUrl =
          typeof file === "string"
            ? file
            : file?.fileUrl || file?.url || file?.path || "";

        if (!rawUrl) return null;

        // ensure absolute path for local uploads
        const url = rawUrl.startsWith("http")
          ? rawUrl
          : `${window.location.origin}${rawUrl}`;

        const fileName =
          file?.fileName || rawUrl.split("/").pop() || "file";

        const isPdf =
          file?.fileType === "application/pdf" ||
          fileName.toLowerCase().endsWith(".pdf");

        return (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 text-xs underline truncate hover:text-blue-800"
            title={fileName}
          >
            <span>{isPdf ? "📄" : "🖼️"}</span>
            <span className="truncate">
              {fileName.length > 18 ? fileName.slice(0, 18) + "…" : fileName}
            </span>
          </a>
        );
      })}

      {order.attachments.length > 3 && (
        <span className="text-[10px] text-gray-400">
          +{order.attachments.length - 3} more
        </span>
      )}
    </div>
  ) : (
    <span className="text-xs text-gray-400">No files</span>
  )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={() => (window.location.href = `/admin/sales-order-view/view/${order._id}`)}
          className="flex items-center gap-1 px-3 py-1 bg-gray-200 rounded text-sm"
        >
          <FaEye /> View
        </button>
        <button
          onClick={() => (window.location.href = `/admin/sales-order-view/new?editId=${order._id}`)}
          className="flex items-center gap-1 px-3 py-1 bg-yellow-400 text-white rounded text-sm"
        >
          <FaEdit /> Edit
        </button>
        <button
          onClick={() => onCopy(order, "Delivery")}
          className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded text-sm"
        >
          <FaCopy /> Delivery
        </button>
        <button
          onClick={() => onCopy(order, "Invoice")}
          className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          <FaCopy /> Invoice
        </button>
        <button
          onClick={() => onEmail(order._id, order.customerEmail)}
          className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded text-sm"
        >
          <FaEnvelope /> Email
        </button>
        <button
          onClick={() => (window.location.href = `/admin/sales-order-whatsapp/${order._id}`)}
          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm"
        >
          <FaWhatsapp /> WhatsApp
        </button>
      </div>
    </div>
  );
}



// 'use client';

// import { useState, useEffect, useMemo, useRef } from 'react';
// import Link from 'next/link';
// import axios from 'axios';
// import { useRouter } from 'next/navigation';
// import {
//   FaEllipsisV,
//   FaEdit,
//   FaTrash,
//   FaCopy,
//   FaEye,
//   FaEnvelope,
//   FaWhatsapp,
//   FaSearch,
//   FaFilter,
//   FaTimes
// } from 'react-icons/fa';

// /* ================================================================= */
// /*  Sales Order List                                                 */
// /* ================================================================= */
// export default function SalesOrderList() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [filters, setFilters] = useState({
//     salesNumber: '',
//     customerName: '',
//     date: '',
//     statusStages: '',
//     status: '',
//     grandTotal: ''
//   });
//   const [showMobileFilters, setShowMobileFilters] = useState(false);
//   const router = useRouter();

//   const fetchOrders = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get("/api/sales-order", {
//         headers: {
//           Authorization: `Bearer ${token}`
//         }
//       });

//       if (res.data?.success && Array.isArray(res.data.data)) {
//         setOrders(res.data.data);
//       } else {
//         console.warn("Unexpected response:", res.data);
//       }
//     } catch (error) {
//       console.error("Error fetching sales orders:", error.response?.data || error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   /* ---------- filtered list ---------- */
//   const displayOrders = useMemo(() => {
//     const filtered = orders.filter((o) => {
//       const matchesSearch = !search || 
//         (o.salesNumber || o.refNumber || '').toLowerCase().includes(search.toLowerCase()) ||
//         (o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
//         (o.status || '').toLowerCase().includes(search.toLowerCase()) ||
//         (o.statusStages || '').toLowerCase().includes(search.toLowerCase()) ||
//         new Date(o.postingDate || o.orderDate).toLocaleDateString('en-GB').includes(search);

//       const matchesFilters = 
//         (!filters.salesNumber || (o.salesNumber || o.refNumber || '').toLowerCase().includes(filters.salesNumber.toLowerCase())) &&
//         (!filters.customerName || (o.customerName || '').toLowerCase().includes(filters.customerName.toLowerCase())) &&
//         (!filters.date || new Date(o.postingDate || o.orderDate).toLocaleDateString('en-GB').includes(filters.date)) &&
//         (!filters.statusStages || (o.statusStages || '').toLowerCase().includes(filters.statusStages.toLowerCase())) &&
//         (!filters.status || (o.status || '').toLowerCase().includes(filters.status.toLowerCase())) &&
//         (!filters.grandTotal || String(o.grandTotal || '').includes(filters.grandTotal));

//       return matchesSearch && matchesFilters;
//     });

//     return filtered;
//   }, [orders, search, filters]);

//   /* ---------- row actions ---------- */
//   const handleDelete = async (id) => {
//     if (!confirm('Delete this order?')) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/sales-order/${id}`, {
//         headers: {
//           Authorization: `Bearer ${token}`
//         }
//       });
//       setOrders((prev) => prev.filter((o) => o._id !== id));
//     } catch {
//       alert('Failed to delete');
//     }
//   };

//   const handleCopyTo = (order, dest) => {
//     const data = { ...order, salesOrderId: order._id, sourceModel: 'SalesOrder' };
//     if (dest === 'Delivery') {
//       sessionStorage.setItem('deliveryData', JSON.stringify(data));
//       router.push('/admin/delivery-view/new');
//     } else {
//       sessionStorage.setItem('SalesInvoiceData', JSON.stringify(data));
//       router.push('/admin/sales-invoice-view/new');
//     }
//   };

//   const resetFilters = () => {
//     setFilters({
//       salesNumber: '',
//       customerName: '',
//       date: '',
//       statusStages: '',
//       status: '',
//       grandTotal: ''
//     });
//     setSearch('');
//   };

//   /* ================================================================= */
//   /*  UI                                                               */
//   /* ================================================================= */
//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6">
//       <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
//         Sales Orders
//       </h1>

//       {/* toolbar */}
//       <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
//         <div className="relative flex-1 max-w-md">
//           <FaSearch className="absolute top-3 left-3 text-gray-400" />
//           <input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search all fields..."
//             className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
//           />
//         </div>

//         <div className="flex gap-2">
//           <button 
//             onClick={() => setShowMobileFilters(true)}
//             className="md:hidden flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 shadow"
//           >
//             <FaFilter /> Filters
//           </button>
          
//           <Link href="/admin/sales-order-view/new" className="sm:w-auto">
//             <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
//               <FaEdit /> New Order
//             </button>
//           </Link>
//         </div>
//       </div>

//       {/* Filter summary bar */}
//       {Object.values(filters).some(val => val) && (
//         <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded flex flex-wrap gap-2">
//           {filters.salesNumber && (
//             <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
//               Order#: {filters.salesNumber}
//             </span>
//           )}
//           {filters.customerName && (
//             <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
//               Customer: {filters.customerName}
//             </span>
//           )}
//           {filters.date && (
//             <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
//               Date: {filters.date}
//             </span>
//           )}
//           {filters.statusStages && (
//             <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
//               Stage: {filters.statusStages}
//             </span>
//           )}
//           {filters.status && (
//             <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
//               Status: {filters.status}
//             </span>
//           )}
//           {filters.grandTotal && (
//             <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
//               Total: {filters.grandTotal}
//             </span>
//           )}
//           <button 
//             onClick={resetFilters}
//             className="ml-auto flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline"
//           >
//             <FaTimes /> Clear all
//           </button>
//         </div>
//       )}

//       {/* Mobile Filter Modal */}
//       {showMobileFilters && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-16 md:hidden">
//           <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="text-xl font-bold">Filters</h2>
//               <button 
//                 onClick={() => setShowMobileFilters(false)}
//                 className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
//               >
//                 <FaTimes size={20} />
//               </button>
//             </div>
            
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Order Number</label>
//                 <input
//                   type="text"
//                   value={filters.salesNumber}
//                   onChange={(e) => setFilters(prev => ({ ...prev, salesNumber: e.target.value }))}
//                   placeholder="Filter by order number"
//                   className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Customer Name</label>
//                 <input
//                   type="text"
//                   value={filters.customerName}
//                   onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))}
//                   placeholder="Filter by customer"
//                   className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Date (DD/MM/YYYY)</label>
//                 <input
//                   type="text"
//                   value={filters.date}
//                   onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
//                   placeholder="e.g. 01/01/2023"
//                   className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Sales Stage</label>
//                 <input
//                   type="text"
//                   value={filters.statusStages}
//                   onChange={(e) => setFilters(prev => ({ ...prev, statusStages: e.target.value }))}
//                   placeholder="Filter by stage"
//                   className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Status</label>
//                 <input
//                   type="text"
//                   value={filters.status}
//                   onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
//                   placeholder="Filter by status"
//                   className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Total Amount</label>
//                 <input
//                   type="text"
//                   value={filters.grandTotal}
//                   onChange={(e) => setFilters(prev => ({ ...prev, grandTotal: e.target.value }))}
//                   placeholder="Filter by total"
//                   className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
//                 />
//               </div>
//             </div>
            
//             <div className="mt-6 flex gap-3">
//               <button 
//                 onClick={resetFilters}
//                 className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-400"
//               >
//                 Reset
//               </button>
//               <button 
//                 onClick={() => setShowMobileFilters(false)}
//                 className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
//               >
//                 Apply
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* table / cards */}
//       {loading ? (
//         <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
//       ) : (
//         <>
//           {/* desktop */}
//           <div className="hidden md:block overflow-x-auto">
//             <Table 
//               orders={displayOrders} 
//               filters={filters} 
//               setFilters={setFilters} 
//               onDelete={handleDelete} 
//               onCopy={handleCopyTo} 
//             />
//           </div>

//           {/* mobile cards */}
//           <div className="md:hidden grid gap-4">
//             {displayOrders.length > 0 ? (
//               displayOrders.map((o, i) => (
//                 <Card key={o._id} order={o} idx={i} onDelete={handleDelete} onCopy={handleCopyTo} />
//               ))
//             ) : (
//               <p className="text-center text-gray-500 dark:text-gray-400">No matching orders</p>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// function Table({ orders, filters, setFilters, onDelete, onCopy }) {
//   const handleFilterChange = (key, value) => {
//     setFilters(prev => ({ ...prev, [key]: value }));
//   };

//   return (
//     <div className="overflow-x-auto">
//       <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
//         <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
//           <tr>
//             <th className="px-4 py-3">#</th>
//             <th className="px-4 py-3">Sales Order No.</th>
//             <th className="px-4 py-3">Customer</th>
//             <th className="px-4 py-3">Date</th>
//             <th className="px-4 py-3">Sales Stages</th>
//             <th className="px-4 py-3">Status</th>
//             <th className="px-4 py-3">Total</th>
//             <th className="px-4 py-3">Attachments</th>
//             <th className="px-4 py-3">Actions</th>
//           </tr>
//           <tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
//             <td className="px-4 py-2"></td>
//             <td className="px-4 py-2">
//               <input
//                 type="text"
//                 placeholder="Filter..."
//                 value={filters.salesNumber}
//                 onChange={(e) => handleFilterChange("salesNumber", e.target.value)}
//                 className="w-full px-2 py-1 rounded border text-xs"
//               />
//             </td>
//             <td className="px-4 py-2">
//               <input
//                 type="text"
//                 placeholder="Filter..."
//                 value={filters.customerName}
//                 onChange={(e) => handleFilterChange("customerName", e.target.value)}
//                 className="w-full px-2 py-1 rounded border text-xs"
//               />
//             </td>
//             <td className="px-4 py-2">
//               <input
//                 type="text"
//                 placeholder="DD/MM/YYYY"
//                 value={filters.date}
//                 onChange={(e) => handleFilterChange("date", e.target.value)}
//                 className="w-full px-2 py-1 rounded border text-xs"
//               />
//             </td>
//             <td className="px-4 py-2">
//               <input
//                 type="text"
//                 placeholder="Filter stage"
//                 value={filters.statusStages}
//                 onChange={(e) => handleFilterChange("statusStages", e.target.value)}
//                 className="w-full px-2 py-1 rounded border text-xs"
//               />
//             </td>
//             <td className="px-4 py-2">
//               <input
//                 type="text"
//                 placeholder="Filter status"
//                 value={filters.status}
//                 onChange={(e) => handleFilterChange("status", e.target.value)}
//                 className="w-full px-2 py-1 rounded border text-xs"
//               />
//             </td>
//             <td className="px-4 py-2">
//               <input
//                 type="text"
//                 placeholder="Filter total"
//                 value={filters.grandTotal}
//                 onChange={(e) => handleFilterChange("grandTotal", e.target.value)}
//                 className="w-full px-2 py-1 rounded border text-xs"
//               />
//             </td>
//             <td className="px-4 py-2"></td>
//             <td className="px-4 py-2"></td>
//           </tr>
//         </thead>
//         <tbody>
//           {[...orders].reverse().map((o, i) => (
//             <tr
//               key={o._id}
//               className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
//             >
//               <td className="px-4 py-3">{i + 1}</td>
//               <td className="px-4 py-3">{o.salesNumber || o.refNumber}</td>
//               <td className="px-4 py-3">{o.customerName}</td>
//               <td className="px-4 py-3">
//                 {new Date(o.postingDate || o.orderDate).toLocaleDateString("en-GB")}
//               </td>
//               <td className="px-4 py-3">{o.statusStages}</td>
//               <td className="px-4 py-3">{o.status}</td>
//               <td className="px-4 py-3">₹{o.grandTotal}</td>
//               <td className="px-4 py-3">
//                 {Array.isArray(o.attachments) && o.attachments.length > 0 ? (
//                   <div className="flex flex-col gap-1 max-w-[140px]">
//                     {o.attachments.slice(0, 3).map((file, idx) => {
//                       const url =
//                         typeof file === 'string'
//                           ? file
//                           : file?.fileUrl || file?.url || file?.path || file?.location || '';
//                       const fileName = file?.fileName || url.split('/').pop();
//                       const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
//                       const isPdf = /\.pdf$/i.test(url);

//                       return url ? (
//                         <a
//                           key={idx}
//                           href={url}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="text-blue-600 text-xs underline truncate"
//                           title={fileName}
//                         >
//                           {isImage ? '🖼' : isPdf ? '📄' : '📎'} {fileName.slice(0, 15)}...
//                         </a>
//                       ) : null;
//                     })}
//                     {o.attachments.length > 3 && (
//                       <span className="text-xs text-gray-500">
//                         +{o.attachments.length - 3} more
//                       </span>
//                     )}
//                   </div>
//                 ) : (
//                   <span className="text-xs text-gray-400">No files</span>
//                 )}
//               </td>
//               <td className="px-4 py-3">
//                 <RowMenu order={o} onDelete={onDelete} onCopy={onCopy} />
//               </td>
//             </tr>
//           ))}
//           {!orders.length && (
//             <tr>
//               <td
//                 colSpan={9}
//                 className="text-center py-6 text-gray-500 dark:text-gray-400"
//               >
//                 No orders found.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// /* ================================================================= */
// /*  Mobile Card                                                      */
// /* ================================================================= */
// function Card({ order, idx, onDelete, onCopy }) {
//   return (
//     <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
//       <div className="flex justify-between items-start">
//         <div className="font-semibold text-gray-700 dark:text-gray-100">
//           #{idx + 1} • {order.salesNumber || order.refNumber}
//         </div>
//         <RowMenu order={order} onDelete={onDelete} onCopy={onCopy} isMobile />
//       </div>

//       <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
//         <strong>Customer:</strong> {order.customerName}
//       </p>
//       <p className="text-sm text-gray-500 dark:text-gray-300">
//         <strong>Date:</strong> {new Date(order.postingDate || order.orderDate).toLocaleDateString('en-GB')}
//       </p>
//       <p className="text-sm text-gray-500 dark:text-gray-300">
//         <strong>Sales Stage:</strong> {order.statusStages}
//       </p>
//       <p className="text-sm text-gray-500 dark:text-gray-300">
//         <strong>Status:</strong> {order.status}
//       </p>
//       <p className="text-sm text-gray-500 dark:text-gray-300">
//         <strong>Total:</strong> ₹{order.grandTotal}
//       </p>

//       {/* Attachments Section */}
//       <div className="mt-2">
//         <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Attachments:</p>
//         {Array.isArray(order.attachments) && order.attachments.length > 0 ? (
//           <div className="flex flex-col gap-1 mt-1">
//             {order.attachments.slice(0, 3).map((file, idx) => {
//               const url =
//                 typeof file === 'string'
//                   ? file
//                   : file?.fileUrl || file?.url || file?.path || file?.location || '';
//               const fileName = file?.fileName || url.split('/').pop();
//               const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
//               const isPdf = /\.pdf$/i.test(url);

//               return url ? (
//                 <a
//                   key={idx}
//                   href={url}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="text-blue-600 text-xs underline truncate"
//                   title={fileName}
//                 >
//                   {isImage ? '🖼' : isPdf ? '📄' : '📎'} {fileName.slice(0, 20)}...
//                 </a>
//               ) : null;
//             })}
//             {order.attachments.length > 3 && (
//               <span className="text-xs text-gray-400">
//                 +{order.attachments.length - 3} more
//               </span>
//             )}
//           </div>
//         ) : (
//           <p className="text-xs text-gray-400 mt-1">No files</p>
//         )}
//       </div>
//     </div>
//   );
// }

// /* ================================================================= */
// /*  Row Action Menu (dropdown)                                       */
// /* ================================================================= */
// // function RowMenu({ order, onDelete, onCopy }) {
// //   const [open, setOpen] = useState(false);
// //   const btnRef = useRef(null);

// //   const [coords, setCoords] = useState({ top: 0, left: 0 });
// //   useEffect(() => {
// //     if (open && btnRef.current) {
// //       const { bottom, right } = btnRef.current.getBoundingClientRect();
// //       setCoords({ top: bottom + 8, left: right - 192 });
// //     }
// //   }, [open]);

// //   const MenuItem = ({ icon, label, onClick, color = '' }) => (
// //     <button
// //       onClick={() => { onClick(); setOpen(false); }}
// //       className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
// //     >
// //       <span className={`${color}`}>{icon}</span> {label}
// //     </button>
// //   );

// //   return (
// //     <>
// //       <button
// //         ref={btnRef}
// //         onClick={() => setOpen(!open)}
// //         className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full focus:ring-2 focus:ring-blue-500"
// //       >
// //         <FaEllipsisV size={16} />
// //       </button>

// //       {open && (
// //         <div
// //           style={{ top: coords.top, left: coords.left }}
// //           className="fixed z-50 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg"
// //         >
// //           <MenuItem icon={<FaEye />} label="View"
// //             onClick={() => (window.location.href = `/admin/sales-order-view/view/${order._id}`)}
// //           />
// //           <MenuItem icon={<FaEdit />} label="Edit"
// //             onClick={() => (window.location.href = `/admin/sales-order-view/new?editId=${order._id}`)}
// //           />
// //           <MenuItem icon={<FaCopy />} label="Copy → Delivery"
// //             onClick={() => onCopy(order, 'Delivery')}
// //           />
// //           <MenuItem icon={<FaCopy />} label="Copy → Invoice"
// //             onClick={() => onCopy(order, 'Invoice')}
// //           />
// //           <MenuItem icon={<FaEnvelope />} label="Email"
// //             onClick={() => (window.location.href = `/admin/sales-order-email/${order._id}`)}
// //           />
// //           <MenuItem icon={<FaWhatsapp />} label="WhatsApp"
// //             onClick={() => (window.location.href = `/admin/sales-order-whatsapp/${order._id}`)}
// //           />
// //           <MenuItem icon={<FaTrash />} label="Delete" color="text-red-600"
// //             onClick={() => onDelete(order._id)}
// //           />
// //         </div>
// //       )}
// //     </>
// //   );
// // }





// // 'use client';

// // import { useState, useEffect, useMemo,useRef } from 'react';
// // import Link from 'next/link';
// // import axios from 'axios';
// // import { useRouter } from 'next/navigation';
// // import {
// //   FaEllipsisV,
// //   FaEdit,
// //   FaTrash,
// //   FaCopy,
// //   FaEye,
// //   FaEnvelope,
// //   FaWhatsapp,
// //   FaSearch,
// // } from 'react-icons/fa';

// // /* ================================================================= */
// // /*  Sales Order List                                                 */
// // /* ================================================================= */
// // export default function SalesOrderList() {
// //   const [orders, setOrders] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [search, setSearch] = useState('');
// //   const router = useRouter();


// //   //   const fetchOrders = async () => {
// //   //   try {
// //   //     const res = await axios.get("/api/sales-order");
// //   //     console.log("Fetched orders:", res.data.data);
// //   //     //Expecting an object with a success flag and a data array.
// //   //     if (res.data.success) {
// //   //       setOrders(res.data);
// //   //     }
// //   //   setOrders(res.data);
// //   //   } catch (error) {
// //   //     console.error("Error fetching sales orders:", error);
// //   //   } finally {
// //   //       setLoading(false);
// //   //     }
// //   // };



// //   const fetchOrders = async () => {
// //   setLoading(true);
// //   try {
// //     const token = localStorage.getItem("token");

// //     const res = await axios.get("/api/sales-order", {
// //       headers: {
// //         Authorization: `Bearer ${token}`
// //       }
// //     });

// //     console.log("Fetched orders:", res.data?.data);

// //     if (res.data?.success && Array.isArray(res.data.data)) {
// //       setOrders(res.data.data);
// //     } else {
// //       console.warn("Unexpected response:", res.data);
// //     }
// //   } catch (error) {
// //     console.error("Error fetching sales orders:", error.response?.data || error.message);
// //   } finally {
// //     setLoading(false);
// //   }
// // };

// //   useEffect(() => {
// //     fetchOrders();
// //   }, []);

// //   /* ---------- fetch orders ---------- */
// //   // useEffect(() => {
// //   //   (async () => {
// //   //     try {
// //   //         const res = await axios.get("/api/sales-order");
// //   //         if (res.data.success) {
// //   //       setOrders(res.data);
// //   //     }
// //   //     } catch (err) {
// //   //       console.error('Error fetching orders:', err);
// //   //     } finally {
// //   //       setLoading(false);
// //   //     }
// //   //   })();
// //   // }, []);

// //   /* ---------- filtered list ---------- */
// //   const displayOrders = useMemo(() => {
// //     if (!search.trim()) return orders;
// //     const q = search.toLowerCase();
// //     return orders.filter((o) => (o.customerName || '').toLowerCase().includes(q));
// //   }, [orders, search]);

// //   /* ---------- row actions ---------- */
// //   const handleDelete = async (id) => {
// //     if (!confirm('Delete this order?')) return;
// //     try {
// //       await axios.delete(`/api/sales-order/${id}`);
// //       setOrders((prev) => prev.filter((o) => o._id !== id));
// //     } catch {
// //       alert('Failed to delete');
// //     }
// //   };

// //   const handleCopyTo = (order, dest) => {
// //     const data = { ...order, salesOrderId: order._id, sourceModel: 'SalesOrder' };
// //     if (dest === 'Delivery') {
// //       sessionStorage.setItem('deliveryData', JSON.stringify(data));
// //       router.push('/admin/delivery-view/new');
// //     } else {
// //       sessionStorage.setItem('SalesInvoiceData', JSON.stringify(data));
// //       router.push('/admin/sales-invoice-view/new');
// //     }
// //   };

// //   /* ================================================================= */
// //   /*  UI                                                               */
// //   /* ================================================================= */
// //   return (
// //     <div className="max-w-7xl mx-auto px-4 py-6">
// //       <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
// //         Sales Orders
// //       </h1>

// //       {/* toolbar */}
// //       <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
// //         <div className="relative flex-1 max-w-md">
// //           <FaSearch className="absolute top-3 left-3 text-gray-400" />
// //           <input
// //             value={search}
// //             onChange={(e) => setSearch(e.target.value)}
// //             placeholder="Search customer…"
// //             className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
// //           />
// //         </div>

// //         <Link href="/admin/sales-order-view/new" className="sm:w-auto">
// //           <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
// //             <FaEdit /> New Order
// //           </button>
// //         </Link>
// //       </div>

// //       {/* table / cards */}
// //       {loading ? (
// //         <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
// //       ) : (
// //         <>
// //           {/* desktop */}
// //           <div className="hidden md:block overflow-x-auto">
// //             <Table orders={displayOrders} onDelete={handleDelete} onCopy={handleCopyTo} />
// //           </div>

// //           {/* mobile cards */}
// //           <div className="md:hidden space-y-4">
// //             {displayOrders.map((o, i) => (
// //               <Card
// //                 key={o._id}
// //                 order={o}
// //                 idx={i}
// //                 onDelete={handleDelete}
// //                 onCopy={handleCopyTo}
// //               />
// //             ))}
// //             {!displayOrders.length && (
// //               <p className="text-center text-gray-500 dark:text-gray-400">
// //                 No matching orders
// //               </p>
// //             )}
// //           </div>
// //         </>
// //       )}
// //     </div>
// //   );
// // }

// // /* ================================================================= */
// // /*  Desktop Table                                                    */
// // /* ================================================================= */
// // function Table({ orders, onDelete, onCopy }) {
// //   return (
// //     <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
// //       <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
// //         <tr>
// //           {['#', 'Sales Order No.', 'Customer', 'Date','Sales Stages', 'Status', 'Total', ''].map((h) => (
// //             <th
// //               key={h}
// //               className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-100"
// //             >
// //               {h}
// //             </th>
// //           ))}
// //         </tr>
// //       </thead>
// //       <tbody>
// //         {orders.map((o, i) => (
// //           <tr
// //             key={o._id}
// //             className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
// //           >
// //             <td className="px-4 py-3">{i + 1}</td>
// //             <td className="px-4 py-3">{o.salesNumber || o.refNumber}</td>
// //             <td className="px-4 py-3">{o.customerName}</td>
// //             <td className="px-4 py-3">
// //               {new Date(o.postingDate || o.orderDate).toLocaleDateString('en-GB')}
// //             </td>
// //             <td className="px-4 py-3">{o.statusStages}</td>
// //             <td className="px-4 py-3">{o.status}</td>
// //             <td className="px-4 py-3">₹{o.grandTotal}</td>
// //             <td className="px-4 py-3">
// //               <RowMenu order={o} onDelete={onDelete} onCopy={onCopy} />
// //             </td>
// //           </tr>
// //         ))}
// //         {!orders.length && (
// //           <tr>
// //             <td colSpan={7} className="text-center py-6 text-gray-500 dark:text-gray-400">
// //               No orders found.
// //             </td>
// //           </tr>
// //         )}
// //       </tbody>
// //     </table>
// //   );
// // }

// // /* ================================================================= */
// // /*  Mobile Card                                                      */
// // /* ================================================================= */
// // function Card({ order, idx, onDelete, onCopy }) {
// //   return (
// //     <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
// //       <div className="flex justify-between">
// //         <div className="font-semibold text-gray-700 dark:text-gray-100">
// //           #{idx + 1} • {order.salesNumber || order.refNumber}
// //         </div>
// //         <RowMenu order={order} onDelete={onDelete} onCopy={onCopy} isMobile />
// //       </div>
// //       <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
// //         Customer: {order.customerName}
// //       </p>
// //       <p className="text-sm text-gray-500 dark:text-gray-300">
// //         Date: {new Date(order.postingDate || order.orderDate).toLocaleDateString('en-GB')}
// //       </p>
// //       <p className="text-sm text-gray-500 dark:text-gray-300">Status: {order.status}</p>
// //       <p className="text-sm text-gray-500 dark:text-gray-300">Total: ₹{order.grandTotal}</p>
// //     </div>
// //   );
// // }

// // /* ================================================================= */
// // /*  Row Action Menu (dropdown)                                       */
// // /* ================================================================= */
// // function RowMenu({ order, onDelete, onCopy }) {
// //   const [open, setOpen] = useState(false);
// //   const btnRef = useRef(null);

// //   /* --- find button coords for fixed menu --- */
// //   const [coords, setCoords] = useState({ top: 0, left: 0 });
// //   useEffect(() => {
// //     if (open && btnRef.current) {
// //       const { bottom, right } = btnRef.current.getBoundingClientRect();
// //       setCoords({ top: bottom + 8, left: right - 192 /* menu width */ });
// //     }
// //   }, [open]);

// //   const MenuItem = ({ icon, label, onClick, color = '' }) => (
// //     <button
// //       onClick={() => { onClick(); setOpen(false); }}
// //       className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
// //     >
// //       <span className={`${color}`}>{icon}</span> {label}
// //     </button>
// //   );

// //   return (
// //     <>
// //       <button
// //         ref={btnRef}
// //         onClick={() => setOpen(!open)}
// //         className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full focus:ring-2 focus:ring-blue-500"
// //       >
// //         <FaEllipsisV size={16} />
// //       </button>

// //       {open && (
// //         <div
// //           style={{ top: coords.top, left: coords.left }}
// //           className="fixed z-50 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg"
// //         >
// //           <MenuItem icon={<FaEye />} label="View"
// //             onClick={() => (window.location.href = `/admin/sales-order-view/view/${order._id}`)}
// //           />
// //           <MenuItem icon={<FaEdit />} label="Edit"
// //             onClick={() => (window.location.href = `/admin/sales-order-view/new?editId=${order._id}`)}
// //           />
// //           <MenuItem icon={<FaCopy />} label="Copy → Delivery"
// //             onClick={() => onCopy(order, 'Delivery')}
// //           />
// //           <MenuItem icon={<FaCopy />} label="Copy → Invoice"
// //             onClick={() => onCopy(order, 'Invoice')}
// //           />
// //           <MenuItem icon={<FaEnvelope />} label="Email"
// //             onClick={() => (window.location.href = `/admin/sales-order-email/${order._id}`)}
// //           />
// //           <MenuItem icon={<FaWhatsapp />} label="WhatsApp"
// //             onClick={() => (window.location.href = `/admin/sales-order-whatsapp/${order._id}`)}
// //           />
// //           <MenuItem icon={<FaTrash />} label="Delete" color="text-red-600"
// //             onClick={() => onDelete(order._id)}
// //           />
// //         </div>
// //       )}
// //     </>
// //   );
// // }




// // "use client";

// // import { useState, useEffect } from "react";
// // import Link from "next/link";
// // import axios from "axios";
// // import { useRouter } from "next/navigation";
// // import { FaEdit, FaTrash, FaCopy, FaEye, FaEnvelope, FaWhatsapp } from "react-icons/fa";

// // export default function SalesOrderList() {
// //   const [orders, setOrders] = useState([]);
// //   const router = useRouter();







//   // const fetchOrders = async () => {
//   //   try {
//   //     const res = await axios.get("/api/sales-order");
//   //     console.log("Fetched orders:", res.data.data);
//   //     //Expecting an object with a success flag and a data array.
//   //     if (res.data.success) {
//   //       setOrders(res.data);
//   //     }
//   //   setOrders(res.data);
//   //   } catch (error) {
//   //     console.error("Error fetching sales orders:", error);
//   //   }
//   // };

//   // useEffect(() => {
//   //   fetchOrders();
//   // }, []);

// //   const handleDelete = async (id) => {
// //     if (!confirm("Are you sure you want to delete this order?")) return;
// //     try {
// //       const res = await axios.delete(`/api/sales-order/${id}`);
// //       if (res.data.success) {
// //         alert("Deleted successfully");
// //         fetchOrders();
// //       }
// //     } catch (error) {
// //       console.error("Error deleting sales order:", error);
// //       alert("Failed to delete order");
// //     }
// //   };

// //   const handleCopyTo = (order, destination) => {
// //     // sessionStorage.setItem("salesOrderData", JSON.stringify(order));
// //     //  router.push("/admin/sales-invoice");

// //     if (destination === "Delivery") {
// //       const orderWithId = { ...order, salesOrderId: order._id,sourceModel: "SalesOrder" };
// //       sessionStorage.setItem("deliveryData", JSON.stringify(order));
// //       router.push("/admin/delivery-view/new");
// //     }else if (destination === "Invoice") {
// //       const invoiceWithId = {...order,salesOrderId:order._id, sourceModel: "SalesOrder" }
// //       sessionStorage.setItem("SalesInvoiceData", JSON.stringify(invoiceWithId));
// //       router.push("/admin/sales-invoice-view/new");
// //     } 
// //     // else if (destination === "Debit-Note") {
// //     //   sessionStorage.setItem("debitNoteData", JSON.stringify(order));
// //     //   router.push("/admin/debit-note");
// //     // }





// //   };

// //   const CopyToDropdown = ({ handleCopyTo, order }) => {
// //     const [isOpen, setIsOpen] = useState(false);
// //     const toggleDropdown = () => setIsOpen((prev) => !prev);
// //     const onSelect = (option) => {
// //       handleCopyTo(order, option);
// //       setIsOpen(false);
// //     };
// //     return (
// //       <div className="relative inline-block text-left">
// //         <button
// //           onClick={toggleDropdown}
// //           className="flex items-center px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-500 transition duration-200"
// //           title="Copy To"
// //         >
// //           <FaCopy className="mr-1" />
// //           <span className="hidden sm:inline"></span>
// //         </button>
// //         {isOpen && (
// //           <div className="absolute right-0 mt-2 w-40 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg z-10">
// //             <div className="py-1">
// //               <button
// //                 onClick={() => onSelect("Delivery")}
// //                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
// //               >
// //                 Delivery
// //               </button>
// //               <button
// //                 onClick={() => onSelect("Invoice")}
// //                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
// //               >
// //                 Invoice
// //               </button>
            
// //             </div>
// //           </div>
// //         )}
// //       </div>
// //     );
// //   };

// //   return (
// //     <div className="container mx-auto p-6">
// //       <h1 className="text-4xl font-bold mb-6 text-center">Sales Orders</h1>
// //       <div className="flex justify-end mb-4">
// //         <Link href="/admin/sales-order-view/new">
// //           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
// //             <FaEdit className="mr-2" />
// //             Create New Order
// //           </button>
// //         </Link>
// //       </div>
// //       <div className="overflow-x-auto">
// //         <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
// //           <thead className="bg-gray-100">
// //             <tr>
// //               <th className="py-3 px-4 border-b">Ref Number</th>
// //               <th className="py-3 px-4 border-b">Customer Name</th>
// //               <th className="py-3 px-4 border-b">Order Date</th>
// //               <th className="py-3 px-4 border-b">Status</th>
// //               <th className="py-3 px-4 border-b">Grand Total</th>
// //               <th className="py-3 px-4 border-b">Actions</th>
// //             </tr>
// //           </thead>
// //           <tbody>
// //             {orders.map((order) => (
// //               <tr key={order._id} className="hover:bg-gray-50 transition-colors">
// //                 <td className="py-3 px-4 border-b text-center">{order.refNumber}</td>
// //                 <td className="py-3 px-4 border-b text-center">{order.customerName}</td>
// //                 <td className="py-3 px-4 border-b text-center">
// //                   {order.postingDate ?  new Date(order.postingDate).toLocaleDateString("en-GB")
// //                     : ""}
// //                 </td>
// //                 <td className="py-3 px-4 border-b text-center">{order.status}</td>
// //                 <td className="py-3 px-4 border-b text-center">{order.grandTotal}</td>
// //                 <td className="py-3 px-4 border-b">
// //                   <div className="flex justify-center space-x-2">
// //                     {/* View Button */}
// //                     <Link href={`/admin/sales-order-view/${order._id}`}>
// //                       <button
// //                         className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
// //                         title="View Details"
// //                       >
// //                         <FaEye />
// //                       </button>
// //                     </Link>
// //                     {/* Edit Button */}
// //                   <Link href={`/admin/sales-order-view/new?editId=${order._id}`}>
// //                       <button
// //                         className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
// //                         title="Edit"
// //                       >
// //                         <FaEdit />
// //                       </button>
// //                     </Link>
// //                     {/* Delete Button */}
// //                     <button
// //                       onClick={() => handleDelete(order._id)}
// //                       className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-200"
// //                       title="Delete"
// //                     >
// //                       <FaTrash />
// //                     </button>
// //                     {/* Copy To Dropdown */}
// //                     <CopyToDropdown handleCopyTo={handleCopyTo} order={order} />
// //                     {/* Email Button */}  
// //                     <Link href={`/admin/sales-order-email/${order._id}`}>
// //                       <button
// //                         className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
// //                         title="Email Order"
// //                       >
// //                         <FaEnvelope />
// //                       </button>
// //                     </Link>
// //                     {/* WhatsApp Button */} 
// //                     <Link href={`/admin/sales-order-whatsapp/${order._id}`}>
// //                       <button
// //                         className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200"
// //                         title="WhatsApp Order"
// //                       >
// //                         <FaWhatsapp />
// //                       </button>
// //                     </Link>
// //                   </div>
// //                 </td>
// //               </tr>
// //             ))}
// //             {orders.length === 0 && (
// //               <tr>
// //                 <td colSpan="6" className="text-center py-4">
// //                   No purchase orders found.
// //                 </td>
// //               </tr>
// //             )}
// //           </tbody>
// //         </table>
// //       </div>
// //     </div>
// //   );
// // }



// function RowMenu({ order, onDelete, onCopy }) {
//   const [open, setOpen] = useState(false);
//   const btnRef = useRef(null);
//   const menuRef = useRef(null);
//   const [coords, setCoords] = useState({ top: 0, left: 0 });

//   // Positioning
//   useEffect(() => {
//     if (open && btnRef.current && menuRef.current) {
//       const btnRect = btnRef.current.getBoundingClientRect();
//       const menuRect = menuRef.current.getBoundingClientRect();
//       const viewportHeight = window.innerHeight;
//       const viewportWidth = window.innerWidth;

//       let top = btnRect.bottom + 8;
//       let left = btnRect.right - 192;

//       if (top + menuRect.height > viewportHeight) {
//         top = btnRect.top - menuRect.height - 8;
//       }

//       if (left + menuRect.width > viewportWidth) {
//         left = viewportWidth - menuRect.width - 8;
//       }

//       setCoords({ top, left });
//     }
//   }, [open]);

//   // Close on outside click
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (
//         menuRef.current &&
//         !menuRef.current.contains(e.target) &&
//         btnRef.current &&
//         !btnRef.current.contains(e.target)
//       ) {
//         setOpen(false);
//       }
//     };

//     if (open) {
//       document.addEventListener('mousedown', handleClickOutside);
//     }

//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, [open]);

//   const MenuItem = ({ icon, label, onClick, color = '' }) => (
//     <button
//       onClick={() => {
//         onClick();
//         setOpen(false);
//       }}
//       className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
//     >
//       <span className={color}>{icon}</span> {label}
//     </button>
//   );

//   return (
//     <>
//       <button
//         ref={btnRef}
//         onClick={() => setOpen(!open)}
//         className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full focus:ring-2 focus:ring-blue-500"
//       >
//         <FaEllipsisV size={16} />
//       </button>

//       {open && (
//         <div
//           ref={menuRef}
//           style={{ top: coords.top, left: coords.left }}
//           className="fixed z-50 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg"
//         >
//           <MenuItem icon={<FaEye />} label="View"
//             onClick={() => (window.location.href = `/admin/sales-order-view/view/${order._id}`)}
//           />
//           <MenuItem icon={<FaEdit />} label="Edit"
//             onClick={() => (window.location.href = `/admin/sales-order-view/new?editId=${order._id}`)}
//           />
//           <MenuItem icon={<FaCopy />} label="Copy → Delivery"
//             onClick={() => onCopy(order, 'Delivery')}
//           />
//           <MenuItem icon={<FaCopy />} label="Copy → Invoice"
//             onClick={() => onCopy(order, 'Invoice')}
//           />
//           <MenuItem icon={<FaEnvelope />} label="Email"
//             onClick={() => (window.location.href = `/admin/sales-order-email/${order._id}`)}
//           />
//           <MenuItem icon={<FaWhatsapp />} label="WhatsApp"
//             onClick={() => (window.location.href = `/admin/sales-order-whatsapp/${order._id}`)}
//           />
//           <MenuItem icon={<FaTrash />} label="Delete" color="text-red-600"
//             onClick={() => onDelete(order._id)}
//           />
//         </div>
//       )}
//     </>
//   );
// }