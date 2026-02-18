// "use client";

// import { useState, useEffect, useCallback, useRef } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { Suspense } from "react";
// import SupplierSearch from "@/components/SupplierSearch";
// import ItemSection from "@/components/ItemSection";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Initial Inventory Entry state
// const initialInvState = {
//   _id: "",
//   supplierCode: "",
//   supplierName: "",
//   contactPerson: "",
//   entryNumber: "",
//   postingDate: "",
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemName: "",
//       quantity: 0,
//       unitPrice: 0,
//       totalAmount: 0,
//       errorMessage: "",
//     },
//   ],
//   remarks: "",
//   totalQuantity: 0,
//   totalValue: 0,
// };

// function formatDateForInput(dateStr) {
//   if (!dateStr) return "";
//   const d = new Date(dateStr);
//   return isNaN(d) ? "" : d.toISOString().slice(0, 10);
// }

// function InventoryEntryWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
//       <InventoryEntryForm />
//     </Suspense>
//   );
// }

// function InventoryEntryForm() {
//   const router = useRouter();
//   const search = useSearchParams();
//   const editId = search.get("editId");
//   const isEdit = Boolean(editId);
//   const parentRef = useRef(null);

//   const [data, setData] = useState(initialInvState);
//   const [summary, setSummary] = useState({ totalQuantity: 0, totalValue: 0 });

//   // Load existing entry for edit
//   useEffect(() => {
//     if (!isEdit) return;
//     axios
//       .get(`/api/inventory/${editId}`)
//       .then(res => {
//         if (res.data.success) {
//           const rec = res.data.data;
//           setData({ ...rec, postingDate: formatDateForInput(rec.postingDate) });
//         } else {
//           toast.error("Failed to load entry");
//         }
//       })
//       .catch(() => toast.error("Error loading entry"));
//   }, [editId, isEdit]);

//   // Basic input change
//   const handleInputChange = useCallback(e => {
//     const { name, value } = e.target;
//     setData(p => ({ ...p, [name]: value }));
//   }, []);

//   // Supplier select
//   const handleSupplierSelect = useCallback(s => {
//     setData(p => ({ ...p, supplierCode: s.supplierCode, supplierName: s.supplierName, contactPerson: s.contactPersonName }));
//   }, []);

//   // Compute per-item total
//   const computeItemTotal = useCallback(it => {
//     const q = Number(it.quantity) || 0;
//     const up = Number(it.unitPrice) || 0;
//     return q * up;
//   }, []);

//   // Add/remove rows
//   const addItemRow = useCallback(() => {
//     setData(p => ({ ...p, items: [...p.items, initialInvState.items[0]] }));
//   }, []);
//   const removeItemRow = useCallback(i => {
//     setData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
//   }, []);

//   // Item change
//   const handleItemChange = useCallback((i, e) => {
//     const { name, value } = e.target;
//     setData(p => {
//       const items = [...p.items];
//       items[i] = { ...items[i], [name]: name === 'quantity' || name === 'unitPrice' ? Number(value) : value };
//       items[i].totalAmount = computeItemTotal(items[i]);
//       return { ...p, items };
//     });
//   }, [computeItemTotal]);

//   // SKU select
//   const handleItemSelect = useCallback(async (i, sku) => {
//     const base = {
//       item: sku._id,
//       itemCode: sku.itemCode,
//       itemName: sku.itemName,
//       quantity: 1,
//       unitPrice: sku.unitPrice,
//     };
//     base.totalAmount = computeItemTotal(base);
//     setData(p => {
//       const items = [...p.items];
//       items[i] = { ...initialInvState.items[0], ...base };
//       return { ...p, items };
//     });
//   }, [computeItemTotal]);

//   // Recompute summary
//   useEffect(() => {
//     const tq = data.items.reduce((s, it) => s + (it.quantity || 0), 0);
//     const tv = data.items.reduce((s, it) => s + (it.totalAmount || 0), 0);
//     setSummary({ totalQuantity: tq, totalValue: tv });
//   }, [data.items]);

//   // Save
//   const handleSave = useCallback(async () => {
//     try {
//       const payload = { ...data, ...summary };
//       if (isEdit) {
//         await axios.put(`/api/inventory/${editId}`, payload);
//         toast.success("Inventory updated");
//       } else {
//         await axios.post("/api/inventory", payload);
//         toast.success("Inventory saved");
//       }
//       router.push("/admin/inventory-list");
//     } catch (err) {
//       toast.error(err.response?.data?.error || err.message);
//     }
//   }, [data, summary, isEdit, editId, router]);

