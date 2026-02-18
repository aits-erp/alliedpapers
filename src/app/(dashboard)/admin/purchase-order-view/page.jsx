// "use client"; 
// import { useState, useEffect } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { FaEdit, FaTrash, FaCopy, FaEye } from "react-icons/fa";

// export default function PurchaseOrderList() {
//   const [orders, setOrders] = useState([]);
//   const router = useRouter();

//   const fetchOrders = async () => {
//     try {
//       const res = await axios.get("/api/purchase-order");
//       console.log("Fetched orders:", res.data);
//       setOrders(res.data);
//     } catch (error) {
//       console.error("Error fetching purchase orders:", error);
//     }
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this order?")) return;
//     try {
//       const res = await axios.delete(`/api/purchase-order/${id}`);
//       if (res.data.success) {
//         alert("Deleted successfully");
//         fetchOrders();
//       }
//     } catch (error) {
//       console.error("Error deleting purchase order:", error);
//       alert("Failed to delete order");
//     }
//   };

//   // This function receives the selected Purchase Order and destination.
//   const handleCopyTo = (selectedPO, destination) => {
//     if (destination === "GRN") {
//       sessionStorage.setItem("purchaseOrderData", JSON.stringify(selectedPO));
//       router.push("/admin/GRN");
//     } else if (destination === "Invoice") {
//       sessionStorage.setItem("purchaseInvoiceData", JSON.stringify(selectedPO));
//       router.push("/admin/purchase-invoice");
//     }
//   };

//   // Updated CopyToDropdown component.
//   const CopyToDropdown = ({ handleCopyTo, selectedPO }) => {
//     const [isOpen, setIsOpen] = useState(false);
//     const toggleDropdown = () => setIsOpen((prev) => !prev);
//     const onSelect = (destination) => {
//       handleCopyTo(selectedPO, destination);
//       setIsOpen(false);
//     };
//     return (
//       <div className="relative inline-block text-left">
//         <button
//           onClick={toggleDropdown}
//           className="flex items-center px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-500 transition duration-200"
//           title="Copy To"
//         >
//           <FaCopy className="mr-1" />
//           <span className="hidden sm:inline"></span>
//         </button>
//         {isOpen && (
//           <div className="absolute right-0 mt-2 w-40 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg z-10">
//             <div className="py-1">
//               <button
//                 onClick={() => onSelect("GRN")}
//                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//               >
//                 GRN
//               </button>
//               <button
//                 onClick={() => onSelect("Invoice")}
//                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//               >
//                 Invoice
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-4xl font-bold mb-6 text-center">Purchase Orders</h1>
//       <div className="flex justify-end mb-4">
//         <Link href="/admin/purchase-order">
//           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
//             <FaEdit className="mr-2" />
//             Create New Order
//           </button>
//         </Link>
//       </div>
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="py-3 px-4 border-b">Ref Number</th>
//               <th className="py-3 px-4 border-b">Supplier Name</th>
//               <th className="py-3 px-4 border-b">Posting Date</th>
//               <th className="py-3 px-4 border-b">Status</th>
//               <th className="py-3 px-4 border-b">Grand Total</th>
//               <th className="py-3 px-4 border-b">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {orders.map((order) => (
//               <tr key={order._id} className="hover:bg-gray-50 transition-colors">
//                 <td className="py-3 px-4 border-b text-center">{order.refNumber}</td>
//                 <td className="py-3 px-4 border-b text-center">{order.supplierName}</td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {order.postingDate ? new Date(order.postingDate).toLocaleDateString() : ""}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">{order.orderStatus}</td>
//                 <td className="py-3 px-4 border-b text-center">{order.grandTotal}</td>
//                 <td className="py-3 px-4 border-b">
//                   <div className="flex justify-center space-x-2">
//                     {/* View Button */}
//                     <Link href={`/admin/purchase-order-view/${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
//                         title="View Details"
//                       >
//                         <FaEye />
//                       </button>
//                     </Link>
//                     {/* Edit Button */}
//                     <Link href={`/admin/purchase-order-view/new?editId=${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
//                         title="Edit"
//                       >
//                         <FaEdit />
//                       </button>
//                     </Link>
//                     {/* Delete Button */}
//                     <button
//                       onClick={() => handleDelete(order._id)}
//                       className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-200"
//                       title="Delete"
//                     >
//                       <FaTrash />
//                     </button>
//                     {/* Copy To Dropdown */}
//                     <CopyToDropdown handleCopyTo={handleCopyTo} selectedPO={order} />
//                   </div>
//                 </td>
//               </tr>
//             ))}
//             {orders.length === 0 && (
//               <tr>
//                 <td colSpan="6" className="text-center py-4">
//                   No purchase orders found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }






"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FaEdit, FaTrash, FaCopy, FaEye, FaEnvelope, FaWhatsapp } from "react-icons/fa";

export default function PurchaseOrderList() {
  const [orders, setOrders] = useState([]);
  const router = useRouter();

  const fetchOrders = async () => {
    try {
      const res = await axios.get("/api/purchase-order");
      console.log("Fetched orders:", res.data);
      // Expecting an object with a success flag and a data array.
    //   if (res.data.success) {
    //     setOrders(res.data);
    //   }
    setOrders(res.data);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await axios.delete(`/api/purchase-order/${id}`);
      if (res.data.success) {
        alert("Deleted successfully");
        fetchOrders();
      }
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      alert("Failed to delete order");
    }
  };

  const handleCopyTo = (order, destination) => {
    if (!order) return;
  
    switch (destination) {
      case "GRN":
        async function copyOrderToGRN(order) {
          // Process each item to update managedBy from the item master if not set,
          // and to set up default batches if the item is batch-managed.
          const updatedItems = await Promise.all(
            order.items.map(async (item) => {
              // If managedBy is missing or empty, fetch from the item master.
              if (!item.managedBy || item.managedBy.trim() === "") {
                try {
                  // Replace `/api/items/${item.item}` with your actual item master endpoint.
                  const res = await axios.get(`/api/items/${item.item}`);
                  if (res.data && res.data.success && res.data.data) {
                    const masterData = res.data.data;
                    item.managedBy = masterData.managedBy;
                  } else {
                    console.error("Item master not found for item:", item.item);
                    // Optionally, set a default value:
                    // item.managedBy = "batch"; // or another appropriate default
                  }
                } catch (error) {
                  console.error("Error fetching item master for item:", item.item, error);
                  // Fallback default in case of error.
                  // item.managedBy = "batch";
                }
              }
              // For batch-managed items, ensure there's at least one batch entry.
              if (item.managedBy && item.managedBy.trim().toLowerCase() === "batch") {
                if (!item.batches || item.batches.length === 0) {
                  item.batches = [
                    {
                      batchNumber: "",
                      expiryDate: "",
                      manufacturer: "",
                      batchQuantity: 0,
                    },
                  ];
                }
              }
              return item;
            })
          );
        
          // Create an updated order with the processed items.
          const orderWithUpdatedItems = { ...order, items: updatedItems };
          // Save the updated order to sessionStorage.
          sessionStorage.setItem("purchaseOrderData", JSON.stringify(orderWithUpdatedItems));
          // Navigate to the GRN page.
          router.push("/admin/grn-view/new");
        }
        // Example usage:
        copyOrderToGRN(order);

        // sessionStorage.setItem("purchaseOrderData", JSON.stringify(order));
        // router.push("/admin/GRN"); 
        break;
  
      case "Invoice":
        async function copyOrderToInvoice(order) {
          // Process each item to update managedBy from the item master if not set,
          // and to set up default batches if the item is batch-managed.
          const updatedItems = await Promise.all(
            order.items.map(async (item) => {
              // If managedBy is missing or empty, fetch from the item master.
              if (!item.managedBy || item.managedBy.trim() === "") {
                try {
                  // Replace `/api/items/${item.item}` with your actual item master endpoint.
                  const res = await axios.get(`/api/items/${item.item}`);
                  if (res.data && res.data.success && res.data.data) {
                    const masterData = res.data.data;
                    item.managedBy = masterData.managedBy;
                  } else {
                    console.error("Item master not found for item:", item.item);
                    // Optionally, set a default value:
                    // item.managedBy = "batch"; // or another appropriate default
                  }
                } catch (error) {
                  console.error("Error fetching item master for item:", item.item, error);
                  // Fallback default in case of error.
                  // item.managedBy = "batch";
                }
              }
              // For batch-managed items, ensure there's at least one batch entry.
              if (item.managedBy && item.managedBy.trim().toLowerCase() === "batch") {
                if (!item.batches || item.batches.length === 0) {
                  item.batches = [
                    {
                      batchNumber: "",
                      expiryDate: "",
                      manufacturer: "",
                      batchQuantity: 0,
                    },
                  ];
                }
              }
              return item;
            })
          );
        
          // Create an updated order with the processed items.
          const orderWithUpdatedItems = { ...order, items: updatedItems };
          // Save the updated order to sessionStorage.
          sessionStorage.setItem("purchaseInvoiceData", JSON.stringify(orderWithUpdatedItems));
          // Navigate to the GRN page.
          router.push("/admin/purchaseInvoice-view/new");
        }
        // Example usage:
        copyOrderToInvoice(order);

        // sessionStorage.setItem("purchaseOrderData", JSON.stringify(order));
        // router.push("/admin/GRN"); 
        break;
        // sessionStorage.setItem("purchaseInvoiceData", JSON.stringify(order));
        // router.push("/admin/purchase-invoice");
        // break;
  
      default:
        console.warn("Invalid destination selected");
    }
  };
  

  const CopyToDropdown = ({ handleCopyTo, order }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleDropdown = () => setIsOpen((prev) => !prev);
    const onSelect = (option) => {
      handleCopyTo(order, option);
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
                onClick={() => onSelect("GRN")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                GRN
              </button>
              <button
                onClick={() => onSelect("Invoice")}
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
      <h1 className="text-4xl font-bold mb-6 text-center">Purchase Orders</h1>
      <div className="flex justify-end mb-4">
        <Link href="/admin/purchase-order-view/new">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
            <FaEdit className="mr-2" />
            Create New Order
          </button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 border-b">document No.</th>
              <th className="py-3 px-4 border-b">Supplier Name</th>
              <th className="py-3 px-4 border-b">Posting Date</th>
              <th className="py-3 px-4 border-b">Status</th>
              <th className="py-3 px-4 border-b">Grand Total</th>
              <th className="py-3 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 border-b text-center">{order.documentNumber}</td>
                <td className="py-3 px-4 border-b text-center">{order.supplierName}</td>
                <td className="py-3 px-4 border-b text-center">
                  {order.postingDate ? new Date(order.postingDate).toLocaleDateString() : ""}
                </td>
                <td className="py-3 px-4 border-b text-center">{order.orderStatus}</td>
                <td className="py-3 px-4 border-b text-center">{order.grandTotal}</td>
                <td className="py-3 px-4 border-b">
                  <div className="flex justify-center space-x-2">
                    {/* View Button */}
                    <Link href={`/admin/purchase-order-view/view/${order._id}`}>
                      <button
                        className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                    </Link>
                    {/* Edit Button */}
                       <Link href={`/admin/purchase-order-view/new?editId=${order._id}`}>
                    <button
                      className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                  </Link>
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(order._id)}
                      className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-200"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                    {/* Copy To Dropdown */}
                    <CopyToDropdown handleCopyTo={handleCopyTo} order={order} />
                    {/* Email Button */}
                    <Link href={`/admin/purchase-order-view/${order._id}/send-email`}>
                      <button
                        className="flex items-center px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition duration-200"
                        title="Send Email"
                      >
                        <FaEnvelope />
                      </button>
                    </Link>
                    {/* WhatsApp Button */}
                    <Link href={`/admin/purchase-order-view/${order._id}/send-whatsapp`}>
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
            {orders.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  No purchase orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
