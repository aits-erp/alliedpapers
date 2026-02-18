"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FaEdit, FaTrash, FaCopy, FaEye, FaEnvelope, FaWhatsapp } from "react-icons/fa";

export default function InvoiceView() {
  const [invoices, setInvoices] = useState([]);
  const router = useRouter();

  const fetchInvoices = async () => {
    try {
      const res = await axios.get("/api/purchaseInvoice");
      if (res.data.success) {
        setInvoices(res.data.data);
      } else {
        setInvoices(res.data);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await axios.delete(`/api/purchaseInvoice/${id}`);
      if (res.data.success) {
        alert("Deleted successfully");
        fetchInvoices();
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice");
    }
  };

  const handleCopyTo = (invoice, destination) => {
    if (destination === "debitNote") {
      sessionStorage.setItem("invoiceData", JSON.stringify(invoice));
      router.push("/admin/debit-notes-view/new");
    }
  };

  const CopyToDropdown = ({ handleCopyTo, invoice }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleDropdown = () => setIsOpen((prev) => !prev);
    const onSelect = (option) => {
      handleCopyTo(invoice, option);
      setIsOpen(false);
    };
    return (
      <div className="relative inline-block text-left">
        <button
          onClick={toggleDropdown}
          className="flex items-center px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-500 transition duration-200"
          title="Copy To"
        >
          <FaCopy className="mr-1" />
          <span className="hidden sm:inline"></span>
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg z-10">
            <div className="py-1">
              <button
                onClick={() => onSelect("debitNote")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
               Debit Note
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6 text-center">Invoice List</h1>
      <div className="flex justify-end mb-4">
        <Link href="/admin/purchaseInvoice-view/new">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
            <FaEdit className="mr-2" />
            Create New Invoice
          </button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 border-b">Invoice Number</th>
              <th className="py-3 px-4 border-b">Supplier Name</th>
              <th className="py-3 px-4 border-b">Document Date</th>
           
            
              <th className="py-3 px-4 border-b">Grand Total</th>
              <th className="py-3 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice._id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 border-b text-center">{invoice.invoiceNumber}</td>
                <td className="py-3 px-4 border-b text-center">{invoice.supplierName}</td>
                <td className="py-3 px-4 border-b text-center">
                  {invoice.documentDate ? new Date(invoice.documentDate).toLocaleDateString() : ""}
                </td>
               
                <td className="py-3 px-4 border-b text-center">{invoice.grandTotal}</td>
                <td className="py-3 px-4 border-b">
                  <div className="flex justify-center space-x-2">
                    <Link href={`/admin/purchaseInvoice-view/${invoice._id}`}>
                      <button
                        className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                    </Link>
                    <Link href={`/admin/purchaseInvoice-view/new/?editId=${invoice._id}`}>
                      <button
                        className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(invoice._id)}
                      className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-200"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                    <CopyToDropdown handleCopyTo={handleCopyTo} invoice={invoice} />
                    <Link href={`/admin/purchaseInvoice-view/${invoice._id}/send-email`}>
                      <button
                        className="flex items-center px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition duration-200"
                        title="Send Email"
                      >
                        <FaEnvelope />
                      </button>
                    </Link>
                    <Link href={`/admin/purchaseInvoice-view/${invoice._id}/send-whatsapp`}>
                      <button
                        className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200"
                        title="Send WhatsApp"
                      >
                        <FaWhatsapp />
                      </button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}