"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Suspense } from "react";
import SupplierSearch from "@/components/SupplierSearch";
import ItemSection from "@/components/ItemSection";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import supplier from "../../supplier/page";

// Initial GRN state
const initialGRNState = {
  supplier: "",
  supplierCode: "",
  supplierName: "",
  contactPerson: "",
  refNumber: "",
  status: "Received",
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
      allowedQuantity: 0,
      receivedQuantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstRate: 0,
      igstRate: 0,
      cgstRate: 0,
      sgstRate: 0,
      taxOption: "GST",
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      managedBy: "",
      batches: [],
      errorMessage: "",
      qualityCheckDetails: [],
      warehouse: "",
      warehouseCode: "",
      warehouseName: "",
      stockAdded: false,
    },
  ],
  // qualityCheckDetails: [],
  salesEmployee: "",
  remarks: "",
  freight: 0,
  rounding: 0,
  totalBeforeDiscount: 0,
  gstTotal: 0,
  grandTotal: 0,
  purchaseOrderId: "",
};

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const m = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(dateStr);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}



function GRNFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <GRNForm />
    </Suspense>
  );
}




 function GRNForm() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("editId");
  const isEdit = Boolean(editId);

  // ← Make sure you declare this!
  const parentRef = useRef(null);

  const [grnData, setGrnData] = useState(initialGRNState);
  const [summary, setSummary] = useState({
    totalBeforeDiscount: 0,
    gstTotal: 0,
    grandTotal: 0,
  });
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);




 const poJSON = sessionStorage.getItem("purchaseOrderData");
