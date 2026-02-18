"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ------------------------------------------------------------------ */
/* Batch-selection modal (unchanged, but reused here)                  */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* Initial form template                                              */
/* ------------------------------------------------------------------ */
const initialDeliveryState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "",
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

/* helper */
const formatDate = (d) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

/* ------------------------------------------------------------------ */
/* Wrapper to make Suspense work                                      */
/* ------------------------------------------------------------------ */
function DeliveryFormWrapper() {
  return (
    <Suspense
      fallback={
        <div className="py-10 text-center">Loading form data…</div>
      }
    >
      <DeliveryForm />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/* Main form                                                          */
/* ------------------------------------------------------------------ */
function DeliveryForm() {
  const router = useRouter();
  const query = useSearchParams();
  const editId = query.get("editId");

  const [formData, setFormData] = useState(initialDeliveryState);
  const [modalItemIndex, setModalItemIndex] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(Boolean(editId));

  /* -------------------------------------------------- load for edit */
  useEffect(() => {
    if (!editId) return;

    (async () => {
      try {
        const { data } = await axios.get(`/api/delivery/${editId}`);
        if (data.success) {
          const rec = data.data;
          setFormData({
            ...rec,
            orderDate: formatDate(rec.orderDate),
            expectedDeliveryDate: formatDate(rec.expectedDeliveryDate),
          });
        }
      } catch (err) {
        toast.error("Failed to fetch delivery");
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [editId]);

  /* ---------------------------------------- copy from sessionStorage */
  useEffect(() => {
    const key = "deliveryData";
    const stored = sessionStorage.getItem(key);
    if (!stored) return;
    try {
      setFormData(JSON.parse(stored));
      setIsCopied(true);
    } catch (err) {
      console.error("Bad JSON in sessionStorage", err);
    } finally {
      sessionStorage.removeItem(key);
    }
  }, []);

  /* ------------------------------------------------ recalc totals */
  useEffect(() => {
    const totalBeforeDiscount = formData.items.reduce(
      (acc, it) => {
        const up = Number(it.unitPrice) || 0;
        const disc = Number(it.discount) || 0;
        const qty = Number(it.quantity) || 0;
        return acc + (up - disc) * qty;
      },
      0,
    ) ?? 0;

    const gstTotal = formData.items.reduce((acc, it) => {
      if (it.taxOption === "IGST")
        return acc + (Number(it.igstAmount) || 0);
      return acc + (Number(it.gstAmount) || 0);
    }, 0) ?? 0;

    const freight = Number(formData.freight) || 0;
    const rounding = Number(formData.rounding) || 0;
    const grandTotal =
      totalBeforeDiscount + gstTotal + freight + rounding;

    setFormData((p) => ({
      ...p,
      totalBeforeDiscount,
      gstTotal,
      grandTotal,
      openBalance:
        grandTotal -
        ((Number(p.totalDownPayment) || 0) +
          (Number(p.appliedAmounts) || 0)),
    }));
  }, [
    formData.items,
    formData.freight,
    formData.rounding,
    formData.totalDownPayment,
    formData.appliedAmounts,
  ]);

  /* ------------------------------------------------ field handlers */
  const onInput = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  }, []);

  const onCustomer = useCallback((c) => {
    setFormData((p) => ({
      ...p,
      customerCode: c.customerCode ?? "",
      customerName: c.customerName ?? "",
      contactPerson: c.contactPersonName ?? "",
    }));
  }, []);

  const onItemField = useCallback((idx, e) => {
    const { name, value } = e.target;
    setFormData((p) => {
      const items = [...p.items];
      items[idx] = { ...items[idx], [name]: value };
      return { ...p, items };
    });
  }, []);

  const addItem = useCallback(() => {
    setFormData((p) => ({
      ...p,
      items: [...p.items, { ...initialDeliveryState.items[0] }],
    }));
  }, []);

  const removeItemRow = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  /* ------------------------------------------------ batch updates */
const onUpdateBatch = (batch, qty) => {
  setFormData((prev) => {
    const items = [...prev.items];
    const target = { ...items[modalItemIndex] };

    // ✅ Ensure batches is always an array
    target.batches = target.batches ?? [];

    const allocated = target.batches.reduce(
      (s, b) => s + (b.allocatedQuantity || 0),
      0
    );

    if (allocated + qty > target.quantity) {
      toast.error("Allocation exceeds item quantity");
      return prev;
    }

    const idx = target.batches.findIndex(
      (b) => b.batchCode === batch.batchNumber
    );

    if (idx === -1) {
      target.batches.push({
        batchCode: batch.batchNumber,
        expiryDate: batch.expiryDate,
        manufacturer: batch.manufacturer,
        allocatedQuantity: qty,
        availableQuantity: batch.quantity - qty,
      });
    } else {
      const line = { ...target.batches[idx] };
      line.allocatedQuantity += qty;
      line.availableQuantity = batch.quantity - line.allocatedQuantity;
      target.batches[idx] = line;
    }

    items[modalItemIndex] = target;
    return { ...prev, items };
  });
};


  /* ------------------------------------------------ submit */
  const handleSubmit = async () => {
    try {
      if (editId) {
        await axios.put(`/api/delivery/${editId}`, formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Delivery updated");
      } else {
        await axios.post("/api/delivery", formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Delivery created");
        setFormData(initialDeliveryState);
      }
      router.push("/admin/delivery-view");
    } catch (err) {
      console.error(err);
      toast.error("Save failed");
    }
  };

  /* ------------------------------------------------ render */
  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="mb-4 text-2xl font-bold">
        {editId ? "Edit Delivery" : "Create Delivery"}
      </h1>

      {/* ---------------- Customer ---------------- */}
      <div className="m-10 flex flex-wrap justify-between rounded-lg border p-5 shadow-lg">
        <div className="basis-full md:basis-1/2 space-y-4 px-2">
          <div>
            <label className="mb-2 block font-medium">
              Customer Code
            </label>
            <input
              type="text"
              name="customerCode"
              value={formData.customerCode}
              readOnly
              className="w-full rounded border bg-gray-100 p-2"
            />
          </div>
          <div>
            {isCopied ? (
              <>
                <label className="mb-2 block font-medium">
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={onInput}
                  className="w-full rounded border p-2"
                />
              </>
            ) : (
              <>
                <label className="mb-2 block font-medium">
                  Customer Name
                </label>
                <CustomerSearch onSelectCustomer={onCustomer} />
              </>
            )}
          </div>
          <div>
            <label className="mb-2 block font-medium">
              Contact Person
            </label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              readOnly
              className="w-full rounded border bg-gray-100 p-2"
            />
          </div>
          <div>
            <label className="mb-2 block font-medium">
              Delivery No
            </label>
            <input
              type="text"
              name="refNumber"
              value={formData.refNumber}
              onChange={onInput}
              className="w-full rounded border p-2"
            />
          </div>
        </div>
        {/* status & dates */}
        <div className="basis-full md:basis-1/2 space-y-4 px-2">
          <div>
            <label className="mb-2 block font-medium">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={onInput}
              className="w-full rounded border p-2"
            >
              <option value="">Select status…</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block font-medium">
              Order Date
            </label>
            <input
              type="date"
              name="orderDate"
              value={formData.orderDate}
              onChange={onInput}
              className="w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="mb-2 block font-medium">
              Expected Delivery Date
            </label>
            <input
              type="date"
              name="expectedDeliveryDate"
              value={formData.expectedDeliveryDate}
              onChange={onInput}
              className="w-full rounded border p-2"
            />
          </div>
        </div>
      </div>

      {/* ---------------- Items ---------------- */}
      <h2 className="mt-6 text-xl font-semibold">Items</h2>
      <div className="m-10 flex flex-col rounded-lg border p-5 shadow-lg">
        <ItemSection
          items={formData.items}
          onItemChange={onItemField}
          onAddItem={addItem}
           onRemoveItem={removeItemRow}
          setFormData={setFormData}
        />
      </div>

      {/* ---------------- Batch selection ---------------- */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Batch Selection</h2>
        {formData.items.map((it, idx) =>
          it.managedByBatch === false ? null : (
            <div key={idx} className="my-2 border p-2">
              <div className="flex items-center justify-between">
                <span>{it.itemName || `Item ${idx + 1}`}</span>
                <button
                  onClick={() => setModalItemIndex(idx)}
                  className="rounded bg-blue-500 px-3 py-1 text-white"
                >
                  Select Batch
                </button>
              </div>
              {it.batches?.length > 0 && (
                <div className="mt-2 text-xs">
                  <p className="font-medium">Allocated:</p>
                  <ul>
                    {it.batches.map((b, i) => (
                      <li key={i}>
                        {b.batchCode}: {b.allocatedQuantity}/
                        {b.availableQuantity + b.allocatedQuantity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ),
        )}
      </div>

      {/* ---------------- Remarks & employee ---------------- */}
      <div className="grid grid-cols-1 gap-4 p-8 m-8 rounded-lg border shadow-lg md:grid-cols-2">
        <div>
          <label className="mb-2 block font-medium">
            Delivery Person
          </label>
          <input
            type="text"
            name="salesEmployee"
            value={formData.salesEmployee}
            onChange={onInput}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="mb-2 block font-medium">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={onInput}
            className="w-full rounded border p-2"
          />
        </div>
      </div>

      {/* ---------------- Summary ---------------- */}
      <div className="grid grid-cols-1 gap-4 p-8 m-8 rounded-lg border shadow-lg md:grid-cols-2">
        <div>
          <label className="mb-2 block font-medium">
            Taxable Amount
          </label>
          <input
            type="number"
            value={formData.totalBeforeDiscount.toFixed(2)}
            readOnly
            className="w-full rounded border bg-gray-100 p-2"
          />
        </div>
        <div>
          <label className="mb-2 block font-medium">Rounding</label>
          <input
            type="number"
            name="rounding"
            value={formData.rounding}
            onChange={onInput}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="mb-2 block font-medium">GST Total</label>
          <input
            type="number"
            value={formData.gstTotal.toFixed(2)}
            readOnly
            className="w-full rounded border bg-gray-100 p-2"
          />
        </div>
        <div>
          <label className="mb-2 block font-medium">Grand Total</label>
          <input
            type="number"
            value={formData.grandTotal.toFixed(2)}
            readOnly
            className="w-full rounded border bg-gray-100 p-2"
          />
        </div>
      </div>

      {/* ---------------- buttons ---------------- */}
      <div className="flex flex-wrap gap-4 p-8 m-8 rounded-lg border shadow-lg">
        <button
          onClick={handleSubmit}
          className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
        >
          {editId ? "Update" : "Add"}
        </button>
        <button
          onClick={() => {
            setFormData(initialDeliveryState);
            router.push("/admin/delivery-view");
          }}
          className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            sessionStorage.setItem(
              "deliveryData",
              JSON.stringify(formData),
            );
            alert("Delivery copied to clipboard!");
          }}
          className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
        >
          Copy From
        </button>
      </div>

      {/* modal + toast */}
      {modalItemIndex !== null && (
        <BatchModal
          itemsbatch={formData.items[modalItemIndex]}
          onClose={() => setModalItemIndex(null)}
          onUpdateBatch={onUpdateBatch}
        />
      )}
      <ToastContainer />
    </div>
  );
}

export default DeliveryFormWrapper;





// "use client";
// import React, { useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import {Suspense} from "react";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // BatchModal component: Fetches available batches for the given item.
// function BatchModal({ itemsbatch, onClose, onUpdateBatch }) {
//   const { item, warehouse, itemName, quantity: parentQuantity } = itemsbatch;
//   const effectiveItemId = item;
//   const effectiveWarehouseId = warehouse;

//   const [inventory, setInventory] = useState(null);
//   const [selectedBatch, setSelectedBatch] = useState(null);
//   // Force allocation to 1 if parent's quantity is 1.
//   const [quantity, setQuantity] = useState(parentQuantity === 1 ? 1 : 1);
//   const [hasConfirmed, setHasConfirmed] = useState(false);

//   useEffect(() => {
//     async function fetchInventory() {
//       try {
//         const response = await fetch(
//           `/api/inventory/${effectiveItemId}/${effectiveWarehouseId}`
//         );
//         if (!response.ok) throw new Error("Failed to fetch inventory");
//         const data = await response.json();
//         setInventory(data);
//       } catch (error) {
//         console.error("Error fetching inventory:", error);
//         setInventory({ batches: [] });
//       }
//     }
//     if (effectiveItemId && effectiveWarehouseId) {
//       fetchInventory();
//     } else {
//       setInventory({ batches: [] });
//     }
//   }, [effectiveItemId, effectiveWarehouseId]);

//   const handleConfirm = () => {
//     if (hasConfirmed) return;
//     setHasConfirmed(true);
//     const finalQuantity = parentQuantity === 1 ? 1 : quantity;
//     if (!selectedBatch || finalQuantity <= 0) {
//       toast.error("Please select a batch and enter a valid quantity");
//       return;
//     }
//     if (finalQuantity > selectedBatch.quantity) {
//       toast.error("Entered quantity exceeds available batch quantity");
//       return;
//     }
//     onUpdateBatch(selectedBatch, finalQuantity);
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
//       <div className="p-6 max-w-xl mx-auto bg-white shadow-md rounded-xl relative">
//         <button onClick={onClose} className="absolute top-2 right-2 text-xl font-bold">
//           &times;
//         </button>
//         <h2 className="text-2xl font-bold mb-4">Select Batch for {itemName}</h2>
//         {!inventory ? (
//           <p>Loading inventory...</p>
//         ) : inventory.batches.length === 0 ? (
//           <p>No batches available</p>
//         ) : (
//           <>
//             <label className="block mt-4">Select Batch:</label>
//             <select
//               className="border p-2 rounded w-full"
//               onChange={(e) =>
//                 setSelectedBatch(e.target.value ? JSON.parse(e.target.value) : null)
//               }
//             >
//               <option value="">-- Select --</option>
//               {inventory.batches.map((batch, index) => (
//                 <option key={index} value={JSON.stringify(batch)}>
//                   {batch.batchNumber} - {batch.quantity} available
//                 </option>
//               ))}
//             </select>
//             {selectedBatch && (
//               <div className="mt-4 p-4 border rounded bg-gray-100">
//                 <p>
//                   <strong>Batch Number:</strong> {selectedBatch.batchNumber}
//                 </p>
//                 <p>
//                   <strong>Expiry Date:</strong>{" "}
//                   {new Date(selectedBatch.expiryDate).toDateString()}
//                 </p>
//                 <p>
//                   <strong>Manufacturer:</strong> {selectedBatch.manufacturer}
//                 </p>
//                 <p>
//                   <strong>Unit Price:</strong> ₹{selectedBatch.unitPrice}
//                 </p>
//                 <label className="block mt-2">Quantity:</label>
//                 <input
//                   type="number"
//                   min="1"
//                   max={selectedBatch.quantity}
//                   value={parentQuantity === 1 ? 1 : quantity}
//                   onChange={(e) => {
//                     if (parentQuantity !== 1) setQuantity(Number(e.target.value));
//                   }}
//                   className="border p-2 rounded w-full"
//                   disabled={parentQuantity === 1}
//                 />
//                 <p className="mt-2">
//                   <strong>Total Price:</strong> ₹
//                   {((parentQuantity === 1 ? 1 : quantity) * selectedBatch.unitPrice).toFixed(2)}
//                 </p>
//               </div>
//             )}
//             <button onClick={handleConfirm} className="mt-4 bg-blue-500 text-white p-2 rounded w-full">
//               Confirm Batch
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// // Initial state for Delivery.
// const initialDeliveryState = {
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "", // Delivery Number.
//   salesEmployee: "",
//   status: "Pending",
//   orderDate: "",
//   expectedDeliveryDate: "",
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemId: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0,
//       allowedQuantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstType: 0,
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       tdsAmount: 0,
//       batches: [],
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//       warehouseId: "",
//       errorMessage: "",
//       taxOption: "GST",
//       igstAmount: 0,
//       managedByBatch: true,
//     },
//   ],
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalDownPayment: 0,
//   appliedAmounts: 0,
//   totalBeforeDiscount: 0,
//   gstTotal: 0,
//   grandTotal: 0,
//   openBalance: 0,
//   fromQuote: false,
// };

// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = ("0" + (d.getMonth() + 1)).slice(-2);
//   const day = ("0" + d.getDate()).slice(-2);
//   return `${year}-${month}-${day}`;
// }

// function DeliveryFormWrapper() {
//   return (
// <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
//       <DeliveryEditPage />
//     </Suspense>
//   );
// }



//  function DeliveryEditPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");

//   const [formData, setFormData] = useState(initialDeliveryState);
//   // modalItemIndex tracks which item (by index) is selecting a batch.
//   const [modalItemIndex, setModalItemIndex] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Fetch existing Delivery data if editing.
//   useEffect(() => {
//     if (editId) {
//       axios
//         .get(`/api/delivery/${editId}`)
//         .then((res) => {
//           if (res.data.success) {
//             const record = res.data.data;
//             setFormData({
//               ...record,
//               orderDate: formatDateForInput(record.orderDate),
//               expectedDeliveryDate: formatDateForInput(record.expectedDeliveryDate),
//             });
//             console.log("Fetched Delivery Record:", record);
//           }
//         })
//         .catch((err) => {
//           console.error("Error fetching delivery for edit", err);
//           toast.error("Error fetching delivery data");
//         })
//         .finally(() => setLoading(false));
//     }
//   }, [editId]);

//   // Handler for CustomerSearch: update customer fields.
//   const handleCustomerSelect = useCallback((selectedCustomer) => {
//     setFormData((prev) => ({
//       ...prev,
//       customerCode: selectedCustomer.customerCode || "",
//       customerName: selectedCustomer.customerName || "",
//       contactPerson: selectedCustomer.contactPersonName || "",
//     }));
//   }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }, []);

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       updatedItems[index] = { ...updatedItems[index], [name]: value };
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
//           itemId: "",
//           itemName: "",
//           itemDescription: "",
//           quantity: 0,
//           allowedQuantity: 0,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,
//           gstType: 0,
//           priceAfterDiscount: 0,
//           totalAmount: 0,
//           gstAmount: 0,
//           tdsAmount: 0,
//           batches: [],
//           warehouse: "",
//           warehouseName: "",
//           warehouseCode: "",
//           warehouseId: "",
//           errorMessage: "",
//           taxOption: "GST",
//           igstAmount: 0,
//           managedByBatch: true,
//         },
//       ],
//     }));
//   }, []);

//   const openBatchModal = (index) => {
//     console.log("Opening Batch Modal for item index:", index);
//     setModalItemIndex(index);
//   };

//   // Batch update: Update allocated batch for a specific item.
//   const handleUpdateBatch = (batch, allocatedQuantity) => {
//     const currentAllocatedTotal = formData.items[modalItemIndex].batches.reduce(
//       (sum, batchItem) => sum + (batchItem.allocatedQuantity || 0),
//       0
//     );
//     const newTotal = currentAllocatedTotal + allocatedQuantity;
//     if (newTotal > formData.items[modalItemIndex].quantity) {
//       toast.error("Total allocated quantity exceeds the item quantity");
//       return;
//     }
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       if (updatedItems[modalItemIndex].quantity === 1) {
//         updatedItems[modalItemIndex].batches = [
//           {
//             batchCode: batch.batchNumber,
//             expiryDate: batch.expiryDate,
//             manufacturer: batch.manufacturer,
//             allocatedQuantity: 1,
//             availableQuantity: batch.quantity,
//           },
//         ];
//       } else {
//         const existingIndex = updatedItems[modalItemIndex].batches.findIndex(
//           (b) => b.batchCode === batch.batchNumber
//         );
//         if (existingIndex !== -1) {
//           updatedItems[modalItemIndex].batches[existingIndex].allocatedQuantity += allocatedQuantity;
//         } else {
//           updatedItems[modalItemIndex].batches.push({
//             batchCode: batch.batchNumber,
//             expiryDate: batch.expiryDate,
//             manufacturer: batch.manufacturer,
//             allocatedQuantity: allocatedQuantity,
//             availableQuantity: batch.quantity,
//           });
//         }
//       }
//       return { ...prev, items: updatedItems };
//     });
//   };

//   // Summary Calculation Effect.
//   useEffect(() => {
//     const totalBeforeDiscountCalc = formData.items.reduce((acc, item) => {
//       const unitPrice = parseFloat(item.unitPrice) || 0;
//       const discount = parseFloat(item.discount) || 0;
//       const quantity = parseFloat(item.quantity) || 1;
//       return acc + (unitPrice - discount) * quantity;
//     }, 0);

//     const totalItemsCalc = formData.items.reduce(
//       (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
//       0
//     );

//     const gstTotalCalc = formData.items.reduce((acc, item) => {
//       if (item.taxOption === "IGST") {
//         return acc + (parseFloat(item.igstAmount) || 0);
//       }
//       return acc + (parseFloat(item.gstAmount) || 0);
//     }, 0);

//     const overallFreight = parseFloat(formData.freight) || 0;
//     const roundingCalc = parseFloat(formData.rounding) || 0;
//     const totalDownPaymentCalc = parseFloat(formData.totalDownPayment) || 0;
//     const appliedAmountsCalc = parseFloat(formData.appliedAmounts) || 0;

//     const grandTotalCalc = totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
//     const openBalanceCalc = grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);

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

//   const handleSubmit = async () => {
//     try {
//       await axios.put(`/api/delivery/${editId}`, formData, {
//         headers: { "Content-Type": "application/json" },
//       });
//       toast.success("Delivery updated successfully");
//       router.push("/admin/delivery-view");
//     } catch (error) {
//       console.error("Error updating delivery:", error);
//       toast.error("Failed to update delivery");
//     }
//   };


//     useEffect(() => {
//       const storedData = sessionStorage.getItem("deliveryData");
//       if (storedData) {
//         (async () => {
//           try {
//             const parsed = JSON.parse(storedData);
//             parsed.items = await Promise.all(
//               parsed.items.map(async (item, idx) => {
//                 const itemId = item.itemId || item.item?._id || item.item || "";
//                 console.log(`Processing item[${idx}]`, itemId);
//                 const managedBy = await fetchManagedBy(itemId);
//                 return { ...item, managedBy: managedBy || "batch" };
//               })
//             );
//             setFormData(parsed);
//             setIsCopied(true);
//             sessionStorage.removeItem("salesOrderData");
//           } catch (e) {
//             console.error("Error parsing salesOrderData", e);
//           }
//         })();
//       }
//     }, []);
//   // Check for copied data from Sales Order/Delivery.
//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       const storedData = sessionStorage.getItem("deliveryData");
//       if (storedData) {
//         try {
//           const parsedData = JSON.parse(storedData);
//           setFormData(parsedData);
//           sessionStorage.removeItem("deliveryData");
//         } catch (error) {
//           console.error("Error parsing copied data:", error);
//         }
//       }
//     }
//   }, []);

//   // if (!editId) return <div className="p-8 text-red-600">Error: No Delivery ID provided.</div>;
//   if (!formData) return <div className="p-8">Loading...</div>;

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">Edit Delivery</h1>
      
//       {/* Customer Section */}
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="grid grid-cols-2 gap-7">
//         <div>
//           <label className="block mb-2 font-medium">Customer Name</label>
//              {formData.customerName ? (
//                           <input
//                             type="text"
//                             name="supplierName"
//                             value={formData.customerName}
//                             readOnly
//                             className="w-full p-2 border rounded bg-gray-100"
//                           />
//                         ) : (
//                           <CustomerSearch onSelectCustomer={handleCustomerSelect} />
//                         )}
            
//           </div>
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
//             <label className="block mb-2 font-medium">Delivery Number</label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//         {/* Additional Delivery Info */}
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
//               <option value="Pending">Pending</option>
//               <option value="Confirmed">Confirmed</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Delivery Date</label>
//             <input
//               type="date"
//               name="orderDate"
//               value={formData.orderDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Expected Delivery Date</label>
//             <input
//               type="date"
//               name="expectedDeliveryDate"
//               value={formData.expectedDeliveryDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//       </div>
      
//       {/* Items Section */}
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         {/* <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           setFormData={setFormData}
//           onremoveItemRow={onremoveItemRow}
//         /> */}

//            <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
        
//               onRemoveItem={removeItemRow}
       
//           setFormData={setFormData}
//         />
//       </div>
      
//       {/* Batch Selection Section (for items managed by batch) */}
//       <div className="mb-6">
//         <h2 className="text-xl font-semibold">Batch Selection</h2>
//         {formData.items.map((item, index) => {
//           if (!item.managedByBatch) return null;
//           return (
//             <div key={index} className="border p-2 my-2">
//               <div className="flex items-center justify-between">
//                 <span>{item.itemName || `Item ${index + 1}`}</span>
//                 <button
//                   onClick={() => {
//                     console.log("Opening Batch Modal for item index:", index);
//                     openBatchModal(index);
//                   }}
//                   className="px-3 py-1 bg-blue-500 text-white rounded"
//                 >
//                   Select Batch
//                 </button>
//               </div>
//               {item.batches && item.batches.length > 0 && (
//                 <div className="mt-2">
//                   <p className="text-sm font-medium">Allocated Batches:</p>
//                   <ul>
//                     {item.batches.map((batch, idx) => (
//                       <li key={idx} className="text-xs">
//                         {batch.batchCode}: {batch.allocatedQuantity} allocated (Available: {batch.availableQuantity})
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
      
//       {/* Remarks & Sales Employee */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Delivery Person</label>
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
//             name="totalBeforeDiscount"
//             value={
//               formData.items.reduce(
//                 (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
//                 0
//               ).toFixed(2)
//             }
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
//           <label className="block mb-2 font-medium">GST Total</label>
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
//           Update
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialDeliveryState);
//             router.push("/admin/delivery-view");
//           }}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//       </div>
      
//       {/* Render the Batch Modal if an item is selected for batch editing */}
//       {modalItemIndex !== null && (
//         <BatchModal
//           itemsbatch={formData.items[modalItemIndex]}
//           onClose={() => setModalItemIndex(null)}
//           onUpdateBatch={handleUpdateBatch}
//         />
//       )}
      
//       <ToastContainer />
//     </div>
//   );
// }

// export default DeliveryFormWrapper;



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
//         .get(`/api/sales-delivery/${editId}`)
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
//           console.error("Error fetching sales-order data for editing:", err);
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
//         await axios.put(`/api/sales-delivery/${editId}`, formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         alert("sales-delivery updated successfully");
//         router.push("/admin/sales-order-view");
//       } catch (error) {
//         console.error("Error updating GRN:", error);
//         alert("Failed to update sales-order");
//       }
//     } else {
//       try {
//         await axios.post("/api/sales-delivery", formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         alert("sales-order added successfully");
//         setFormData(initialState);
//         router.push("/admin/sales-order-view");
//       } catch (error) {
//         console.error("Error adding salesInvoice-view:", error);
//         alert("Error adding salesInvoice-view");
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
