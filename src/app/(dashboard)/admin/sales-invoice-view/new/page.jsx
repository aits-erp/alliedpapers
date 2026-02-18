"use client";
import React, { useState, useEffect, useCallback  } from "react";
import { Suspense, } from "react";
import { useRouter,useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// BatchModal component: Fetches available batches for the given item.
function BatchModal({ itemsbatch, onClose, onUpdateBatch }) {
  const {
    item,
    warehouse,
    itemName,
    quantity: parentQuantity,
  } = itemsbatch;

  const effectiveItemId = item;
  const effectiveWarehouseId = warehouse;

  const [inventory, setInventory] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [quantity, setQuantity] = useState(
    parentQuantity === 1 ? 1 : 1,
  );
  const [hasConfirmed, setHasConfirmed] = useState(false);

  /* Load inventory */
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await fetch(
          `/api/inventory-batch/${effectiveItemId}/${effectiveWarehouseId}`,
        );
        if (!res.ok) throw new Error("Inventory fetch failed");
        const data = await res.json();
        setInventory(data);
      } catch (err) {
        console.error(err);
        setInventory({ batches: [] });
      }
    };

    if (effectiveItemId && effectiveWarehouseId) fetchInventory();
  }, [effectiveItemId, effectiveWarehouseId]);

  /* Confirm button */
  const handleConfirm = () => {
    if (hasConfirmed) return;
    setHasConfirmed(true);

    const finalQty = parentQuantity === 1 ? 1 : quantity;

    if (!selectedBatch || finalQty <= 0) {
      toast.error("Select a batch and valid quantity");
      return;
    }
    if (finalQty > selectedBatch.quantity) {
      toast.error("Quantity exceeds available");
      return;
    }

    onUpdateBatch(selectedBatch, finalQty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="relative mx-auto max-w-xl rounded-xl bg-white p-6 shadow-md">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-xl font-bold"
        >
          &times;
        </button>
        <h2 className="mb-4 text-2xl font-bold">
          Select Batch for {itemName}
        </h2>

        {/* loading / empty */}
        {!inventory ? (
          <p>Loading inventory…</p>
        ) : inventory.batches.length === 0 ? (
          <p>No batches available</p>
        ) : (
          <>
            {/* selector */}
            <label className="block mt-4">Select Batch:</label>
            <select
              className="w-full rounded border p-2"
              onChange={(e) =>
                setSelectedBatch(
                  e.target.value
                    ? JSON.parse(e.target.value)
                    : null,
                )
              }
            >
              <option value="">-- Select --</option>
              {inventory.batches.map((b, i) => (
                <option key={i} value={JSON.stringify(b)}>
                  {b.batchNumber} — {b.quantity} available
                </option>
              ))}
            </select>

            {/* details */}
            {selectedBatch && (
              <div className="mt-4 rounded border bg-gray-100 p-4 text-sm">
                <p>
                  <strong>Batch No:</strong>{" "}
                  {selectedBatch.batchNumber}
                </p>
                <p>
                  <strong>Expiry:</strong>{" "}
                  {new Date(
                    selectedBatch.expiryDate,
                  ).toDateString()}
                </p>
                <p>
                  <strong>Mfr:</strong>{" "}
                  {selectedBatch.manufacturer}
                </p>
                <p>
                  <strong>Unit ₹:</strong>{" "}
                  {selectedBatch.unitPrice}
                </p>

                <label className="block mt-2">Qty</label>
                <input
                  type="number"
                  min="1"
                  max={selectedBatch.quantity}
                  value={parentQuantity === 1 ? 1 : quantity}
                  onChange={(e) =>
                    parentQuantity !== 1 &&
                    setQuantity(Number(e.target.value))
                  }
                 
                  className="w-full rounded border p-2"
                />
                <p className="mt-2">
                  <strong>Total ₹:</strong>{" "}
                  {(
                    (parentQuantity === 1 ? 1 : quantity) *
                    selectedBatch.unitPrice
                  ).toFixed(2)}
                </p>
              </div>
            )}

            <button
              onClick={handleConfirm}
              className="mt-4 w-full rounded bg-blue-500 p-2 text-white"
            >
              Confirm Batch
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Initial state for Sales Invoice.
const initialInvoiceState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "", // Invoice Number.
  salesEmployee: "",
  status: "Pending",
  orderDate: "",
  expectedDeliveryDate: "",
  items: [
    {
      item: "",
      itemCode: "",
      itemId: "",
      itemName: "",
      itemDescription: "",
      quantity: 0, // Total quantity for the item.
      allowedQuantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstType: 0,
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      tdsAmount: 0,
      batches: [],
      warehouse: "",
      warehouseName: "",
      warehouseCode: "",
      warehouseId: "",
      errorMessage: "",
      taxOption: "GST",
      igstAmount: 0,
      managedByBatch: true,
    },
  ],
  remarks: "",
  freight: 0,
  rounding: 0,
  totalDownPayment: 0,
  appliedAmounts: 0,
  totalBeforeDiscount: 0,
  gstTotal: 0,
  grandTotal: 0,
  openBalance: 0,
  fromQuote: false,
};

function formatDateForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}


function SalesInvoiceFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <SalesInvoiceEditPage />
    </Suspense>
  );
}

 function SalesInvoiceEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  const [formData, setFormData] = useState(initialInvoiceState);
  // modalItemIndex tracks which item (by index) is currently selecting a batch.
  const [modalItemIndex, setModalItemIndex] = useState(null);


    /* ---------------------------------------- copy from sessionStorage */
    // useEffect(() => {
    //   const key = "SalesInvoiceData" || "InvoiceData";
    //   const stored = sessionStorage.getItem(key);
    //   if (!stored) return;
    //   try {
    //     setFormData(JSON.parse(stored));
    //     setIsCopied(true);
    //   } catch (err) {
    //     console.error("Bad JSON in sessionStorage", err);
    //   } finally {
    //     sessionStorage.removeItem(key);
    //   }
    // }, []);

  const [isCopied, setIsCopied] = useState(false);


     useEffect(() => {
        if (typeof window !== "undefined") {
          let storedData = sessionStorage.getItem("InvoiceData");
          if (!storedData) {
            storedData = sessionStorage.getItem("SalesInvoiceData");
          }
          if (storedData) {
            try {
              const parsedData = JSON.parse(storedData);
              // For SO copy, if managedBy is missing but managedByBatch is true, force managedBy to "batch".
              const updatedItems = parsedData.items.map((item) => ({
                ...item,
                gstRate: item.gstRate !== undefined ? item.gstRate : 0,
                cgstAmount: item.cgstAmount !== undefined ? item.cgstAmount : 0,
                sgstAmount: item.sgstAmount !== undefined ? item.sgstAmount : 0,
                managedBy:
                  item.managedBy && item.managedBy.trim() !== ""
                    ? item.managedBy
                    : item.managedByBatch
                    ? "batch"
                    : "",
                managedByBatch:
                  item.managedByBatch !== undefined
                    ? item.managedByBatch
                    : item.managedBy &&
                      item.managedBy.toLowerCase() === "batch",
              }));
              parsedData.items = updatedItems;
              setFormData(parsedData);
              setIsCopied(true);
              sessionStorage.removeItem("InvoiceData");
              sessionStorage.removeItem("SalesInvoiceData");
            } catch (error) {
              console.error("Error parsing copied data:", error);
            }
          }
        }
      }, []);
  // Fetch existing Sales Invoice data if editing.
  useEffect(() => {
    if (editId) {
      axios
        .get(`/api/sales-invoice/${editId}`)
        .then((res) => {
          if (res.data.success) {
            const record = res.data.data;
            setFormData({
              ...record,
              orderDate: formatDateForInput(record.orderDate),
              expectedDeliveryDate: formatDateForInput(record.expectedDeliveryDate),
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching sales invoice for edit", err);
          toast.error("Error fetching sales invoice data");
        });
    }
  }, [editId]);

  // Handler for CustomerSearch: update customer fields when a customer is selected.
  const handleCustomerSelect = useCallback((selectedCustomer) => {
    setFormData((prev) => ({
      ...prev,
      customerCode: selectedCustomer.customerCode || "",
      customerName: selectedCustomer.customerName || "",
      contactPerson: selectedCustomer.contactPersonName || "",
    }));
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleItemChange = useCallback((index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [name]: value };
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
          itemId: "",
          itemName: "",
          itemDescription: "",
          quantity: 0,
          allowedQuantity: 0,
          unitPrice: 0,
          discount: 0,
          freight: 0,
          gstType: 0,
          priceAfterDiscount: 0,
          totalAmount: 0,
          gstAmount: 0,
          tdsAmount: 0,
          batches: [],
          warehouse: "",
          warehouseName: "",
          warehouseCode: "",
          warehouseId: "",
          errorMessage: "",
          taxOption: "GST",
          igstAmount: 0,
          managedByBatch: true,
        },
      ],
    }));
  }, []);

  // Calculation for summary fields.
  // useEffect(() => {
  //   const totalBeforeDiscountCalc = formData.items.reduce((acc, item) => {
  //     const unitPrice = parseFloat(item.unitPrice) || 0;
  //     const discount = parseFloat(item.discount) || 0;
  //     const quantity = parseFloat(item.quantity) || 1;
  //     return acc + (unitPrice - discount) * quantity;
  //   }, 0);

  //   const totalItemsCalc = formData.items.reduce(
  //     (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
  //     0
  //   );

  //   const gstTotalCalc = formData.items.reduce((acc, item) => {
  //     if (item.taxOption === "IGST") {
  //       return acc + (parseFloat(item.igstAmount) || 0);
  //     }
  //     return acc + (parseFloat(item.gstAmount) || 0);
  //   }, 0);

  //   const overallFreight = parseFloat(formData.freight) || 0;
  //   const roundingCalc = parseFloat(formData.rounding) || 0;
  //   const totalDownPaymentCalc = parseFloat(formData.totalDownPayment) || 0;
  //   const appliedAmountsCalc = parseFloat(formData.appliedAmounts) || 0;

  //   const grandTotalCalc = totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
  //   const openBalanceCalc = grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);

  //   setFormData((prev) => ({
  //     ...prev,
  //     totalBeforeDiscount: totalBeforeDiscountCalc,
  //     gstTotal: gstTotalCalc,
  //     grandTotal: grandTotalCalc,
  //     openBalance: openBalanceCalc,
  //   }));
  // }, [
  //   formData.items,
  //   formData.freight,
  //   formData.rounding,
  //   formData.totalDownPayment,
  //   formData.appliedAmounts,
  // ]);


  useEffect(() => {
  const items = formData.items ?? []; // ✅ safe fallback

  const totalBeforeDiscountCalc = items.reduce((acc, item) => {
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const discount = parseFloat(item.discount) || 0;
    const quantity = parseFloat(item.quantity) || 1;
    return acc + (unitPrice - discount) * quantity;
  }, 0);

  const totalItemsCalc = items.reduce(
    (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
    0
  );

  const gstTotalCalc = items.reduce((acc, item) => {
    if (item.taxOption === "IGST") {
      return acc + (parseFloat(item.igstAmount) || 0);
    }
    return acc + (parseFloat(item.gstAmount) || 0);
  }, 0);

  const overallFreight = parseFloat(formData.freight) || 0;
  const roundingCalc = parseFloat(formData.rounding) || 0;
  const totalDownPaymentCalc = parseFloat(formData.totalDownPayment) || 0;
  const appliedAmountsCalc = parseFloat(formData.appliedAmounts) || 0;

  const grandTotalCalc =
    totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
  const openBalanceCalc =
    grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);

  setFormData((prev) => ({
    ...prev,
    totalBeforeDiscount: totalBeforeDiscountCalc,
    gstTotal: gstTotalCalc,
    grandTotal: grandTotalCalc,
    openBalance: openBalanceCalc,
  }));
}, [
  formData.items,
  formData.freight,
  formData.rounding,
  formData.totalDownPayment,
  formData.appliedAmounts,
]);


  const handleSubmit = async () => {
    try {
      if (editId) {
        await axios.put(`/api/sales-invoice/${editId}`, formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Sales Invoice updated successfully");
      } else {
        await axios.post("/api/sales-invoice", formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Sales Invoice added successfully");
        setFormData(initialInvoiceState);
      }
      router.push("/admin/sales-invoice-view");
    } catch (error) {
      console.error("Error saving sales invoice:", error);
      toast.error(editId ? "Failed to update sales invoice" : "Error adding sales invoice");
    }
  };

  // Batch update: Update allocated batch for a specific item.
const handleUpdateBatch = (batch, allocatedQuantity) => {
  const item = formData.items?.[modalItemIndex];
  if (!item) {
    toast.error("Item not found for batch allocation");
    return;
  }

  const currentAllocatedTotal = (item.batches ?? []).reduce(
    (sum, batchItem) => sum + (batchItem.allocatedQuantity || 0),
    0
  );

  const newTotal = currentAllocatedTotal + allocatedQuantity;
  if (newTotal > item.quantity) {
    toast.error("Total allocated quantity exceeds the item quantity");
    return;
  }

  setFormData((prev) => {
    const updatedItems = [...prev.items];
    const targetItem = { ...updatedItems[modalItemIndex] };

    // Ensure batches array is initialized
    targetItem.batches = targetItem.batches ?? [];

    if (targetItem.quantity === 1) {
      targetItem.batches = [
        {
          batchCode: batch.batchNumber,
          expiryDate: batch.expiryDate,
          manufacturer: batch.manufacturer,
          allocatedQuantity: 1,
          availableQuantity: batch.quantity,
        },
      ];
    } else {
      const existingIndex = targetItem.batches.findIndex(
        (b) => b.batchCode === batch.batchNumber
      );

      if (existingIndex !== -1) {
        targetItem.batches[existingIndex].allocatedQuantity += allocatedQuantity;
      } else {
        targetItem.batches.push({
          batchCode: batch.batchNumber,
          expiryDate: batch.expiryDate,
          manufacturer: batch.manufacturer,
          allocatedQuantity,
          availableQuantity: batch.quantity,
        });
      }
    }

    updatedItems[modalItemIndex] = targetItem;
    return { ...prev, items: updatedItems };
  });
};


  const openBatchModal = (index) => {
    console.log("Opening Batch Modal for item index:", index);
    setModalItemIndex(index);
  };

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Edit Sales Invoice" : "Create Sales Invoice"}
      </h1>
      
      {/* Customer Section */}
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="grid grid-cols-2 gap-7">
            <div>
                  <label className="block mb-2 font-medium">Customer Name</label>
                     {formData.customerName ? (
                                  <input
                                    type="text"
                                    name="supplierName"
                                    value={formData.customerName}
                                    readOnly
                                    className="w-full p-2 border rounded bg-gray-100"
                                  />
                                ) : (
                                  <CustomerSearch onSelectCustomer={handleCustomerSelect} />
                                )}
                    
                  </div>
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
            <label className="block mb-2 font-medium">Invoice Number</label>
            <input
              type="text"
              name="refNumber"
              value={formData.refNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        {/* Additional Invoice Info */}
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              name="status"
              value={formData.status || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select status (optional)</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Invoice Date</label>
            <input
              type="date"
              name="orderDate"
              value={formData.orderDate || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Expected Payment Date</label>
            <input
              type="date"
              name="expectedDeliveryDate"
              value={formData.expectedDeliveryDate || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>
      
      {/* Items Section */}
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        {/* <ItemSection
          items={formData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          setFormData={setFormData}
          removeItemRow={removeItemRow}
        /> */}

           <ItemSection
          items={formData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
        
              onRemoveItem={removeItemRow}
       
          setFormData={setFormData}
        />
   

        
      </div>
      
      {/* Batch Selection Section (for items managed by batch) */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Batch Selection</h2>
        {formData.items.map((item, index) => {
          if (!item.managedByBatch) return null;
          return (
            <div key={index} className="border p-2 my-2">
              <div className="flex items-center justify-between">
                <span>{item.itemName || `Item ${index + 1}`}</span>
                <button
                  onClick={() => {
                    console.log("Opening Batch Modal for item index:", index);
                    openBatchModal(index);
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded"
                >
                  Select Batch
                </button>
              </div>
              {item.batches && item.batches.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Allocated Batches:</p>
                  <ul>
                    {item.batches.map((batch, idx) => (
                      <li key={idx} className="text-xs">
                        {batch.batchCode}: {batch.allocatedQuantity} allocated (Available: {batch.availableQuantity})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Remarks & Sales Employee */}
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
      
      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Taxable Amount</label>
          <input
            type="number"
            name="totalBeforeDiscount"
            value={
              formData.items.reduce(
                (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
                0
              ).toFixed(2)
            }
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
            name="gstTotal"
            value={formData.gstTotal || 0}
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
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          {editId ? "Update Sales Invoice" : "Add Sales Invoice"}
        </button>
        <button
          onClick={() => router.push("/admin/sales-invoice-view")}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
      </div>
      
      {/* Render the Batch Modal if an item is selected for batch editing */}
      {modalItemIndex !== null && (
        <BatchModal
          itemsbatch={formData.items[modalItemIndex]}
          onClose={() => setModalItemIndex(null)}
          onUpdateBatch={handleUpdateBatch}
        />
      )}
      
      <ToastContainer />
    </div>
  );
}

export default SalesInvoiceFormWrapper;








// "use client";
// import React, {
//   useState,
//   useEffect,
//   useCallback,
//   Suspense,
// } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// /* -------------------------------------------------------------- */
// /* Helper: map SO / Delivery into a fresh Invoice object          */
// /* -------------------------------------------------------------- */
// import { initialInvoiceState } from "./invoiceInitialState"; // if you keep the state in a separate file, else keep below

// function mapSourceToInvoice(src, type) {
//   return {
//     ...initialInvoiceState,
//     customerCode: src.customerCode,
//     customerName: src.customerName,
//     contactPerson: src.contactPerson,
//     orderDate: formatDateForInput(new Date()),
//     expectedDeliveryDate: "",
//     salesEmployee: src.salesEmployee ?? "",
//     remarks: src.remarks ?? "",
//     items: src.items.map((it) => ({
//       ...initialInvoiceState.items[0],
//       item: it.item,
//       itemCode: it.itemCode,
//       itemId: it.itemId,
//       itemName: it.itemName,
//       itemDescription: it.itemDescription,
//       quantity: it.quantity,
//       allowedQuantity: it.allowedQuantity ?? it.quantity,
//       unitPrice: it.unitPrice,
//       managedByBatch: it.managedByBatch,
//       warehouse: it.warehouse,
//       warehouseName: it.warehouseName,
//       warehouseCode: it.warehouseCode,
//       warehouseId: it.warehouseId,
//       batches: type === "DO" ? [...(it.batches ?? [])] : [],
//     })),
//   };
// }

// /* -------------------------------------------------------------- */
// /* Date formatting helper                                          */
// /* -------------------------------------------------------------- */
// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = ("0" + (d.getMonth() + 1)).slice(-2);
//   const day = ("0" + d.getDate()).slice(-2);
//   return `${year}-${month}-${day}`;
// }

// /* -------------------------------------------------------------- */
// /* BatchModal component                                            */
// /* -------------------------------------------------------------- */
// function BatchModal({ itemsbatch, onClose, onUpdateBatch }) {
//   const { item, warehouse, itemName, quantity: parentQuantity } = itemsbatch;
//   const [inventory, setInventory] = useState(null);
//   const [selectedBatch, setSelectedBatch] = useState(null);
//   const [quantity, setQuantity] = useState(parentQuantity === 1 ? 1 : 1);
//   const [hasConfirmed, setHasConfirmed] = useState(false);

//   useEffect(() => {
//     async function fetchInventory() {
//       try {
//         const response = await fetch(`/api/inventory/${item}/${warehouse}`);
//         if (!response.ok) throw new Error("Failed to fetch inventory");
//         const data = await response.json();
//         setInventory(data);
//       } catch (error) {
//         console.error("Error fetching inventory:", error);
//         setInventory({ batches: [] });
//       }
//     }
//     if (item && warehouse) fetchInventory();
//     else setInventory({ batches: [] });
//   }, [item, warehouse]);

//   const handleConfirm = () => {
//     if (hasConfirmed) return;
//     setHasConfirmed(true);
//     const finalQty = parentQuantity === 1 ? 1 : quantity;
//     if (!selectedBatch || finalQty <= 0) {
//       toast.error("Select a batch and valid quantity");
//       return;
//     }
//     if (finalQty > selectedBatch.quantity) {
//       toast.error("Quantity exceeds available");
//       return;
//     }
//     onUpdateBatch(selectedBatch, finalQty);
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
//       <div className="relative mx-auto max-w-xl rounded-xl bg-white p-6 shadow-md">
//         <button onClick={onClose} className="absolute top-2 right-2 text-xl font-bold">
//           &times;
//         </button>
//         <h2 className="mb-4 text-2xl font-bold">Select Batch for {itemName}</h2>
//         {!inventory ? (
//           <p>Loading inventory…</p>
//         ) : inventory.batches.length === 0 ? (
//           <p>No batches available</p>
//         ) : (
//           <>
//             <label className="block mt-4">Select Batch:</label>
//             <select
//               className="w-full rounded border p-2"
//               onChange={(e) => setSelectedBatch(e.target.value ? JSON.parse(e.target.value) : null)}
//             >
//               <option value="">-- Select --</option>
//               {inventory.batches.map((b, i) => (
//                 <option key={i} value={JSON.stringify(b)}>
//                   {b.batchNumber} — {b.quantity} available
//                 </option>
//               ))}
//             </select>
//             {selectedBatch && (
//               <div className="mt-4 rounded border bg-gray-100 p-4 text-sm">
//                 <p><strong>Batch No:</strong> {selectedBatch.batchNumber}</p>
//                 <p><strong>Expiry:</strong> {new Date(selectedBatch.expiryDate).toDateString()}</p>
//                 <p><strong>Mfr:</strong> {selectedBatch.manufacturer}</p>
//                 <p><strong>Unit ₹:</strong> {selectedBatch.unitPrice}</p>
//                 <label className="block mt-2">Qty</label>
//                 <input
//                   type="number"
//                   min="1"
//                   max={selectedBatch.quantity}
//                   value={parentQuantity === 1 ? 1 : quantity}
//                   onChange={(e) => parentQuantity !== 1 && setQuantity(Number(e.target.value))}
//                   disabled={parentQuantity === 1}
//                   className="w-full rounded border p-2"
//                 />
//                 <p className="mt-2"><strong>Total ₹:</strong> {((parentQuantity === 1 ? 1 : quantity) * selectedBatch.unitPrice).toFixed(2)}</p>
//               </div>
//             )}
//             <button onClick={handleConfirm} className="mt-4 w-full rounded bg-blue-500 p-2 text-white">
//               Confirm Batch
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// /* -------------------------------------------------------------- */
// /* SalesInvoiceForm wrapper (Suspense)                              */
// /* -------------------------------------------------------------- */
// export default function SalesInvoiceFormWrapper() {
//   return (
//     <Suspense fallback={<div className="py-10 text-center">Loading form data…</div>}>
//       <SalesInvoiceEditPage />
//     </Suspense>
//   );
// }

// /* -------------------------------------------------------------- */
// /* Main page component                                             */
// /* -------------------------------------------------------------- */
// function SalesInvoiceEditPage() {
//   const router = useRouter();
//   const params = useSearchParams();

//   const editId = params.get("editId");
//   const sourceType = params.get("sourceType"); // "SO" | "DO" | null
//   const sourceId = params.get("sourceId");

//   const [formData, setFormData] = useState(initialInvoiceState);
//   const [modalItemIndex, setModalItemIndex] = useState(null);
//   const [loading, setLoading] = useState(Boolean(editId));

//   /* ---------------------- load for edit ----------------------- */
//   useEffect(() => {
//     if (!editId) return;
//     (async () => {
//       try {
//         const { data } = await axios.get(`/api/sales-invoice/${editId}`);
//         if (data.success) {
//           const rec = data.data;
//           setFormData({
//             ...rec,
//             orderDate: formatDateForInput(rec.orderDate),
//             expectedDeliveryDate: formatDateForInput(rec.expectedDeliveryDate),
//           });
//         }
//       } catch (err) {
//         toast.error("Failed to fetch invoice");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [editId]);

//   /* -------- pre‑fill when converting from SO / Delivery ------- */
//   useEffect(() => {
//     if (!sourceType || !sourceId) return;
//     (async () => {
//       const endpoint =
//         sourceType === "SO"
//           ? `/api/sales-order/${sourceId}`
//           : `/api/delivery/${sourceId}`;
//       try {
//         const { data } = await axios.get(endpoint);
//         if (!data.success) throw new Error("fetch failed");
//         const mapped = mapSourceToInvoice(data.data, sourceType);
//         setFormData(mapped);
//       } catch (err) {
//         console.error("Prefill error", err);
//         toast.error(`Failed to pre-fill from ${sourceType}`);
//       }
//     })();
//   }, [sourceType, sourceId]);

//   /* ------------------- handlers ------------------------------- */
//   const handleCustomerSelect = useCallback((c) => {
//     setFormData((p) => ({
//       ...p,
//       customerCode: c.customerCode ?? "",
//       customerName: c.customerName ?? "",
//       contactPerson: c.contactPersonName ?? "",
//     }));
//   }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((p) => ({ ...p, [name]: value }));
//   }, []);

//   const handleItemChange = useCallback((idx, e) => {
//     const { name, value } = e.target;
//     setFormData((p) => {
//       const items = [...p.items];
//       items[idx] = { ...items[idx], [name]: value };
//       return { ...p, items };
//     });
//   }, []);

//   const addItemRow = useCallback(() => {
//     setFormData((p) => ({ ...p, items: [...p.items, { ...initialInvoiceState.items[0] }] }));
//   }, []);

//   const removeItemRow = useCallback((idx) => {
//     setFormData((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
//   }, []);

//   /* ------------------ calculations ---------------------------- */
//   useEffect(() => {
//     const totalBeforeDiscount = formData.items.reduce((acc, it) => {
//       const up = Number(it.unitPrice) || 0;
//       const disc = Number(it.discount) || 0;
//       const qty = Number(it.quantity) || 0;
//       return acc + (up - disc) * qty;
//     }, 0);

//     const gstTotal = formData.items.reduce((acc, it) => {
//       if (it.taxOption === "IGST") return acc + (Number(it.igstAmount) || 0);
//       return acc + (Number(it.gstAmount) || 0);
//     }, 0);

//     const freight = Number(formData.freight) || 0;
//     const rounding = Number(formData.rounding) || 0;
//     const grandTotal = totalBeforeDiscount + gstTotal + freight + rounding;

//     setFormData((p) => ({
//       ...p,
//       totalBeforeDiscount,
//       gstTotal,
//       grandTotal,
//       openBalance: grandTotal - ((Number(p.totalDownPayment) || 0) + (Number(p.appliedAmounts) || 0)),
//     }));
//   }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

//   /* ------------------ batch updates --------------------------- */
//   const handleUpdateBatch = (batch, qty) => {
//     setFormData((prev) => {
//       const items = [...prev.items];
//       const target = { ...items[modalItemIndex] };
//       const batchesArr = target.batches ?? [];
//       const allocated = batchesArr.reduce((s, b) => s + (b.allocatedQuantity || 0), 0);
//       if (allocated + qty > target.quantity) {
//         toast.error("Allocation exceeds item quantity");
//         return prev;
//       }

//       const idx = batchesArr.findIndex((b) => b.batchCode === batch.batchNumber);
//       if (idx === -1) {
//         batchesArr.push({
//           batchCode: batch.batchNumber,
//           expiryDate: batch.expiryDate,
//           manufacturer: batch.manufacturer,
//           allocatedQuantity: qty,
//           availableQuantity: batch.quantity - qty,
//         });
//       } else {
//         batchesArr[idx] = {
//           ...batchesArr[idx],
//           allocatedQuantity: batchesArr[idx].allocatedQuantity + qty,
//           availableQuantity: batch.quantity - (batchesArr[idx].allocatedQuantity + qty),
//         };
//       }
//       target.batches = batchesArr;
//       items[modalItemIndex] = target;
//       return { ...prev, items };
//     });
//   };

//   /* ------------------ submit ---------------------------------- */
//   const handleSubmit = async () => {
//     try {
//       if (editId) {
//         await axios.put(`/api/sales-invoice/${editId}`, formData, { headers: { "Content-Type": "application/json" } });
//         toast.success("Invoice updated");
//       } else {
//         await axios.post("/api/sales-invoice", formData, { headers: { "Content-Type": "application/json" } });
//         toast.success("Invoice created");
//         setFormData(initialInvoiceState);
//       }
//       router.push("/admin/sales-invoice-view");
//     } catch (err) {
//       console.error(err);
//       toast.error("Save failed");
//     }
//   };

//   /* ------------------ render ---------------------------------- */
//   if (loading) return <div className="p-8">Loading…</div>;

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       {/* header, customer fields, item table, etc.  (omitted for brevity) */}
//       {/* ... use the existing JSX from your previous component ... */}

//       {/* Items section */}
//       <ItemSection
//         items={formData.items}
//         onItemChange={handleItemChange}
//         onAddItem={addItemRow}
//         onRemoveItem={removeItemRow}
//         setFormData={setFormData}
//       />

//       {/* Batch selection list */}
//       {formData.items.map((it, idx) =>
//         !it.managedByBatch ? null : (
//           <div key={idx} className="my-2 border p-2">
//             <div className="flex items-center justify-between">
//               <span>{it.itemName || `Item ${idx + 1}`}</span>
//               <button onClick={() => setModalItemIndex(idx)} className="rounded bg-blue-500 px-3 py-1 text-white">
//                 Select Batch
//               </button>
//             </div>
//             {it.batches?.length > 0 && (
//               <ul className="mt-2 text-xs">
//                 {it.batches.map((b, i) => (
//                   <li key={i}>{b.batchCode}: {b.allocatedQuantity}/{b.availableQuantity + b.allocatedQuantity}</li>
//                 ))}
//               </ul>
//             )}
//           </div>
//         )
//       )}

//       {/* buttons */}
//       <button onClick={handleSubmit} className="mt-6 rounded bg-orange-500 px-6 py-2 text-white">
//         {editId ? "Update" : "Add"}
//       </button>

//       {modalItemIndex !== null && (
//         <BatchModal itemsbatch={formData.items[modalItemIndex]} onClose={() => setModalItemIndex(null)} onUpdateBatch={handleUpdateBatch} />
//       )}
//       <ToastContainer />
//     </div>
//   );
// }


// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import SupplierSearch from "@/components/SupplierSearch";
// import Link from "next/link";
// import { FaEdit } from "react-icons/fa";

// const initialState = {
//   supplierCode: "",
//   supplierName: "",
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
//     },
//   ],
//   salesEmployee: "",
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalBeforeDiscount: 0,
//   totalDownPayment: 0,
//   appliedAmounts: 0,
//   gstTotal: 0,
//   grandTotal: 0,
//   openBalance: 0,
// };

// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = ("0" + (d.getMonth() + 1)).slice(-2);
//   const day = ("0" + d.getDate()).slice(-2);
//   return `${year}-${month}-${day}`;
// }

// export default function OrderForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");

//   const [formData, setFormData] = useState(initialState);

//   useEffect(() => {
//     if (editId) {
//       axios
//         .get(`/api/sales-invoice/${editId}`)
//         .then((res) => {
//           if (res.data.success) {
//             const record = res.data.data;
//             setFormData({
//               ...record,
//               postingDate: formatDateForInput(record.postingDate),
//               validUntil: formatDateForInput(record.validUntil),
//               documentDate: formatDateForInput(record.documentDate),
//             });
//             console.log(record)
//           }
//         })
//         .catch((err) => {
//           console.error("Error fetching purchase-order data for editing:", err);
//         });
//     }
//   }, [editId]);

  

//   const handleSupplierSelect = useCallback((selectedSupplier) => {
//     setFormData((prev) => ({
//       ...prev,
//       supplierCode: selectedSupplier.supplierCode || "",
//       supplierName: selectedSupplier.supplierName || "",
//       contactPerson: selectedSupplier.contactPersonName || "",
//     }));
//   }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }, []);

//   const handleItemChange = (index, field, value) => {
//     const updatedItems = [...formData.items];
//     updatedItems[index][field] = value;
//     setFormData((prev) => ({ ...prev, items: updatedItems }));
//   };
//   const addItemRow = useCallback(() => {
//     setFormData((prev) => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
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
//         },
//       ],
//     }));
//   }, []);

//   const handleRemoveItem = (index) => {
//     const updatedItems = formData.items.filter((_, i) => i !== index);
//     setFormData((prev) => ({ ...prev, items: updatedItems }));
//   };

//   const handleSubmit = async () => {
//     if (editId) {
//       try {
//         await axios.put(`/api/sales-invoice/${editId}`, formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         alert("sales-invoice updated successfully");
//         router.push("/admin/sales-invoice-view");
//       } catch (error) {
//         console.error("Error updating GRN:", error);
//         alert("Failed to update sales-invoice");
//       }
//     } else {
//       try {
//         await axios.post("/api/sales-invoice", formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         alert("sales-invoice added successfully");
//         setFormData(initialState);
//         router.push("/admin/sales-invoice-view");
//       } catch (error) {
//         console.error("Error adding purchaseInvoice-view:", error);
//         alert("Error adding sales-invoice-view");
//       }
//     }
//   };
//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">
//         {editId ? "Edit Order" : "Create Order"}
//       </h1>
//       {/* Supplier Section */}
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="grid grid-cols-2 gap-7">
//           <div>
//             <label className="block mb-2 font-medium">Supplier Name</label>
//             <SupplierSearch onSelectSupplier={handleSupplierSelect} />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Supplier Code</label>
//             <input
//               type="text"
//               name="supplierCode"
//               value={formData.supplierCode || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
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
//         {/* Additional Order Info */}
//         <div className="w-full md:w-1/2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="">Select status (optional)</option>
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
//             value={formData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)}
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
//           onClick={() => router.push("/admin/purchase-order-view")}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//       </div>
//     </div>
//   );
// }