//   return (
//     <div ref={parentRef} className="m-8 p-6 shadow-lg rounded-lg">
//       <h1 className="text-2xl font-bold mb-4">{isEdit ? 'Edit Inventory' : 'New Inventory Entry'}</h1>

//       {/* Supplier & Entry Info */}
//       <div className="flex flex-wrap gap-6 mb-6">
//         <div className="flex-1">
//           <label className="block mb-1 font-medium">Supplier Name</label>
//           {data.supplierName ? (
//             <input readOnly value={data.supplierName} className="w-full p-2 border bg-gray-100 rounded" />
//           ) : (
//             <SupplierSearch onSelectSupplier={handleSupplierSelect} />
//           )}
//         </div>
//         <div className="flex-1">
//           <label className="block mb-1 font-medium">Entry Number</label>
//           <input name="entryNumber" value={data.entryNumber} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//         <div className="flex-1">
//           <label className="block mb-1 font-medium">Posting Date</label>
//           <input type="date" name="postingDate" value={formatDateForInput(data.postingDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//       </div>

//       {/* Items Section */}
//       <h2 className="text-xl font-semibold mb-3">Items</h2>
//       <div className="border rounded p-4 mb-6">
//         <ItemSection
//           items={data.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           onItemSelect={handleItemSelect}
//           onRemoveItem={removeItemRow}
//         />
//       </div>

//       {/* Summary & Remarks */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//         <div>
//           <label className="block mb-1 font-medium">Total Quantity</label>
//           <input readOnly value={summary.totalQuantity} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">Total Value</label>
//           <input readOnly value={summary.totalValue} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//       </div>
//       <div className="mb-6">
//         <label className="block mb-1 font-medium">Remarks</label>
//         <textarea name="remarks" value={data.remarks} onChange={handleInputChange} className="w-full p-2 border rounded" />
//       </div>

//       {/* Actions */}
//       <div className="flex gap-4">
//         <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{isEdit ? 'Update' : 'Save'}</button>
//         <button onClick={() => setData(initialInvState) || toast.info('Cleared')} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Clear</button>
//       </div>

//       <ToastContainer />
//     </div>
//   );
// }

// export default InventoryEntryWrapper;


// "use client";

// import React, { useState, useEffect, useCallback } from "react";
// import axios from "axios";
// import MultiBatchModal from "@/components/MultiBatchModalbtach";
// import ItemSection from "@/components/ItemSection";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// export default function InventoryEntryWrapper() {
//   const [rows, setRows] = useState([]);
//   const [docNo, setDocNo] = useState("");
//   const [docDate, setDocDate] = useState("");
//   const [warehouseOptions, setWarehouseOptions] = useState([]);
//   const [sourceWarehouse, setSourceWarehouse] = useState("");
//   const [batchModalIndex, setBatchModalIndex] = useState(null);
//   const [batchOptions, setBatchOptions] = useState([]);

//   useEffect(() => {
//     axios.get("/api/warehouse").then((r) => setWarehouseOptions(r.data));

//     const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
//     setDocNo(`ST-${today}`);
//     setDocDate(new Date().toISOString().slice(0, 10));

//     axios.get("/api/items").then((res) => {
//       const items = res.data || [];
//       const processed = items.map((item) => ({
//         ...item,
//         uom: item.unitQty > 1 ? `x${item.unitQty}` : "pcs",
//         qty: item.quantity,
//         batches: [],
//         batchNumber: "",
//         sourceWarehouse: sourceWarehouse,
//         destination: "",
//       }));
//       setRows(processed);
//     });
//   }, [sourceWarehouse]);

//   useEffect(() => {
//     if (batchModalIndex == null) return;
//     const row = rows[batchModalIndex];
//     if (!row?.itemId || !row?.sourceWarehouse) return;

//     axios
//       .get(`/api/inventory-batch/${row.itemId}/${row.sourceWarehouse}`)
//       .then((r) => setBatchOptions(r.data.batches || []))
//       .catch(() => setBatchOptions([]));
//   }, [batchModalIndex, rows]);

//   const openBatchModal = useCallback((idx) => setBatchModalIndex(idx), []);
//   const closeBatchModal = useCallback(() => setBatchModalIndex(null), []);

//   const handleUpdateBatch = (updatedBatch) => {
//     if (batchModalIndex == null || !rows[batchModalIndex]) return;
//     setRows((prev) => {
//       const updated = [...prev];
//       updated[batchModalIndex] = {
//         ...updated[batchModalIndex],
//         batches: updatedBatch,
//         batchNumber: updatedBatch.map((b) => b.batchNumber).join(", "),
//       };
//       return updated;
//     });
//     closeBatchModal();
//   };

