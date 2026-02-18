"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FaEdit, FaTrash, FaCopy, FaEye , FaEnvelope, FaWhatsapp } from "react-icons/fa";

export default function GRNView() {
  const [grns, setGRNs] = useState([]);
  const router = useRouter();

  const fetchGRNs = async () => {
    try {
      const res = await axios.get("/api/grn");
      // Assuming your API returns { success: true, data: [...] }
      if (res.data.success) {
        setGRNs(res.data.data);
      } else {
        setGRNs(res.data);
      }
    } catch (error) {
      console.error("Error fetching GRNs:", error);
    }
  };

  useEffect(() => {
    fetchGRNs();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this GRN?")) return;
    try {
      const res = await axios.delete(`/api/grn/${id}`);
      if (res.data.success) {
        alert("Deleted successfully");
        fetchGRNs();
      }
    } catch (error) {
      console.error("Error deleting GRN:", error);
      alert("Failed to delete GRN");
    }
  };

  // Only handling the "invoice" destination.
  const handleCopyTo = (grns, destination) => {
    sessionStorage.setItem("grnData", JSON.stringify(grns));
    if (destination === "invoice") {
      router.push("/admin/purchaseInvoice-view/new");
    }
  };

  const CopyToDropdown = ({ handleCopyTo, grn }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleDropdown = () => setIsOpen((prev) => !prev);
    const onSelect = (option) => {
      handleCopyTo(grn, option);
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
          {/* <span className="hidden sm:inline">Copy To</span> */}
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg z-10">
            <div className="py-1">
              <button
                onClick={() => onSelect("invoice")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Invoice
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6 text-center">GRN List</h1>
      <div className="flex justify-end mb-4">
        <Link href="/admin/grn-view/new">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
            <FaEdit className="mr-2" />
            Create New GRN
          </button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              {/* <th className="py-3 px-4 border-b">GRN Number</th> */}
              <th className="py-3 px-4 border-b">document NO.</th>
              <th className="py-3 px-4 border-b">Supplier Name</th>
              <th className="py-3 px-4 border-b"> Date</th>
              <th className="py-3 px-4 border-b">Status</th>
              <th className="py-3 px-4 border-b">Grand Total</th>
              <th className="py-3 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {grns.map((grn) => (
              <tr key={grn._id} className="hover:bg-gray-50 transition-colors">
                {/* <td className="py-3 px-4 border-b text-center">{grn.grnNumber}</td> */}
                <td className="py-3 px-4 border-b text-center">{grn.documentNumber}</td>
                <td className="py-3 px-4 border-b text-center">{grn.supplierName}</td>
                <td className="py-3 px-4 border-b text-center">
                  {grn.postingDate ? new Date(grn.postingDate).toLocaleDateString() : ""}
                </td>
                <td className="py-3 px-4 border-b text-center">{grn.status}</td>
                <td className="py-3 px-4 border-b text-center">{grn.grandTotal}</td>
                <td className="py-3 px-4 border-b">
                  <div className="flex justify-center space-x-2">
                    <Link href={`/admin/grn-view/${grn._id}`}>
                      <button
                        className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                    </Link>
                    <Link href={`/admin/grn-view/new?editId=${grn._id}`}>
                      <button
                        className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(grn._id)}
                      className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-200"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                    <CopyToDropdown handleCopyTo={handleCopyTo} grn={grn} />
                    <Link href={`/admin/grn-view/${grn._id}/send-email`}>
                      <button
                        className="flex items-center px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition duration-200"
                        title="Send Email"
                      >
                        <FaEnvelope />
                      </button>
                    </Link>
                    <Link href={`/admin/grn-view/${grn._id}/send-whatsapp`}>
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
            {grns.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  No GRNs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


