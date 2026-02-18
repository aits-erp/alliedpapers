// "use client";
// import { useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { Suspense } from "react";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";

// const initialState = {
//   customer: "",
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
//   status: "Open",
//   postingDate: "",
//   validUntil: "",
//   documentDate: "",
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstType: 0,
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       tdsAmount: 0,
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//       taxOption: "GST",
//       gstRate: 0,
//       cgstRate: 0,
//       sgstRate: 0,
//       igstRate: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//     },
//   ],
//   salesEmployee: "",
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalBeforeDiscount: 0,
//   totalDownPayment: 0,
//   appliedAmounts: 0,
//   gstAmount: 0,
//   cgstAmount: 0,
//   sgstAmount: 0,
//   igstAmount: 0,
//   grandTotal: 0,
//   openBalance: 0,
// };

// const round = (num, decimals = 2) => {
//   const n = Number(num);
//   if (isNaN(n)) return 0;
//   return Number(n.toFixed(decimals));
// };

// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = ("0" + (d.getMonth() + 1)).slice(-2);
//   const day = ("0" + d.getDate()).slice(-2);
//   return `${year}-${month}-${day}`;
// }

// function SalesQuotationFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
//       <SalesQuotationForm />
//     </Suspense>
//   );
// }

// function SalesQuotationForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");
//   const [formData, setFormData] = useState(initialState);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
//       setLoading(true);
//       axios
//         .get(`/api/sales-quotation/${editId}`)
//         .then((res) => {
//           if (res.data.success) {
//             const record = res.data.data;
//             console.log("Fetched quotation:", record);
//             setFormData({
//               ...record,
//               customer: record.customer?._id || record.customer || "",
//               customerCode: record.customerCode || "",
//               customerName: record.customerName || "",
//               contactPerson: record.contactPerson || "",
//               postingDate: formatDateForInput(record.postingDate),
//               validUntil: formatDateForInput(record.validUntil),
//               documentDate: formatDateForInput(record.documentDate),
//               items: record.items.map((item) => ({
//                 ...item,
//                 item: item.item?._id || item.item || "",
//                 itemCode: item.itemCode || "",
//                 itemName: item.itemName || "",
//                 itemDescription: item.itemDescription || "",
//                 quantity: item.quantity || 0,
//                 unitPrice: item.unitPrice || 0,
//                 discount: item.discount || 0,
//                 freight: item.freight || 0,
//                 gstType: item.gstType || 0,
//                 priceAfterDiscount: item.priceAfterDiscount || 0,
//                 totalAmount: item.totalAmount || 0,
//                 gstAmount: item.gstAmount || 0,
//                 tdsAmount: item.tdsAmount || 0,
//                 warehouse: item.warehouse?._id || item.warehouse || "",
//                 warehouseName: item.warehouseName || "",
//                 warehouseCode: item.warehouseCode || "",
//                 taxOption: item.taxOption || "GST",
//                 gstRate: item.gstRate || 0,
//                 cgstRate: item.cgstRate || 0,
//                 sgstRate: item.sgstRate || 0,
//                 igstRate: item.igstRate || 0,
//                 cgstAmount: item.cgstAmount || 0,
//                 sgstAmount: item.sgstAmount || 0,
//                 igstAmount: item.igstAmount || 0,
//               })),
//             });
//           } else {
//             setError("Failed to load quotation data: " + res.data.error);
//           }
//         })
//         .catch((err) => {
//           console.error("Error fetching quotation:", err.response?.data || err.message);
//           setError("Error loading quotation: " + (err.response?.data?.error || err.message));
//         })
//         .finally(() => {
//           setLoading(false);
//         });
//     } else if (editId) {
//       setError("Invalid quotation ID");
//     }
//   }, [editId]);

//   const handleCustomerSelect = useCallback((selectedCustomer) => {
//     console.log("Received selectedCustomer:", selectedCustomer);
//     setFormData((prev) => {
//       const newState = {
//         ...prev,
//         customer: selectedCustomer._id || "",
//         customerCode: selectedCustomer.customerCode || "",
//         customerName: selectedCustomer.customerName || "",
//         contactPerson: selectedCustomer.contactPersonName || "",
//       };
//       console.log("Updated formData:", newState);
//       return newState;
//     });
//   }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }, []);

//   const computeItemValues = (item) => {
//     const quantity = parseFloat(item.quantity) || 0;
//     const unitPrice = parseFloat(item.unitPrice) || 0;
//     const discount = parseFloat(item.discount) || 0;
//     const freight = parseFloat(item.freight) || 0;
//     const priceAfterDiscount = round(unitPrice - discount);
//     const totalAmount = round(quantity * priceAfterDiscount + freight);