//   const handleQtyChange = (index, newQty) => {
//     const updated = [...rows];
//     updated[index].qty = parseFloat(newQty) || 0;
//     setRows(updated);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const dataToSend = [];

//     for (const row of rows) {
//       if (!row.sourceWarehouse || !row.destination) {
//         toast.error(`Source and destination warehouse are required for item ${row.itemCode}`);
//         return;
//       }

//       if (row.managedByBatch) {
//         if (!row.batches?.length) {
//           toast.error(`Please select batches for item ${row.itemCode}`);
//           return;
//         }
//         for (const batch of row.batches) {
//           if (!batch.batchNumber || !batch.quantity || batch.quantity <= 0) {
//             toast.error(`Invalid batch data for ${row.itemCode}`);
//             return;
//           }
//           dataToSend.push({
//             itemId: row.itemId,
//             sourceWarehouse: row.sourceWarehouse,
//             destinationWarehouse: row.destination,
//             batchNumber: batch.batchNumber,
//             quantity: batch.quantity,
//             expiryDate: batch.expiryDate || null,
//             manufacturer: batch.manufacturer || null,
//             unitPrice: batch.unitPrice || null,
//           });
//         }
//       } else {
//         if (!row.qty || row.qty <= 0) {
//           toast.error(`Invalid quantity for item ${row.itemCode}`);
//           return;
//         }
//         dataToSend.push({
//           itemId: row.itemId,
//           sourceWarehouse: row.sourceWarehouse,
//           destinationWarehouse: row.destination,
//           quantity: row.qty,
//           batchNumber: null,
//           expiryDate: null,
//           manufacturer: null,
//           unitPrice: null,
//         });
//       }
//     }

//     try {
//       await axios.post("/api/stock-transfer", dataToSend);
//       toast.success("Stock transfer successful");
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to transfer stock");
//     }
//   };

//   const handleItemChange = (updatedItems) => setRows(updatedItems);
//   const addItemRow = () => setRows([...rows, {}]);
//   const handleItemSelect = () => {};
//   const removeItemRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

//   return (
//     <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded">
//       <ToastContainer />
//       <h1 className="text-2xl font-semibold mb-6">Inventory Entry</h1>
//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div className="grid grid-cols-3 gap-4">
//           <div>
//             <label>Document No</label>
//             <input readOnly value={docNo} className="w-full border p-2 bg-gray-100 rounded" />
//           </div>
//           <div>
//             <label>Date</label>
//             <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//           <div>
//             <label>Source Warehouse</label>
//             <select value={sourceWarehouse} onChange={(e) => setSourceWarehouse(e.target.value)} required className="w-full border p-2 rounded">
//               <option value="">-- select --</option>
//               {warehouseOptions.map((w) => (
//                 <option key={w._id} value={w._id}>{w.warehouseName}</option>
//               ))}
//             </select>
//           </div>
//         </div>

//         {/* Items Section */}
//         <h2 className="text-xl font-semibold mb-3">Items</h2>
//         <div className="border rounded p-4 mb-6">
//           <ItemSection
//             items={rows}
//             onItemChange={handleItemChange}
//             onAddItem={addItemRow}
//             onItemSelect={handleItemSelect}
//             onRemoveItem={removeItemRow}
//           />
//         </div>

//         <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
//           Submit Transfer
//         </button>
//       </form>

//       {batchModalIndex != null && rows[batchModalIndex] && (
//         <MultiBatchModal
//           itemsbatch={rows[batchModalIndex]}
//           batchOptions={batchOptions}
//           onClose={closeBatchModal}
//           onUpdateBatch={handleUpdateBatch}
//         />
//       )}
//     </div>
//   );
// }










"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Suspense } from "react";
import SupplierSearch from "@/components/SupplierSearch";
import ItemSection from "@/components/ItemSection";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Initial Inventory state
const initialInvState = {
  _id: "",
  supplierCode: "",
  supplierName: "",
  contactPerson: "",
  entryNumber: "",
  postingDate: "",
  items: [
    {
      item: "",
      itemCode: "",
      itemName: "",
      quantity: 0,
      unitPrice: 0,
      totalAmount: 0,
      managedBy: "",
      batches: [],
      errorMessage: "",
    },
  ],
  remarks: "",
  totalQuantity: 0,
  totalValue: 0,
};

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}

function InventoryEntryWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
      <InventoryEntryForm />
    </Suspense>
  );
}

