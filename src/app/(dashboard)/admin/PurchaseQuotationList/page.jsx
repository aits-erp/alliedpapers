"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify"; 
import { FaEdit, FaTrash, FaCopy, FaEye ,FaEnvelope, FaWhatsapp } from "react-icons/fa";

export default function PurchaseQuotationList() {
  const [quotations, setQuotations] = useState([]);
  const router = useRouter();

const fetchQuotations = async () => {
  try {
    const res = await axios.get("/api/purchase-quotation");
    if (res.data.success) {
      // ✅ Filter out quotations where any item has quantity === 0
      const validQuotations = res.data.data.filter((quotation) =>
        quotation.items.every((item) => Number(item.quantity) > 0)
      );

      setQuotations(validQuotations);
    }
  } catch (error) {
    console.error("Error fetching quotations:", error);
  }
};

useEffect(() => {
  fetchQuotations();
}, []);


  console.log(quotations)

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      const res = await axios.delete(`/api/purchase-quotation/${id}`);
      if (res.data.success) {
        alert("Deleted successfully");
        fetchQuotations();
      }
    } catch (error) {
      console.error("Error deleting quotation:", error);
      alert("Failed to delete quotation");
    }
  };

  const handleCopyTo =  (quotation, destination) => {
    // if (destination === "GRN") {
    //   // Save using the key "grnData" so that the GRN page can read it.
    //   sessionStorage.setItem("grnData", JSON.stringify(quotation));
    //   router.push("/admin/GRN");
    // } else if (destination === "Invoice") {
    //   // sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
    //   console.log("Copying quotation:", quotation);
    //   sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));

    //   router.push("/admin/purchase-invoice");
    // }else 
if (destination === "Order") {
  // ⛔ block a quotation that contains any zero-quantity items


  // ✅ everything is fine – proceed
  sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
  
  router.push("/admin/purchase-order-view/new");
}
    // else if (destination === "Debit-Note") {
      
    //   sessionStorage.setItem("debitNoteData", JSON.stringify(quotation));

    //   // sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
    //   router.push("/admin/debit-note");
    // }
  };
  const CopyToDropdown = ({ handleCopyTo, quotation }) => {
    const [isOpen, setIsOpen] = useState(false);
  
    const toggleDropdown = () => {
      setIsOpen(prev => !prev);
    };
  
    const onSelect = (option) => {
      handleCopyTo(quotation, option);
      setIsOpen(false);
    };
  
    return (
      <div className="relative inline-block text-left">
        {/* Main button that toggles the dropdown */}
        <button
          onClick={toggleDropdown}
          className="flex items-center px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-500 transition duration-200"
          title="Copy To"
        >
          <FaCopy className="mr-1" />
          <span className="hidden sm:inline"></span>
        </button>
        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg z-10">
            <div className="py-1">
            
              <button
                onClick={() => onSelect("Order")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Order
              </button>
             
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6 text-center">
        Purchase Quotations
      </h1>
      <div className="flex justify-end mb-4">
        <Link href="/admin/PurchaseQuotationList/new">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
            <FaEdit className="mr-2" />
            Create New Quotation
          </button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 border-b">Document No.</th>
              <th className="py-3 px-4 border-b">Supplier Name</th>
              <th className="py-3 px-4 border-b">Posting Date</th>
              <th className="py-3 px-4 border-b">Status</th>
              <th className="py-3 px-4 border-b">Grand Total</th>
              <th className="py-3 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((quotation) => (
              <tr
                key={quotation._id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4 border-b text-center">
                  {quotation.refNumber}
                </td>
                <td className="py-3 px-4 border-b text-center">
                  {quotation.supplierName}
                </td>
                <td className="py-3 px-4 border-b text-center">
                  {quotation.postingDate
                    ? new Date(quotation.postingDate).toLocaleDateString()
                    : ""}
                </td>
                <td className="py-3 px-4 border-b text-center">
                  {quotation.status}
                </td>
                <td className="py-3 px-4 border-b text-center">
                  {quotation.grandTotal}
                </td>
                <td className="py-3 px-4 border-b">
                  <div className="flex justify-center space-x-2">
                    {/* View Button */}
                    <Link
                      href={`/admin/PurchaseQuotationList/view/${quotation._id}`}
                    >
                      <button
                        className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                    </Link>
                    {/* Edit Button (opens the form with editId) */}
                    <Link
                      href={`/admin/PurchaseQuotationList/new?editId=${quotation._id}`}
                    >
                      <button
                        className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                    </Link>
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(quotation._id)}
                      className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-200"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                    {/* Copy To Buttons */}
                    {/* <button
                      onClick={() => handleCopyTo(quotation, "GRN")}
                      className="flex items-center px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-500 transition duration-200"
                      title="Copy To GRN"
                    >
                      <FaCopy className="mr-1" />
                      <span className="hidden sm:inline">GRN</span>
                    </button>
                    <button
                      onClick={() => handleCopyTo(quotation, "Invoice")}
                      className="flex items-center px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-500 transition duration-200"
                      title="Copy To Invoice"
                    >
                      <FaCopy className="mr-1" />
                      <span className="hidden sm:inline">Invoice</span>
                    </button> */}
                    <CopyToDropdown handleCopyTo={handleCopyTo} quotation={quotation} />
                    {/* Email Button */}
                    <Link
                      href={`/admin/purchase-quotation/${quotation._id}/send-email`}
                    >
                      <button
                        className="flex items-center px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition duration-200"
                        title="Send Email"
                      >
                        <FaEnvelope />
                      </button>
                    </Link>
                    {/* WhatsApp Button */} 
                    <Link
                      href={`/admin/purchase-quotation/${quotation._id}/send-whatsapp`}
                    >
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
            {quotations.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  No purchase quotations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