//     if (item.taxOption === "GST") {
//       const gstRate = parseFloat(item.gstRate) || 0;
//       const cgstRate = item.cgstRate !== undefined ? parseFloat(item.cgstRate) : gstRate / 2;
//       const sgstRate = item.sgstRate !== undefined ? parseFloat(item.sgstRate) : gstRate / 2;

//       const cgstAmount = round(totalAmount * (cgstRate / 100));
//       const sgstAmount = round(totalAmount * (sgstRate / 100));
//       const gstAmount = round(cgstAmount + sgstAmount);

//       return {
//         priceAfterDiscount,
//         totalAmount,
//         gstAmount,
//         cgstAmount,
//         sgstAmount,
//         igstAmount: 0,
//       };
//     }

//     if (item.taxOption === "IGST") {
//       const igstRate = parseFloat(item.igstRate) || 0;
//       const igstAmount = round(totalAmount * (igstRate / 100));
//       return {
//         priceAfterDiscount,
//         totalAmount,
//         gstAmount: 0,
//         cgstAmount: 0,
//         sgstAmount: 0,
//         igstAmount,
//       };
//     }

//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//     };
//   };

//     // Recalculate summary fields when related inputs change.
//     useEffect(() => {
//       const totalBeforeDiscountCalc = formData.items.reduce((acc, item) => {
//         const unitPrice = parseFloat(item.unitPrice) || 0;
//         const discount = parseFloat(item.discount) || 0;
//         const quantity = parseFloat(item.quantity) || 1;
//         return acc + (unitPrice - discount) * quantity;
//       }, 0);
  
//       const totalItemsCalc = formData.items.reduce(
//         (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
//         0
//       );
  
//       const gstTotalCalc = formData.items.reduce(
//         (acc, item) => acc + (parseFloat(item.gstAmount) || 0),
//         0
//       );
  
//       const overallFreight = parseFloat(formData.freight) || 0;
//       const roundingCalc = parseFloat(formData.rounding) || 0;
//       const totalDownPaymentCalc = parseFloat(formData.totalDownPayment) || 0;
//       const appliedAmountsCalc = parseFloat(formData.appliedAmounts) || 0;
  
//       const grandTotalCalc = totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
//       const openBalanceCalc = grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);
  