function InventoryEntryForm() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("editId");
  const isEdit = Boolean(editId);
  const parentRef = useRef(null);

  const [data, setData] = useState(initialInvState);
  const [summary, setSummary] = useState({ totalQuantity: 0, totalValue: 0 });
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);
  const [stockEntryType, setStockEntryType] = useState("");


  // Load existing entry
  useEffect(() => {
    if (!isEdit) return;
    axios
      .get(`/api/inventory/${editId}`)
      .then(res => {
        if (res.data.success) {
          const rec = res.data.data;
          setData({
            ...rec,
            postingDate: formatDateForInput(rec.postingDate)
          });
        } else {
          toast.error("Failed to load entry");
        }
      })
      .catch(() => toast.error("Error loading entry"));
  }, [editId, isEdit]);

  // Input handler
  const handleInputChange = useCallback(e => {
    const { name, value } = e.target;
    setData(p => ({ ...p, [name]: value }));
  }, []);

  // Supplier select
  const handleSupplierSelect = useCallback(s => {
    setData(p => ({ ...p,
      supplierCode: s.supplierCode,
      supplierName: s.supplierName,
      contactPerson: s.contactPersonName
    }));
  }, []);

  // Compute per-item total
  const computeItemTotal = useCallback(it => {
    return (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
  }, []);

  // Add/remove rows
  const addItemRow = useCallback(() => {
    setData(p => ({ ...p, items: [...p.items, initialInvState.items[0]] }));
  }, []);
  const removeItemRow = useCallback(i => {
    setData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  }, []);

  // Item change
  const handleItemChange = useCallback((i, e) => {
    const { name, value } = e.target;
    setData(p => {
      const items = [...p.items];
      items[i] = {
        ...items[i],
        [name]: name === 'quantity' || name === 'unitPrice' ? Number(value) : value
      };
      items[i].totalAmount = computeItemTotal(items[i]);
      return { ...p, items };
    });
  }, [computeItemTotal]);

  // SKU select
  const handleItemSelect = useCallback(async (i, sku) => {
    let mb = sku.managedBy || '';
    if (!mb) {
      try {
        const res = await axios.get(`/api/items/${sku._id}`);
        mb = res.data.success ? res.data.data.managedBy : '';
      } catch {}
    }
    const base = {
      item: sku._id,
      itemCode: sku.itemCode,
      itemName: sku.itemName,
      quantity: 1,
      unitPrice: sku.unitPrice,
      managedBy: mb,
      batches: []
    };
    base.totalAmount = computeItemTotal(base);
    setData(p => {
      const items = [...p.items];
      items[i] = { ...initialInvState.items[0], ...base };
      return { ...p, items };
    });
  }, [computeItemTotal]);

  // Batch flow
  const openBatchModal = useCallback(index => {
    setSelectedBatchItemIndex(index);
    setShowBatchModal(true);
  }, []);
  const closeBatchModal = useCallback(() => {
    setShowBatchModal(false);
    setSelectedBatchItemIndex(null);
  }, []);
  const handleBatchChange = useCallback((itemIndex, batchIndex, field, value) => {
    setData(p => {
      const items = [...p.items];
      const cur = { ...items[itemIndex] };
      const batches = [...(cur.batches || [])];
      batches[batchIndex] = { ...batches[batchIndex], [field]: value };
      cur.batches = batches;
      items[itemIndex] = cur;
      return { ...p, items };
    });
  }, []);
  const addBatchEntry = useCallback(() => {
    setData(p => {
      const items = [...p.items];
      const idx = selectedBatchItemIndex;
      const cur = { ...items[idx] };
      cur.batches = cur.batches || [];
      cur.batches.push({ batchNumber: '', expiryDate: '', manufacturer: '', batchQuantity: 0 });
      items[idx] = cur;
      return { ...p, items };
    });
  }, [selectedBatchItemIndex]);

  // Recompute summary
  useEffect(() => {
    const tq = data.items.reduce((s, it) => s + (it.quantity || 0), 0);
    const tv = data.items.reduce((s, it) => s + (it.totalAmount || 0), 0);
    setSummary({ totalQuantity: tq, totalValue: tv });
  }, [data.items]);

  // Save
  const handleSave = useCallback(async () => {
    try {
      const payload = { ...data, ...summary };
      if (isEdit) {
        await axios.put(`/api/inventory/${editId}`, payload);
        toast.success('Inventory updated');
      } else {
        await axios.post('/api/inventory', payload);
        toast.success('Inventory saved');
      }
      router.push('/admin/inventory-list');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  }, [data, summary, isEdit, editId, router]);

  return (
    <div ref={parentRef} className="m-8 p-6 shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold mb-4">{isEdit ? 'Edit' : 'New'} Inventory Entry</h1>

      {/* Supplier & Info */}
      <div className="flex flex-wrap gap-6 mb-6">
        {/* <div className="flex-1">
          <label className="block mb-1 font-medium">Supplier</label>
          {data.supplierName ? (
            <input readOnly value={data.supplierName} className="w-full p-2 border bg-gray-100 rounded" />
          ) : (
            <SupplierSearch onSelectSupplier={handleSupplierSelect} />
          )}
        </div> */}

          {/* Stock Entry Type */}
  <div className="flex-1">
    <label className="block mb-1 font-medium">Stock Entry Type</label>
    <select
      value={stockEntryType}
      onChange={(e) => setStockEntryType(e.target.value)}
      className="w-full p-2 border rounded"
    >
      <option value="">Select Entry Type</option>
      <option value="purchase">Purchase</option>
      <option value="production">Production</option>
      <option value="opening">Opening</option>
      <option value="return">Return</option>
    </select>
  </div>
        <div className="flex-1">
          <label className="block mb-1 font-medium">Entry Number</label>
          <input
            name="entryNumber"
            value={data.entryNumber}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1 font-medium">Posting Date</label>
          <input
            type="date"
            name="postingDate"
            value={formatDateForInput(data.postingDate)}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {/* Items Section */}
      <h2 className="text-xl font-semibold mb-3">Items</h2>
      <div className="border rounded p-4 mb-6">
        <ItemSection
          items={data.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          onItemSelect={handleItemSelect}
          onRemoveItem={removeItemRow}
        />
      </div>

      {/* Batch Buttons */}
      <div className="mb-6">
        {data.items.map((it, idx) =>
          it.managedBy.toLowerCase() === 'batch' ? (
            <div key={idx} className="flex justify-between items-center border p-2 rounded mb-2">
              <span>
                {it.itemCode} - {it.itemName}
              </span>
              <button
                onClick={() => openBatchModal(idx)}
                className="px-3 py-1 bg-green-600 text-white rounded"
              >
                Batch Details
              </button>
            </div>
          ) : null
        )}
      </div>

      {/* Batch Modal */}
      {showBatchModal && selectedBatchItemIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">
              Batch for {data.items[selectedBatchItemIndex].itemName}
            </h3>
            <table className="w-full mb-4 table-auto border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-1">Batch#</th>
                  <th className="border p-1">Expiry</th>
                  <th className="border p-1">Manufacturer</th>
                  <th className="border p-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {data.items[selectedBatchItemIndex].batches.map((batch, bidx) => (
                  <tr key={bidx}>
                    <td className="border p-1">
                      <input
                        value={batch.batchNumber}
                        onChange={e => handleBatchChange(selectedBatchItemIndex, bidx, 'batchNumber', e.target.value)}
                        className="w-full p-1 border rounded"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="date"
                        value={batch.expiryDate}
                        onChange={e => handleBatchChange(selectedBatchItemIndex, bidx, 'expiryDate', e.target.value)}
                        className="w-full p-1 border rounded"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        value={batch.manufacturer}
                        onChange={e => handleBatchChange(selectedBatchItemIndex, bidx, 'manufacturer', e.target.value)}
                        className="w-full p-1 border rounded"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="number"
                        value={batch.batchQuantity}
                        onChange={e => handleBatchChange(selectedBatchItemIndex, bidx, 'batchQuantity', e.target.value)}
                        className="w-full p-1 border rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={addBatchEntry}
              className="px-4 py-2 bg-green-500 text-white rounded mb-4"
            >
              Add Batch Entry
            </button>
            <div className="flex justify-end">
              <button
                onClick={closeBatchModal}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary & Remarks */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block mb-1 font-medium">Total Quantity</label>
          <input
            readOnly
            value={summary.totalQuantity}
            className="w-full p-2 border bg-gray-100 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Total Value</label>
          <input
            readOnly
            value={summary.totalValue}
            className="w-full p-2 border bg-gray-100 rounded"
          />
        </div>
      </div>
      <div className="mb-6">
        <label className="block mb-1 font-medium">Remarks</label>
        <textarea
          name="remarks"
          value={data.remarks}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isEdit ? 'Update' : 'Save'}
        </button>
        <button
          onClick={() => setData(initialInvState) || toast.info('Cleared')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear
        </button>
      </div>

      <ToastContainer />
    </div>
  );
}

export default InventoryEntryWrapper;