if (poJSON) {
  const po = JSON.parse(poJSON);
  setGrnData(prev => ({
    ...prev,
    ...po,
    purchaseOrderId: po._id, // ✅ ensure this is set
  }));
  sessionStorage.removeItem("purchaseOrderData");
  toast.info("Loaded PO into GRN");
}

  // Load existing GRN when editing
  useEffect(() => {
    if (!isEdit) return;
    axios
      .get(`/api/grn/${editId}`)
      .then((res) => {
        if (res.data.success) {
          const rec = res.data.data;
          setGrnData({
            ...rec,
            postingDate: formatDateForInput(rec.postingDate),
            validUntil: formatDateForInput(rec.validUntil),
            documentDate: formatDateForInput(rec.documentDate),
          });
        } else {
          toast.error("Failed to load GRN for editing");
        }
      })
      .catch(() => toast.error("Error loading GRN"));
  }, [editId, isEdit]);

  // Basic input handler
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setGrnData((p) => ({ ...p, [name]: value }));
  }, []);

  // Supplier select
  const handleSupplierSelect = useCallback((s) => {
    setGrnData((p) => ({
      ...p,
      supplier:      s._id, 
      supplierCode: s.supplierCode,
      supplierName: s.supplierName,
      contactPerson: s.contactPersonName,
    }));
  }, []);

  // Compute per-item
  const computeItemValues = useCallback((it) => {
    const q = Number(it.quantity) || 0;
    const up = Number(it.unitPrice) || 0;
    const dis = Number(it.discount) || 0;
    const fr = Number(it.freight) || 0;
    const net = up - dis;
    const tot = net * q + fr;
    if (it.taxOption === "GST") {
      const rate = Number(it.gstRate) || 0;
      const half = rate / 2;
      const cg = (tot * half) / 100;
      const sg = cg;
      return {
        priceAfterDiscount: net,
        totalAmount: tot,
        cgstAmount: cg,
        sgstAmount: sg,
        gstAmount: cg + sg,
        igstAmount: 0,
      };
    }
    const rate = Number(it.igstRate || it.gstRate) || 0;
    const ig = (tot * rate) / 100;
    return {
      priceAfterDiscount: net,
      totalAmount: tot,
      cgstAmount: 0,
      sgstAmount: 0,
      gstAmount: 0,
      igstAmount: ig,
    };
  }, []);

  // Add/remove rows
  const addItemRow = useCallback(() => {
    setGrnData((p) => ({ ...p, items: [...p.items, initialGRNState.items[0]] }));
  }, []);
  const removeItemRow = useCallback((i) => {
    setGrnData((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  }, []);

  // Item change
  const handleItemChange = useCallback(
    (i, e) => {
      const { name, value } = e.target;
      setGrnData((p) => {
        const items = [...p.items];
        items[i] = {
          ...items[i],
          [name]: ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate"].includes(name)
            ? Number(value) || 0
            : value,
        };
        items[i] = { ...items[i], ...computeItemValues(items[i]) };
        return { ...p, items };
      });
    },
    [computeItemValues]
  );

  // SKU select
  const handleItemSelect = useCallback(
    async (i, sku) => {
      let mb = sku.managedBy || "";
      if (!mb) {
        try {
          const res = await axios.get(`/api/items/${sku._id}`);
          mb = res.data.success ? res.data.data.managedBy : "";
        } catch {}
      }
      const base = {
        item: sku._id,
        itemCode: sku.itemCode,
        itemName: sku.itemName,
        itemDescription: sku.description || "",
        quantity: 1,
        unitPrice: sku.unitPrice,
        discount: sku.discount || 0,
        freight: sku.freight || 0,
        gstRate: sku.gstRate || 0,
        igstRate: sku.igstRate || 0,
        taxOption: sku.taxOption || "GST",
        managedBy: mb,
      };
      setGrnData((p) => {
        const items = [...p.items];
        items[i] = { ...initialGRNState.items[0], ...base, ...computeItemValues(base) };
        return { ...p, items };
      });
    },
    [computeItemValues]
  );

  // Batch modal handlers.
  const openBatchModal = useCallback((itemIndex) => {
    setSelectedBatchItemIndex(itemIndex);
    setShowBatchModal(true);
  }, []);

  const closeBatchModal = useCallback(() => {
    setShowBatchModal(false);
    setSelectedBatchItemIndex(null);
  }, []);

  const handleBatchEntryChange = useCallback((itemIndex, batchIndex, field, value) => {
    setGrnData((prev) => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[itemIndex] };
      if (!currentItem.batches) currentItem.batches = [];
      const updatedBatches = [...currentItem.batches];
      updatedBatches[batchIndex] = {
        ...updatedBatches[batchIndex],
        [field]: value,
      };
      currentItem.batches = updatedBatches;
      updatedItems[itemIndex] = currentItem;
      return { ...prev, items: updatedItems };
    });
  }, []);

  const addBatchEntry = useCallback(() => {
    setGrnData((prev) => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[selectedBatchItemIndex] };
      if (!currentItem.batches) currentItem.batches = [];
      const lastEntry = currentItem.batches[currentItem.batches.length - 1];
      if (
        lastEntry &&
        lastEntry.batchNumber === "" &&
        lastEntry.expiryDate === "" &&
        lastEntry.manufacturer === "" &&
        lastEntry.batchQuantity === 0
      ) {
        return { ...prev, items: updatedItems };
      }
      currentItem.batches.push({
        batchNumber: "",
        expiryDate: "",
        manufacturer: "",
        batchQuantity: 0,
      });
      updatedItems[selectedBatchItemIndex] = currentItem;
      return { ...prev, items: updatedItems };
    });
  }, [selectedBatchItemIndex]);


  // Recompute summary
  useEffect(() => {
    const tb = grnData.items.reduce((s, it) => s + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
    const gstT = grnData.items.reduce(
      (s, it) => s + (it.taxOption === "IGST" ? it.igstAmount : it.gstAmount),
      0
    );
    const gr = tb + gstT + Number(grnData.freight) + Number(grnData.rounding);
    setSummary({ totalBeforeDiscount: tb, gstTotal: gstT, grandTotal: gr });
  }, [grnData.items, grnData.freight, grnData.rounding]);

  // // Save or update
  // const handleSaveGRN = useCallback(async () => {
  //   try {
  //     const payload = { ...grnData, ...summary };
  //     if (isEdit) {
  //       await axios.put(`/api/grn/${editId}`, payload);
  //       toast.success("GRN updated");
  //     } else {
  //       await axios.post("/api/grn", payload);
  //       toast.success("GRN saved");
  //     }
  //     router.push("/admin/grn-view");
  //   } catch (err) {
  //     toast.error(err.response?.data?.error || err.message);
  //   }
  // }, [grnData, summary, isEdit, editId, router]);

  // // Copy to PO
  // const handleCopyToPO = useCallback(() => {
  //   sessionStorage.setItem("purchaseOrderData", JSON.stringify(grnData));
  //   router.push("/admin/grn-view/new");
  // }, [grnData, router]);


// ⬇️  REPLACE the existing handleSaveGRN definition with this one
// const handleSaveGRN = useCallback(async () => {
//   try {
//     /** -----------------------------------------------------------------
//      * 1) Ensure each GRN line carries the quantity that was just received.
//      *    (Back-end models often don’t default this, so do it explicitly.)
//      * ----------------------------------------------------------------*/
//     const itemsWithReceived = grnData.items.map(it => ({
//       ...it,
//       receivedQuantity: it.receivedQuantity || it.quantity || 0,
//     }));

//     const payload = { ...grnData, items: itemsWithReceived, ...summary, ...(purchaseOrderId ? { purchaseOrderId } : {}),  };
//     let response;

//     // ------------------------------------------------------------------
//     // 2) Create vs. update the GRN itself
//     // ------------------------------------------------------------------
//     if (isEdit) {
//       response = await axios.put(`/api/grn/${editId}`, payload);
//     } else {
//       response = await axios.post("/api/grn", payload);
//     }

//     const savedGRN = response.data.data;

//     /** -----------------------------------------------------------------
//      * 3) If the GRN was linked to a PO, synchronise that PO’s
//      *    receivedQuantity and status in one go.
//      * ----------------------------------------------------------------*/
//     if (savedGRN.purchaseOrderId) {
//       try {
//         // Fetch current PO
//         const { data: poRes } = await axios.get(
//           `/api/purchase-order/${savedGRN.purchaseOrderId}`,
//         );
//         const po = poRes.data;

//         // Map of new received quantities from *this* GRN
//         const grnMap = new Map();
//         savedGRN.items.forEach(({ itemCode, receivedQuantity, quantity }) => {
//           grnMap.set(itemCode, receivedQuantity || quantity || 0);
//         });

//         // Map of previous received quantities if we’re editing
//         let prevGrnMap = new Map();
//         if (isEdit) {
//           const { data: oldGrnRes } = await axios.get(`/api/grn/${editId}`);
//           oldGrnRes.data.items.forEach(({ itemCode, receivedQuantity, quantity }) => {
//             prevGrnMap.set(itemCode, receivedQuantity || quantity || 0);
//           });
//         }

//         // Merge into PO lines
//         const updatedItems = po.items.map(poItem => {
//           const newQty = grnMap.get(poItem.itemCode) || 0;
//           const prevQty = prevGrnMap.get(poItem.itemCode) || 0;
//           const diff = newQty - prevQty; // add or subtract delta

//           return {
//             ...poItem,
//             receivedQuantity: (poItem.receivedQuantity || 0) + diff,
//           };
//         });

//         // Determine new PO status
//         const statusAllReceived = updatedItems.every(
//           ({ receivedQuantity, orderedQuantity }) =>
//             receivedQuantity >= orderedQuantity,
//         );
//         const statusAnyReceived = updatedItems.some(
//           ({ receivedQuantity }) => receivedQuantity > 0,
//         );

//         const newStatus = statusAllReceived
//           ? "Completed"
//           : statusAnyReceived
//           ? "PartiallyReceived"
//           : "Open";

//         // Push update to PO
//         await axios.put(`/api/purchase-order/${savedGRN.purchaseOrderId}`, {
//           items: updatedItems,
//           orderStatus: newStatus,
//         });
//       } catch (err) {
//         console.error("Failed to update PO:", err);
//         toast.error("GRN saved, but updating the linked Purchase Order failed");
//       }
//     }

//     toast.success(isEdit ? "GRN updated" : "GRN saved");
//     router.push("/admin/grn-view");
//   } catch (err) {
//     toast.error(err.response?.data?.error || err.message);
//   }
// }, [grnData, summary, isEdit, editId, router]);


const handleSaveGRN = useCallback(async () => {
  try {
    const itemsWithReceived = grnData.items.map(it => ({
      ...it,
      receivedQuantity: it.receivedQuantity || it.quantity || 0,
    }));

    // Destructure to extract purchaseOrderId separately
    const { purchaseOrderId, ...restData } = grnData;

    // Only include purchaseOrderId in payload if it's valid (non-empty string)
    const payload = {
      ...restData,
      items: itemsWithReceived,
      ...summary,
      ...(purchaseOrderId ? { purchaseOrderId } : {}), // ✅ Conditionally include
    };

    let response;

    if (isEdit) {
      response = await axios.put(`/api/grn/${editId}`, payload);
    } else {
      response = await axios.post("/api/grn", payload);
    }

   const savedGRN = response.data?.data || response.data;

    /** Handle PO sync if purchaseOrderId is valid */
    if (savedGRN?.purchaseOrderId) {
      try {
        const { data: poRes } = await axios.get(
          `/api/purchase-order/${savedGRN.purchaseOrderId}`,
        );
        const po = poRes.data;

        const grnMap = new Map();
        savedGRN.items.forEach(({ itemCode, receivedQuantity, quantity }) => {
          grnMap.set(itemCode, receivedQuantity || quantity || 0);
        });

        let prevGrnMap = new Map();
        if (isEdit) {
          const { data: oldGrnRes } = await axios.get(`/api/grn/${editId}`);
          oldGrnRes.data.items.forEach(({ itemCode, receivedQuantity, quantity }) => {
            prevGrnMap.set(itemCode, receivedQuantity || quantity || 0);
          });
        }

        const updatedItems = po.items.map(poItem => {
          const newQty = grnMap.get(poItem.itemCode) || 0;
          const prevQty = prevGrnMap.get(poItem.itemCode) || 0;
          const diff = newQty - prevQty;

          return {
            ...poItem,
            receivedQuantity: (poItem.receivedQuantity || 0) + diff,
          };
        });

        const statusAllReceived = updatedItems.every(
          ({ receivedQuantity, orderedQuantity }) =>
            receivedQuantity >= orderedQuantity,
        );
        const statusAnyReceived = updatedItems.some(
          ({ receivedQuantity }) => receivedQuantity > 0,
        );

        const newStatus = statusAllReceived
          ? "Completed"
          : statusAnyReceived
          ? "PartiallyReceived"
          : "Open";

        await axios.put(`/api/purchase-order/${savedGRN.purchaseOrderId}`, {
          items: updatedItems,
          orderStatus: newStatus,
        });
      } catch (err) {
        console.error("Failed to update PO:", err);
        toast.error("GRN saved, but updating the linked Purchase Order failed");
      }
    }

    toast.success(isEdit ? "GRN updated" : "GRN saved");
    router.push("/admin/grn-view");
  } catch (err) {
    toast.error(err.response?.data?.error || err.message);
  }
}, [grnData, summary, isEdit, editId, router]);



 

  return (
    <div ref={parentRef} className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">{isEdit ? "Edit GRN" : "GRN Form"}</h1>

      {/* Supplier & Doc Details */}
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        {/* Left column */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Supplier Code</label>
            <input
              readOnly
              value={grnData.supplierCode}
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Supplier Name</label>
            {grnData.supplierName ? (
              <input
                readOnly
                value={grnData.supplierName}
                className="w-full p-2 border rounded bg-gray-100"
              />
            ) : (
              <SupplierSearch onSelectSupplier={handleSupplierSelect} />
            )}
          </div>
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input
              readOnly
              value={grnData.contactPerson}
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Reference Number</label>
            <input
              name="refNumber"
              value={grnData.refNumber}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        {/* Right column */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              name="status"
              value={grnData.status}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="Received">Received</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input
              type="date"
              name="postingDate"
              value={formatDateForInput(grnData.postingDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Valid Until</label>
            <input
              type="date"
              name="validUntil"
              value={formatDateForInput(grnData.validUntil)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Document Date</label>
            <input
              type="date"
              name="documentDate"
              value={formatDateForInput(grnData.documentDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection
          items={grnData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          onItemSelect={handleItemSelect}
          onRemoveItem={removeItemRow}
        />
      </div>


           <div className="mb-8">
        {grnData.items.map((item, index) =>
          item.item &&
          item.managedBy &&
          item.managedBy.trim().toLowerCase() === "batch" ? (
            <div key={index} className="flex items-center justify-between border p-3 rounded mb-2">
              <div>
                <strong>{item.itemCode} - {item.itemName}</strong>
                <span className="ml-2 text-sm text-gray-600">(Unit Price: {item.unitPrice})</span>
              </div>
              <button type="button" onClick={() => openBatchModal(index)} className="px-3 py-1 bg-green-500 text-white rounded">
                Set Batch Details
              </button>
            </div>
          ) : null
        )}
      </div>
      {/* Batch Modal */}
      {showBatchModal && selectedBatchItemIndex !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full">
            <h2 className="text-xl font-semibold mb-2">
              Batch Details for {grnData.items[selectedBatchItemIndex].itemCode} - {grnData.items[selectedBatchItemIndex].itemName}
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Unit Price: {grnData.items[selectedBatchItemIndex].unitPrice}
            </p>
            {grnData.items[selectedBatchItemIndex].batches.length > 0 ? (
              <table className="w-full table-auto border-collapse mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2">Batch Number</th>
                    <th className="border p-2">Expiry Date</th>
                    <th className="border p-2">Manufacturer</th>
                    <th className="border p-2">Batch Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {grnData.items[selectedBatchItemIndex].batches.map((batch, batchIdx) => (
                    <tr key={batchIdx}>
                      <td className="border p-2">
                        <input
                          type="text"
                          value={batch.batchNumber || ""}
                          onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, batchIdx, "batchNumber", e.target.value)}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="date"
                          value={batch.expiryDate || ""}
                          onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, batchIdx, "expiryDate", e.target.value)}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          value={batch.manufacturer || ""}
                          onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, batchIdx, "manufacturer", e.target.value)}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={batch.batchQuantity || 0}
                          onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, batchIdx, "batchQuantity", e.target.value)}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mb-4">No batch entries yet.</p>
            )}
            <button type="button" onClick={addBatchEntry} className="px-4 py-2 bg-green-500 text-white rounded mb-4">
              Add Batch Entry
            </button>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeBatchModal} className="px-4 py-2 bg-blue-500 text-white rounded">
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Freight & Rounding */}
      <div className="grid md:grid-cols-2 gap-6 mt-6 mb-6">
        <div>
          <label className="block mb-1 font-medium">Freight</label>
          <input
            name="freight"
            type="number"
            value={grnData.freight}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Rounding</label>
          <input
            name="rounding"
            type="number"
            value={grnData.rounding}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block mb-1 font-medium">Total Before Discount</label>
          <input
            readOnly
            value={summary.totalBeforeDiscount}
            className="w-full p-2 border bg-gray-100 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">GST Total</label>
          <input
            readOnly
            value={summary.gstTotal}
            className="w-full p-2 border bg-gray-100 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Grand Total</label>
          <input
            readOnly
            value={summary.grandTotal}
            className="w-full p-2 border bg-gray-100 rounded"
          />
        </div>
      </div>

      {/* Sales Employee & Remarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Sales Employee</label>
          <input
            name="salesEmployee"
            value={grnData.salesEmployee}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Remarks</label>
          <textarea
            name="remarks"
            value={grnData.remarks}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSaveGRN}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          {isEdit ? "Update GRN" : "Save GRN"}
        </button>
        <button
          onClick={() => setGrnData(initialGRNState) || toast.info("GRN cleared")}
          className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        {/* <button
          onClick={handleCopyToPO}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Copy To PO
        </button> */}
      </div>

      <ToastContainer />
    </div>
  );
}



export default GRNFormWrapper