//       if (
//         totalBeforeDiscountCalc !== formData.totalBeforeDiscount ||
//         gstTotalCalc !== formData.gstTotal ||
//         grandTotalCalc !== formData.grandTotal ||
//         openBalanceCalc !== formData.openBalance
//       ) {
//         setFormData((prev) => ({
//           ...prev,
//           totalBeforeDiscount: totalBeforeDiscountCalc,
//           gstTotal: gstTotalCalc,
//           grandTotal: grandTotalCalc,
//           openBalance: openBalanceCalc,
//         }));
//       }
//     }, [
//       formData.items,
//       formData.freight,
//       formData.rounding,
//       formData.totalDownPayment,
//       formData.appliedAmounts,
//       formData.totalBeforeDiscount,
//       formData.gstTotal,
//       formData.grandTotal,
//       formData.openBalance,
//     ]);

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       const numericFields = [
//         "quantity",
//         "unitPrice",
//         "discount",
//         "freight",
//         "gstRate",
//         "cgstRate",
//         "sgstRate",
//         "igstRate",
//         "tdsAmount",
//       ];

//       const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
//       updatedItems[index] = { ...updatedItems[index], [name]: newValue };

//       if (
//         name.includes("Rate") ||
//         name === "taxOption" ||
//         name === "quantity" ||
//         name === "unitPrice" ||
//         name === "discount" ||
//         name === "freight"
//       ) {
//         const computed = computeItemValues(updatedItems[index]);
//         updatedItems[index] = {
//           ...updatedItems[index],
//           priceAfterDiscount: computed.priceAfterDiscount,
//           totalAmount: computed.totalAmount,
//           gstAmount: computed.gstAmount,
//           cgstAmount: computed.cgstAmount,
//           sgstAmount: computed.sgstAmount,
//           igstAmount: computed.igstAmount,
//         };
//       }

//       return { ...prev, items: updatedItems };
//     });
//   }, []);

//   const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);

//   const addItemRow = useCallback(() => {
//     setFormData((prev) => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
//           item: "",
//           itemCode: "",
//           itemName: "",
//           itemDescription: "",
//           quantity: 0,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,
//           gstType: 0,
//           priceAfterDiscount: 0,
//           totalAmount: 0,
//           gstAmount: 0,
//           tdsAmount: 0,
//           warehouse: "",
//           warehouseName: "",
//           warehouseCode: "",
//           taxOption: "GST",
//           gstRate: 0,
//           cgstRate: 0,
//           sgstRate: 0,
//           igstRate: 0,
//           cgstAmount: 0,
//           sgstAmount: 0,
//           igstAmount: 0,
//         },
//       ],
//     }));
//   }, []);

//   useEffect(() => {
//     const totalBeforeDiscountCalc = round(
//       formData.items.reduce((acc, item) => {
//         const unitPrice = parseFloat(item.unitPrice) || 0;
//         const discount = parseFloat(item.discount) || 0;
//         const quantity = parseFloat(item.quantity) || 1;
//         return acc + (unitPrice * quantity - discount);
//       }, 0)
//     );

//     const totalItemsCalc = round(
//       formData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)
//     );

//     const gstAmountCalc = round(
//       formData.items.reduce((acc, item) => acc + (parseFloat(item.gstAmount) || 0), 0)
//     );

//     const overallFreight = round(parseFloat(formData.freight) || 0);
//     const roundingCalc = round(parseFloat(formData.rounding) || 0);
//     const totalDownPaymentCalc = round(parseFloat(formData.totalDownPayment) || 0);
//     const appliedAmountsCalc = round(parseFloat(formData.appliedAmounts) || 0);

//     const grandTotalCalc = round(totalItemsCalc + gstAmountCalc + overallFreight + roundingCalc);
//     const openBalanceCalc = round(grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc));

//     setFormData((prev) => ({
//       ...prev,
//       totalBeforeDiscount: totalBeforeDiscountCalc,
//       gstAmount: gstAmountCalc, // Renamed from gstTotal
//       grandTotal: grandTotalCalc,
//       openBalance: openBalanceCalc,
//     }));
//   }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

//   const handleSubmit = async () => {
//     const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
//     if (!formData.customer || !isValidObjectId(formData.customer)) {
//       alert("Please select a valid customer");
//       return;
//     }
//     if (!formData.customerCode || !formData.customerName) {
//       alert("Customer code and name are required");
//       return;
//     }
//     console.log("Submitting formData:", formData);

//     if (editId) {
//       try {
//         await axios.put(`/api/sales-quotation/${editId}`, formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         alert("Sales Quotation updated successfully");
//         router.push("/admin/salesQuotation");
//       } catch (error) {
//         console.error("Error updating sales quotation:", error);
//         alert("Failed to update sales quotation");
//       }
//     } else {
//       try {
//         await axios.post("/api/sales-quotation", formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         alert("Sales Quotation added successfully");
//         setFormData(initialState);
//       } catch (error) {
//         console.error("Error adding sales quotation:", error);
//         alert("Error adding sales quotation");
//       }
//     }
//   };

//   if (loading) {
//     return <div className="p-4">Loading quotation...</div>;
//   }

//   if (error) {
//     return <div className="p-4 text-red-500">{error}</div>;
//   }

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">
//         {editId ? "Edit Sales Quotation" : "Create Sales Quotation"}
//       </h1>
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Customer Code</label>
//             <input
//               type="text"
//               name="customerCode"
//               value={formData.customerCode || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Customer Name</label>
//             <CustomerSearch onSelectCustomer={handleCustomerSelect} />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input
//               type="text"
//               name="contactPerson"
//               value={formData.contactPerson || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Reference Number</label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="Open">Open</option>
//               <option value="Closed">Closed</option>
//               <option value="Pending">Pending</option>
//               <option value="Cancelled">Cancelled</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input
//               type="date"
//               name="postingDate"
//               value={formData.postingDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Valid Until</label>
//             <input
//               type="date"
//               name="validUntil"
//               value={formData.validUntil || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Delivery Date</label>
//             <input
//               type="date"
//               name="documentDate"
//               value={formData.documentDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//       </div>
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           onRemoveItem={removeItemRow}
//         />
//       </div>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input
//             type="text"
//             name="salesEmployee"
//             value={formData.salesEmployee || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={formData.remarks || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           ></textarea>
//         </div>
//       </div>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Taxable Amount</label>
//           <input
//             type="number"
//             name="totalBeforeDiscount"
//             value={formData.totalBeforeDiscount || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Rounding</label>
//           <input
//             type="number"
//             name="rounding"
//             value={formData.rounding || 0}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">GST</label>
//           <input
//             type="number"
//             name="gstAmount"
//             value={formData.gstAmount || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Total Amount</label>
//           <input
//             type="number"
//             name="grandTotal"
//             value={formData.grandTotal || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//       </div>
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSubmit}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           {editId ? "Update" : "Add"}
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialState);
//             router.push("/admin/salesQuotation");
//           }}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//       </div>
//     </div>
//   );
// }

// export default SalesQuotationFormWrapper;
























"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const initialState = {
  customer: "",
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "",
  status: "Open",
  postingDate: "",
  validUntil: "",
  documentDate: "",
  items: [
    {
      item: "",
      itemCode: "",
      itemName: "",
      itemDescription: "",
      quantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstType: 0,
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      tdsAmount: 0,
      warehouse: "",
      warehouseName: "",
      warehouseCode: "",
      taxOption: "GST",
      gstRate: 0,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
    },
  ],
  salesEmployee: "",
  remarks: "",
  freight: 0,
  rounding: 0,
  totalBeforeDiscount: 0,
  totalDownPayment: 0,
  appliedAmounts: 0,
  gstAmount: 0,
  cgstAmount: 0,
  sgstAmount: 0,
  igstAmount: 0,
  grandTotal: 0,
  openBalance: 0,
};

const round = (num, decimals = 2) => {
  const n = Number(num);
  if (isNaN(n)) return 0;
  return Number(n.toFixed(decimals));
};

function formatDateForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

const computeItemValues = (item) => {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const discount = parseFloat(item.discount) || 0;
  const freight = parseFloat(item.freight) || 0;
  const priceAfterDiscount = round(unitPrice - discount);
  const totalAmount = round(quantity * priceAfterDiscount + freight);

  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgstRate = item.cgstRate !== undefined ? parseFloat(item.cgstRate) : gstRate / 2;
    const sgstRate = item.sgstRate !== undefined ? parseFloat(item.sgstRate) : gstRate / 2;
    const cgstAmount = round(totalAmount * (cgstRate / 100));
    const sgstAmount = round(totalAmount * (sgstRate / 100));
    const gstAmount = round(cgstAmount + sgstAmount);
    return {
      priceAfterDiscount,
      totalAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
    };
  } else if (item.taxOption === "IGST") {
    let igstRate = item.igstRate;
    if (igstRate === undefined || parseFloat(igstRate) === 0) {
      igstRate = item.gstRate !== undefined ? parseFloat(item.gstRate) : 0;
    } else {
      igstRate = parseFloat(igstRate);
    }
    const igstAmount = round(totalAmount * (igstRate / 100));
    return {
      priceAfterDiscount,
      totalAmount,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
    };
  }
  return {
    priceAfterDiscount,
    totalAmount,
    gstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
  };
};

function SalesQuotationFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <SalesQuotationForm />
    </Suspense>
  );
}

function SalesQuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
      setLoading(true);
      axios
        .get(`/api/sales-quotation/${editId}`)
        .then((res) => {
          if (res.data.success) {
            const record = res.data.data;
            console.log("Fetched quotation:", record);
            setFormData({
              ...record,
              customer: record.customer?._id || record.customer || "",
              customerCode: record.customerCode || "",
              customerName: record.customerName || "",
              contactPerson: record.contactPerson || "",
              postingDate: formatDateForInput(record.postingDate),
              validUntil: formatDateForInput(record.validUntil),
              documentDate: formatDateForInput(record.documentDate),
              items: record.items.map((item) => ({
                ...item,
                item: item.item?._id || item.item || "",
                itemCode: item.itemCode || "",
                itemName: item.itemName || "",
                itemDescription: item.itemDescription || "",
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                discount: item.discount || 0,
                freight: item.freight || 0,
                gstType: item.gstType || 0,
                priceAfterDiscount: item.priceAfterDiscount || 0,
                totalAmount: item.totalAmount || 0,
                gstAmount: item.gstAmount || 0,
                tdsAmount: item.tdsAmount || 0,
                warehouse: item.warehouse?._id || item.warehouse || "",
                warehouseName: item.warehouseName || "",
                warehouseCode: item.warehouseCode || "",
                taxOption: item.taxOption || "GST",
                gstRate: item.gstRate || 0,
                cgstRate: item.cgstRate || 0,
                sgstRate: item.sgstRate || 0,
                igstRate: item.igstRate || 0,
                cgstAmount: item.cgstAmount || 0,
                sgstAmount: item.sgstAmount || 0,
                igstAmount: item.igstAmount || 0,
              })),
            });
          } else {
            setError("Failed to load quotation data: " + res.data.error);
          }
        })
        .catch((err) => {
          console.error("Error fetching quotation:", err.response?.data || err.message);
          setError("Error loading quotation: " + (err.response?.data?.error || err.message));
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (editId) {
      setError("Invalid quotation ID");
    }
  }, [editId]);

  const handleCustomerSelect = useCallback((selectedCustomer) => {
    console.log("Received selectedCustomer:", selectedCustomer);
    setFormData((prev) => {
      const newState = {
        ...prev,
        customer: selectedCustomer._id || "",
        customerCode: selectedCustomer.customerCode || "",
        customerName: selectedCustomer.customerName || "",
        contactPerson: selectedCustomer.contactPersonName || "",
      };
      console.log("Updated formData:", newState);
      return newState;
    });
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleItemChange = useCallback((index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      const numericFields = [
        "quantity",
        "unitPrice",
        "discount",
        "freight",
        "gstRate",
        "cgstRate",
        "sgstRate",
        "igstRate",
        "tdsAmount",
        "priceAfterDiscount",
        "totalAmount",
        "gstAmount",
        "cgstAmount",
        "sgstAmount",
        "igstAmount",
      ];
      const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
      updatedItems[index] = { ...updatedItems[index], [name]: newValue };
      return { ...prev, items: updatedItems };
    });
  }, []);

  const removeItemRow = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const addItemRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item: "",
          itemCode: "",
          itemName: "",
          itemDescription: "",
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          freight: 0,
          gstType: 0,
          priceAfterDiscount: 0,
          totalAmount: 0,
          gstAmount: 0,
          tdsAmount: 0,
          warehouse: "",
          warehouseName: "",
          warehouseCode: "",
          taxOption: "GST",
          gstRate: 0,
          cgstRate: 0,
          sgstRate: 0,
          igstRate: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
        },
      ],
    }));
  }, []);

  useEffect(() => {
    const totalBeforeDiscountCalc = round(
      formData.items.reduce((acc, item) => {
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const discount = parseFloat(item.discount) || 0;
        const quantity = parseFloat(item.quantity) || 1;
        return acc + (unitPrice * quantity - discount);
      }, 0)
    );

    const totalItemsCalc = round(
      formData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)
    );

    const gstAmountCalc = round(
      formData.items.reduce((acc, item) => acc + (parseFloat(item.gstAmount) || 0), 0)
    );

    const overallFreight = round(parseFloat(formData.freight) || 0);
    const roundingCalc = round(parseFloat(formData.rounding) || 0);
    const totalDownPaymentCalc = round(parseFloat(formData.totalDownPayment) || 0);
    const appliedAmountsCalc = round(parseFloat(formData.appliedAmounts) || 0);

    const grandTotalCalc = round(totalItemsCalc + gstAmountCalc + overallFreight + roundingCalc);
    const openBalanceCalc = round(grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc));

    setFormData((prev) => ({
      ...prev,
      totalBeforeDiscount: totalBeforeDiscountCalc,
      gstAmount: gstAmountCalc,
      grandTotal: grandTotalCalc,
      openBalance: openBalanceCalc,
    }));
  }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

  const handleSubmit = async () => {
    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
    if (!formData.customer || !isValidObjectId(formData.customer)) {
      alert("Please select a valid customer");
      return;
    }
    if (!formData.customerCode || !formData.customerName) {
      alert("Customer code and name are required");
      return;
    }
    console.log("Submitting formData:", formData);
    
    if( editId && !isValidObjectId(editId)) {
      alert("Invalid quotation ID");
    }

    if (editId) {
      try {
        await axios.put(`/api/sales-quotation/${editId}`, formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Sales Quotation updated successfully");
        // alert("Sales Quotation updated successfully");
 
          router.push("/admin/sales-quotation-view");
      } catch (error) {
        console.error("Error updating sales quotation:", error);
        alert("Failed to update sales quotation");
      }
    } else {
      try {
        await axios.post("/api/sales-quotation", formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Sales Quotation added successfully");
        // alert("Sales Quotation added successfully");
        setFormData(initialState);
          router.push("/admin/sales-quotation-view");
      } catch (error) {
        console.error("Error adding sales quotation:", error);
        alert("Error adding sales quotation");
      }
    }
  };

  if (loading) {
    return <div className="p-4">Loading quotation...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Edit Sales Quotation" : "Create Sales Quotation"}
      </h1>
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Customer Code</label>
            <input
              type="text"
              name="customerCode"
              value={formData.customerCode || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Customer Name</label>
            <CustomerSearch onSelectCustomer={handleCustomerSelect} />
          </div>
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Reference Number</label>
            <input
              type="text"
              name="refNumber"
              value={formData.refNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              name="status"
              value={formData.status || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input
              type="date"
              name="postingDate"
              value={formData.postingDate || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Valid Until</label>
            <input
              type="date"
              name="validUntil"
              value={formData.validUntil || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Delivery Date</label>
            <input
              type="date"
              name="documentDate"
              value={formData.documentDate || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection
          items={formData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          onRemoveItem={removeItemRow}
          computeItemValues={computeItemValues}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Sales Employee</label>
          <input
            type="text"
            name="salesEmployee"
            value={formData.salesEmployee || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          ></textarea>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Taxable Amount</label>
          <input
            type="number"
            name="totalBeforeDiscount"
            value={formData.totalBeforeDiscount || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Rounding</label>
          <input
            type="number"
            name="rounding"
            value={formData.rounding || 0}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">GST</label>
          <input
            type="number"
            name="gstAmount"
            value={formData.gstAmount || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Total Amount</label>
          <input
            type="number"
            name="grandTotal"
            value={formData.grandTotal || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          {editId ? "Update" : "Add"}
        </button>
        <button
          onClick={() => {
            setFormData(initialState);
            router.push("/admin/salesQuotation");
          }}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default SalesQuotationFormWrapper;


























// "use client";
// import { useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { Suspense } from "react";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import item from "../../item/page";

// const initialState = {
//   customer: "",
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
//   status: "Open",
//   postingDate: "",
//   validUntil: "",
//   documentDate: "",
//   items: [
//     {
//       itemCode: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstType: 0,
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       tdsAmount: 0,
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//       taxOption: "GST",
//       gstRate: 0,
//       cgstRate: 0,
//       sgstRate: 0,
//       igstRate: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//     },
//   ],
//   salesEmployee: "",
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalBeforeDiscount: 0,
//   totalDownPayment: 0,
//   appliedAmounts: 0,
//   gstAmount: 0,
//   cgstAmount: 0,
//   sgstAmount: 0,
//   igstAmount: 0,
//   grandTotal: 0,
//   openBalance: 0,
// };

// // Helper function to round numbers
// const round = (num, decimals = 2) => {
//   const n = Number(num);
//   if (isNaN(n)) return 0;
//   return Number(n.toFixed(decimals));
// };

// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = ("0" + (d.getMonth() + 1)).slice(-2);
//   const day = ("0" + d.getDate()).slice(-2);
//   return `${year}-${month}-${day}`;
// }

// function SalesQuotationFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
//       <SalesQuotationForm />
//     </Suspense>
//   );
// }

// function SalesQuotationForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");
//   const [formData, setFormData] = useState(initialState);
//   const [loading, setLoading] = useState(false);
// const [error, setError] = useState(null);

// useEffect(() => {
//   if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
//     setLoading(true);
//     axios
//       .get(`/api/sales-quotation/${editId}`)
//       .then((res) => {
//         if (res.data.success) {
//           const record = res.data.data;
//           setFormData({
//             ...record,
//             customer: record.customer?._id || record.customer || "",
//             customerCode: record.customerCode || "",
//             customerName: record.customerName || "",
//             contactPerson: record.contactPerson || "",
//             postingDate: formatDateForInput(record.postingDate),
//             validUntil: formatDateForInput(record.validUntil),
//             documentDate: formatDateForInput(record.documentDate),
//             items: record.items.map((item) => ({
//               ...item,
//               item: item.item?._id || item.item || "",
//               warehouse: item.warehouse?._id || item.warehouse || "",
              
//                 itemCode: item.itemCode || "",
//                 itemName: item.itemName || "",
//                 itemDescription: item.itemDescription || "",
//                 quantity: item.quantity || 0,
//                 unitPrice: item.unitPrice || 0,
//                 discount: item.discount || 0,
//                 freight: item.freight || 0,
//                 gstType: item.gstType || 0,
//                 priceAfterDiscount: item.priceAfterDiscount || 0,
//                 totalAmount: item.totalAmount || 0,
//                 gstAmount: item.gstAmount || 0,
//                 tdsAmount: item.tdsAmount || 0,
              
//                 warehouseName: item.warehouseName || "",
//                 warehouseCode: item.warehouseCode || "",
//                 taxOption: item.taxOption || "GST",
//                 gstRate: item.gstRate || 0,
//                 cgstRate: item.cgstRate || 0,
//                 sgstRate: item.sgstRate || 0,
//                 igstRate: item.igstRate || 0,
//                 cgstAmount: item.cgstAmount || 0,
//                 sgstAmount: item.sgstAmount || 0,
//                 igstAmount: item.igstAmount || 0
//             })),
//           });
//         } else {
//           setError("Failed to load quotation data: " + res.data.error);
//         }
//       })
//       .catch((err) => {
//         setError("Error loading quotation: " + (err.response?.data?.error || err.message));
//       })
//       .finally(() => {
//         setLoading(false);
//       });
//   } else if (editId) {
//     setError("Invalid quotation ID");
//   }
// }, [editId]);

// const handleCustomerSelect = useCallback((selectedCustomer) => {
//   console.log("Received selectedCustomer:", selectedCustomer);
//   setFormData((prev) => {
//     const newState = {
//       ...prev,
//       customer: selectedCustomer._id || "",
//       customerCode: selectedCustomer.customerCode || "",
//       customerName: selectedCustomer.customerName || "",
//       contactPerson: selectedCustomer.contactPersonName || "",
//     };
//     console.log("Updated formData:", newState);
//     return newState;
//   });
// }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }, []);


//   const computeItemValues = (item) => {
//     const quantity = parseFloat(item.quantity) || 0;
//     const unitPrice = parseFloat(item.unitPrice) || 0;
//     const discount = parseFloat(item.discount) || 0;
//     const freight = parseFloat(item.freight) || 0;
//     const priceAfterDiscount = round(unitPrice - discount);
//     const totalAmount = round(quantity * priceAfterDiscount + freight);

//     if (item.taxOption === "GST") {
//       const gstRate = parseFloat(item.gstRate) || 0;
//       const cgstRate = item.cgstRate !== undefined ? parseFloat(item.cgstRate) : (gstRate / 2);
//       const sgstRate = item.sgstRate !== undefined ? parseFloat(item.sgstRate) : (gstRate / 2);
      
//       const cgstAmount = round(totalAmount * (cgstRate / 100));
//       const sgstAmount = round(totalAmount * (sgstRate / 100));
//       const gstAmount = round(cgstAmount + sgstAmount);
      
//       return { 
//         priceAfterDiscount, 
//         totalAmount, 
//         gstAmount, 
//         cgstAmount, 
//         sgstAmount, 
//         igstAmount: 0 
//       };
//     }
    
//     if (item.taxOption === "IGST") {
//       const igstRate = parseFloat(item.igstRate) || 0;
//       const igstAmount = round(totalAmount * (igstRate / 100));
//       return { 
//         priceAfterDiscount, 
//         totalAmount, 
//         gstAmount: 0, 
//         cgstAmount: 0, 
//         sgstAmount: 0, 
//         igstAmount 
//       };
//     }
    
//     return { 
//       priceAfterDiscount, 
//       totalAmount, 
//       gstAmount: 0, 
//       cgstAmount: 0, 
//       sgstAmount: 0, 
//       igstAmount: 0 
//     };
//   };

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       const numericFields = [
//         "quantity", "unitPrice", "discount", "freight", 
//         "gstRate", "cgstRate", "sgstRate", "igstRate", "tdsAmount"
//       ];
      
//       const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
//       updatedItems[index] = { ...updatedItems[index], [name]: newValue };
      
//       // Recalculate all values whenever tax-related fields change
//       if (name.includes("Rate") || name === "taxOption" || name === "quantity" || 
//           name === "unitPrice" || name === "discount" || name === "freight") {
//         const computed = computeItemValues(updatedItems[index]);
//         updatedItems[index] = { 
//           ...updatedItems[index],
//           priceAfterDiscount: computed.priceAfterDiscount,
//           totalAmount: computed.totalAmount,
//           gstAmount: computed.gstAmount,
//           cgstAmount: computed.cgstAmount,
//           sgstAmount: computed.sgstAmount,
//           igstAmount: computed.igstAmount
//         };
//       }

//       return { ...prev, items: updatedItems };
//     });
//   }, []);

//   const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);

//   const addItemRow = useCallback(() => {
//     setFormData((prev) => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
//           itemId: "",
//           itemCode: "",
//           itemName: "",
//           itemDescription: "",
//           quantity: 0,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,
//           gstType: 0,
//           priceAfterDiscount: 0,
//           totalAmount: 0,
//           gstAmount: 0,
//           tdsAmount: 0,
//           warehouse: "",
//           warehouseName: "",
//           warehouseCode: "",
//           taxOption: "GST",
//           gstRate: 0,
//           cgstRate: 0,
//           sgstRate: 0,
//           igstRate: 0,
//           cgstAmount: 0,
//           sgstAmount: 0,
//           igstAmount: 0,
//         },
//       ],
//     }));
//   }, []);

//   useEffect(() => {
//     const totalBeforeDiscountCalc = round(formData.items.reduce((acc, item) => {
//       const unitPrice = parseFloat(item.unitPrice) || 0;
//       const discount = parseFloat(item.discount) || 0;
//       const quantity = parseFloat(item.quantity) || 1;
//       return acc + (unitPrice * quantity - discount);
//     }, 0));

//     const totalItemsCalc = round(formData.items.reduce(
//       (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
//       0
//     ));

//     const gstTotalCalc = round(formData.items.reduce((acc, item) => {
//       return acc + (parseFloat(item.gstAmount) || 0);
//     }, 0));

//     const overallFreight = round(parseFloat(formData.freight) || 0);
//     const roundingCalc = round(parseFloat(formData.rounding) || 0);
//     const totalDownPaymentCalc = round(parseFloat(formData.totalDownPayment) || 0);
//     const appliedAmountsCalc = round(parseFloat(formData.appliedAmounts) || 0);

//     const grandTotalCalc = round(totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc);
//     const openBalanceCalc = round(grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc));

//     setFormData((prev) => ({
//       ...prev,
//       totalBeforeDiscount: totalBeforeDiscountCalc,
//       gstTotal: gstTotalCalc,
//       grandTotal: grandTotalCalc,
//       openBalance: openBalanceCalc,
//     }));
//   }, [
//     formData.items,
//     formData.freight,
//     formData.rounding,
//     formData.totalDownPayment,
//     formData.appliedAmounts,
//   ]);
// const handleSubmit = async () => {
//   const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
//   if (!formData.customer || !isValidObjectId(formData.customer)) {
//     alert("Please select a valid customer");
//     return;
//   }
//   if (!formData.customerCode || !formData.customerName) {
//     alert("Customer code and name are required");
//     return;
//   }
//   console.log("Submitting formData:", formData);

//   if (editId) {
//     try {
//       await axios.put(`/api/sales-quotation/${editId}`, formData, {
//         headers: { "Content-Type": "application/json" },
//       });
//       alert("Sales Quotation updated successfully");
//       router.push("/admin/salesQuotation");
//     } catch (error) {
//       console.error("Error updating sales quotation:", error);
//       alert("Failed to update sales quotation");
//     }
//   } else {
//     try {
//       await axios.post("/api/sales-quotation", formData, {
//         headers: { "Content-Type": "application/json" },
//       });
//       alert("Sales Quotation added successfully");
//       setFormData(initialState);
//     } catch (error) {
//       console.error("Error adding sales quotation:", error);
//       alert("Error adding sales quotation");
//     }
//   }
// };

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">
//         {editId ? "Edit Sales Quotation" : "Create Sales Quotation"}
//       </h1>
//       {/* Customer Section */}
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Customer Code</label>
//             <input
//               type="text"
//               name="customerCode"
//               value={formData.customerCode || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Customer Name</label>
//             <CustomerSearch onSelectCustomer={handleCustomerSelect} />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input
//               type="text"
//               name="contactPerson"
//               value={formData.contactPerson || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Reference Number</label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//         {/* Additional Quotation Info */}
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="Open">Open</option>
//               <option value="Closed">Closed</option>
//               <option value="Pending">Pending</option>
//               <option value="Cancelled">Cancelled</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input
//               type="date"
//               name="postingDate"
//               value={formData.postingDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Valid Until</label>
//             <input
//               type="date"
//               name="validUntil"
//               value={formData.validUntil || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Delivery Date</label>
//             <input
//               type="date"
//               name="documentDate"
//               value={formData.documentDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//       </div>
//       {/* Items Section */}
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           onRemoveItem={removeItemRow}
//         />
//       </div>
//       {/* Other Form Fields & Summary */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input
//             type="text"
//             name="salesEmployee"
//             value={formData.salesEmployee || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={formData.remarks || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           ></textarea>
//         </div>
//       </div>
//       {/* Summary Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Taxable Amount</label>
//           <input
//             type="number"
//             name="taxableAmount"
//             value={formData.totalBeforeDiscount || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Rounding</label>
//           <input
//             type="number"
//             name="rounding"
//             value={formData.rounding || 0}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">GST</label>
//           <input
//             type="number"
//             name="gstTotal"
//             value={formData.gstTotal || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Total Amount</label>
//           <input
//             type="number"
//             name="grandTotal"
//             value={formData.grandTotal || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//       </div>
//       {/* Action Buttons */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSubmit}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           {editId ? "Update" : "Add"}
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialState);
//             router.push("/admin/salesQuotation");
//           }}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//       </div>
//     </div>
//   );
// }

// export default SalesQuotationFormWrapper;
