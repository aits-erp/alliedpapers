"use client";

// ===============================
// PurchaseInvoiceForm Component
// ===============================
// This component is used for creating / editing purchase invoices. It can also
// **copy** data from a Purchase Order (PO) or a Goods Receipt Note (GRN) and
// convert that data into an invoice.  The file is intentionally verbose with
// inline comments to make complex logic easier to follow.
// -----------------------------------------------------------------------------
// Key sections ↓
//  1.  Imports & helpers
//  2.  React state & data‑loading side‑effects
//  3.  Item‑list handlers  (add / remove / select / barcode scan)
//  4.  Batch‑modal handlers (for batch‑managed items)
//  5.  Summary calculation effect
//  6.  Copy‑from‑PO / Copy‑from‑GRN effects
//  7.  Save / Cancel / Copy‑to‑PO actions
//  8.  JSX (form layout)
// -----------------------------------------------------------------------------

import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useRouter, useParams } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
// ⬇️ Local reusable components
import SupplierSearch from "@/components/SupplierSearch";
import ItemSection    from "@/components/ItemSection";

// -----------------------------------------------------------------------------
// 1️⃣  Initial shape of the form’s state (aka “GRN / Invoice draft”)
// -----------------------------------------------------------------------------
const initialGRNState = {
  supplier: "",         // Mongo ID reference to supplier master (if needed)
  supplierName: "",      // Supplier display name (redundant but convenient)
  supplierCode: "",      // ERP / legacy code
  contactPerson: "",     // Default contact at the supplier
  refNumber: "",         // User‑entered reference / vendor invoice no.
  status: "",            // e.g. "Pending" | "Paid"
  postingDate: "",        // Accounting posting date
  validUntil: "",         // For draft invoices – rarely used but optional
  documentDate: "",       // Printed document date
  salesEmployee: "",      // Name / ID of sales employee responsible
  remarks: "",            // Free‑form memo
  freight: 0,              // Extra freight charges (₹)
  rounding: 0,             // Manual rounding adjustment (₹)
  totalBeforeDiscount: 0,  // Computed → taxable amount before GST
  gstTotal: 0,            // Computed → sum of CGST+SGST / IGST
  grandTotal: 0,          // Computed → net payable (incl. GST + freight)
  remainingAmount: 0,     // Outstanding amount (for partial payments)
  invoiceType: "Normal",  // "Normal" | "POCopy" | "GRNCopy"
  items: [],              // Invoice line items (see handleItemSelect)
  qualityCheckDetails: [],// Optional QC details
};

// -----------------------------------------------------------------------------
// 2️⃣  Small helper – format JS Date ↔️ <input type="date"> value.
// -----------------------------------------------------------------------------
function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const ddMmYyyyRegex = /^(\d{2})-(\d{2})-(\d{4})$/; // e.g. "25-06-2025"
  if (ddMmYyyyRegex.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split("-");
    return `${yyyy}-${mm}-${dd}`; // HTML date expects yyyy-mm-dd
  }
  // Otherwise assume ISO / other parsable format
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
}

// ===============================
// Main Component
// ===============================
export default function PurchaseInvoiceForm() {
  const router    = useRouter();       // for navigation after save / copy
  const params    = useParams();       // invoiceId when editing existing
  const parentRef = useRef(null);      // parent div → for printing if needed

  // ---------------------------------------------------------------------------
  // React State
  // ---------------------------------------------------------------------------
  const [grnData, setGrnData] = useState(initialGRNState); // main form data
  const [summary, setSummary] = useState({                 // computed totals
    totalBeforeDiscount: 0,
    gstTotal: 0,
    grandTotal: 0,
  });
  const [isCopied, setIsCopied] = useState(false);         // flag if data copied from PO/GRN
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);
  const [barcode, setBarcode] = useState("");              // manual barcode input

  // ---------------------------------------------------------------------------
  // 💾 Load existing invoice for EDIT mode (URL: /invoice/[id])
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!params?.id) return;
    axios
      .get(`/api/purchaseInvoice/${params.id}`)
      .then(res => {
        if (res.data.success) {
          setGrnData(res.data.data);
          toast.info("Invoice data loaded for editing.");
        } else {
          toast.error("Invoice not found.");
        }
      })
      .catch(err => {
        console.error("Error loading invoice for edit:", err);
        toast.error("Error loading invoice data.");
      });
  }, [params]);

  // ---------------------------------------------------------------------------
  // Generic <input> change handler (for text / select / number fields)
  // ---------------------------------------------------------------------------
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setGrnData(prev => ({ ...prev, [name]: value }));
  }, []);

  // ---------------------------------------------------------------------------
  // SupplierSearch → onSelect callback
  // Auto‑fills code, name & contact person.
  // ---------------------------------------------------------------------------
  const handleSupplierSelect = useCallback((supplier) => {
    setGrnData(prev => ({
      ...prev,
      supplierCode:   supplier.supplierCode       ?? "",
      supplierName:   supplier.supplierName       ?? "",
      contactPerson:  supplier.contactPersonName  ?? "",
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Update QC actual values (simple nested state update)
  // ---------------------------------------------------------------------------
  const handleQualityCheckChange = useCallback((idx, value) => {
    setGrnData(prev => {
      const qc = [...prev.qualityCheckDetails];
      qc[idx] = { ...qc[idx], actualValue: value };
      return { ...prev, qualityCheckDetails: qc };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // ITEM selection handler – centralises: managedBy fetch, tax splits, etc.
  // ---------------------------------------------------------------------------
  const handleItemSelect = useCallback(async (index, selectedItem) => {
    if (!selectedItem?._id) {
      toast.error("Selected item does not have a valid ID.");
      return;
    }

    // 1️⃣ Ensure we know how this item is managed (batch / serial / none)
    let managedBy = selectedItem.managedBy;
    if (!managedBy?.trim()) {
      try {
        const res = await axios.get(`/api/items/${selectedItem._id}`);
        managedBy = res.data.success ? res.data.data.managedBy : "";
      } catch (err) {
        console.error("Error fetching item master details:", err);
        managedBy = "";
      }
    }

    // 2️⃣ Compute all derived monetary fields at selection time
    const unitPrice   = +selectedItem.unitPrice  || 0;
    const discount    = +selectedItem.discount   || 0;
    const freight     = +selectedItem.freight    || 0;
    const quantity    = 1;                       // default 1; user can change later
    const taxOption   = selectedItem.taxOption   || "GST";  // GST vs IGST
    const gstRate     = +selectedItem.gstRate    || 0;       // overall GST %
    const priceAfterDiscount = unitPrice - discount;
    const totalAmount        = quantity * priceAfterDiscount + freight;
    const cgstRate = +selectedItem.cgstRate || gstRate / 2;
    const sgstRate = +selectedItem.sgstRate || gstRate / 2;
    const cgstAmount = totalAmount * cgstRate / 100;
    const sgstAmount = totalAmount * sgstRate / 100;
    const gstAmount  = cgstAmount + sgstAmount;
    const igstAmount = taxOption === "IGST" ? totalAmount * gstRate / 100 : 0;

    // 3️⃣ Prepare new/updated item object
    const updatedItem = {
      item:            selectedItem._id,
      itemCode:        selectedItem.itemCode        ?? "",
      itemName:        selectedItem.itemName,
      itemDescription: selectedItem.description     ?? "",
      unitPrice,
      discount,
      freight,
      quantity,
      gstRate,
      taxOption,
      priceAfterDiscount,
      totalAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      managedBy,
      // If item is batch‑managed create an empty batches array so modal can add rows
      batches: managedBy?.trim().toLowerCase() === "batch" ? [] : [],
    };

    // 4️⃣ Add default QC rows if none came from master data
    const qc = selectedItem.qualityCheckDetails?.length
      ? selectedItem.qualityCheckDetails
      : [
          { parameter: "Weight",     min: "", max: "", actualValue: "" },
          { parameter: "Dimension",  min: "", max: "", actualValue: "" },
        ];

    // 5️⃣ Update state in one go
    setGrnData(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...updatedItem };
      return { ...prev, items, qualityCheckDetails: qc };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // 🗑 Remove an item row – fixes the old bug (was setFormData)
  // ---------------------------------------------------------------------------
  const removeItemRow = useCallback(index => {
    setGrnData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }, []);

  // ---------------------------------------------------------------------------
  // ➕ Add empty item row (initial numeric values = 0) so user can pick item
  // ---------------------------------------------------------------------------
  const addItemRow = useCallback(() => {
    setGrnData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item: "",
          itemCode: "",
          itemName: "",
          itemDescription: "",
          quantity: 0,
          allowedQuantity: 0,
          unitPrice: 0,
          discount: 0,
          freight: 0,
          gstRate: 0,
          taxOption: "GST",
          igstRate: 0,
          priceAfterDiscount: 0,
          totalAmount: 0,
          gstAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          managedBy: "",
          batches: [],
          errorMessage: "",
        },
      ],
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Handle inline edits inside the ItemSection (qty, unit price, discount…)
  // ---------------------------------------------------------------------------
  const handleItemChange = useCallback((idx, e) => {
    const { name, value } = e.target;
    const numericFields = [
      "quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate",
    ];
    const newValue = numericFields.includes(name) ? +value || 0 : value;

    setGrnData(prev => {
      const items = [...prev.items];
      const item  = { ...items[idx], [name]: newValue };

      // Recalculate price‑dependent fields on every edit
      const unitPrice = +item.unitPrice || 0;
      const discount  = +item.discount  || 0;
      const quantity  = +item.quantity  || 1;
      const freight   = +item.freight   || 0;
      item.priceAfterDiscount = unitPrice - discount;
      item.totalAmount        = quantity * (unitPrice - discount) + freight;

      items[idx] = item;
      return { ...prev, items };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Barcode handler → auto adds a new row and selects the scanned item
  // ---------------------------------------------------------------------------
  const handleBarcodeScan = useCallback(async () => {
    if (!barcode.trim()) {
      toast.error("Please enter a barcode.");
      return;
    }
    try {
      const res = await axios.get(`/api/barcode/${barcode.trim()}`);
      if (!res.data.success) {
        toast.error("Item not found for this barcode.");
        return;
      }
      const scannedItem = res.data.data;
      addItemRow();
      // Wait for state update then inject selected item
      setTimeout(() => {
        handleItemSelect(grnData.items.length, scannedItem);
      }, 0);
      toast.success("Item added via barcode.");
      setBarcode(""); // clear input
    } catch (err) {
      console.error("Barcode scan error", err);
      toast.error("Error scanning barcode.");
    }
  }, [barcode, grnData.items.length, addItemRow, handleItemSelect]);

  // ---------------------------------------------------------------------------
  // 🔄 Effect: If any item lacks managedBy, fetch it lazily (batch or serial)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Count how many items still missing managedBy
    const pending = grnData.items.filter(i => i.item && !i.managedBy?.trim()).length;
    if (pending === 0) return; // nothing to do

    (async () => {
      const updatedItems = await Promise.all(
        grnData.items.map(async (it) => {
          if (!it.item || it.managedBy?.trim()) return it;
          try {
            const res = await axios.get(`/api/items/${it.item}`);
            return res.data.success ? { ...it, managedBy: res.data.data.managedBy } : it;
          } catch (err) {
            console.error("Error fetching managedBy for", it.item, err);
            return it;
          }
        })
      );
      setGrnData(prev => ({ ...prev, items: updatedItems }));
    })();
  }, [grnData.items]);

  // ---------------------------------------------------------------------------
  // Batch modal open / close & entry changes
  // ---------------------------------------------------------------------------
  const openBatchModal = (index) => {
    setSelectedBatchItemIndex(index);
    setShowBatchModal(true);
  };
  const closeBatchModal = () => {
    setShowBatchModal(false);
    setSelectedBatchItemIndex(null);
  };
  const handleBatchEntryChange = (itemIdx, batchIdx, field, value) => {
    // Force numeric for quantity
    if (field === "batchQuantity") value = +value || 0;
    setGrnData(prev => {
      const items = [...prev.items];
      const batches = [...(items[itemIdx].batches || [])];
      batches[batchIdx] = { ...batches[batchIdx], [field]: value };
      items[itemIdx] = { ...items[itemIdx], batches };
      return { ...prev, items };
    });
  };
  const addBatchEntry = () => {
    if (selectedBatchItemIndex === null) return;
    setGrnData(prev => {
      const items = [...prev.items];
      const currItem = { ...items[selectedBatchItemIndex] };
      const last = currItem.batches[currItem.batches.length - 1];

      // Prevent adding multiple blank rows
      if (last && !last.batchNumber && !last.manufacturer && !last.batchQuantity) return prev;

      currItem.batches.push({
        batchNumber: "",
        expiryDate:  "",
        manufacturer: "",
        batchQuantity: 0,
      });
      items[selectedBatchItemIndex] = currItem;
      return { ...prev, items };
    });
  };

  // ---------------------------------------------------------------------------
  // 📊  Summary calculation – runs whenever items / freight / rounding change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const taxable = grnData.items.reduce((acc, it) => {
      const price = +it.unitPrice || 0;
      const disc  = +it.discount  || 0;
      const qty   = +it.quantity  || 1;
      return acc + (price - disc) * qty;
    }, 0);

    const itemsTotal = grnData.items.reduce((sum, it) => sum + (+it.totalAmount || 0), 0);

    const gstTotal = grnData.items.reduce((sum, it) => {
      return sum + (it.taxOption === "IGST" ? +it.igstAmount || 0 : +it.gstAmount || 0);
    }, 0);

    const grandTotal = Math.round((itemsTotal + gstTotal + (+grnData.freight || 0) + (+grnData.rounding || 0)) * 100) / 100;

    setSummary({ totalBeforeDiscount: taxable, gstTotal, grandTotal });
    setGrnData(prev => ({ ...prev, totalBeforeDiscount: taxable, gstTotal, grandTotal, remainingAmount: grandTotal }));
  }, [grnData.items, grnData.freight, grnData.rounding]);

  // ---------------------------------------------------------------------------
  // Helper to NORMALISE items when copying from PO / GRN (shared by both)
  // ---------------------------------------------------------------------------
  const normaliseCopiedItem = async (item) => {
    // Ensure managedBy present
    if (!item.managedBy?.trim()) {
      try {
        const res = await axios.get(`/api/items/${item.item}`);
        if (res.data.success) item.managedBy = res.data.data.managedBy;
      } catch (_) { /* ignore */ }
    }
    // Sanitize DB _id and fill defaults
    delete item._id;
    return {
      ...item,
      allowedQuantity: item.allowedQuantity || item.quantity,
      batches: item.managedBy?.toLowerCase() === "batch"
        ? (item.batches?.length ? item.batches : [{ batchNumber: "", expiryDate: "", manufacturer: "", batchQuantity: 0 }])
        : [],
      gstRate: item.gstRate || 0,
      taxOption: item.taxOption || "GST",
      igstRate: item.taxOption === "IGST" && !+item.igstRate ? item.gstRate : item.igstRate || 0,
      cgstRate: item.taxOption === "GST" && !+item.cgstRate ? item.gstRate / 2 : item.cgstRate || 0,
      sgstRate: item.taxOption === "GST" && !+item.sgstRate ? item.gstRate / 2 : item.sgstRate || 0,
      qualityCheckDetails: item.qualityCheckDetails?.length ? item.qualityCheckDetails : [
        { parameter: "Weight", min: "", max: "", actualValue: "" },
        { parameter: "Dimension", min: "", max: "", actualValue: "" },
      ],
    };
  };

  // ---------------------------------------------------------------------------
  // Copy from Purchase Order (sessionStorage key: purchaseInvoiceData)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      const raw = sessionStorage.getItem("purchaseInvoiceData");
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw);
        parsed.invoiceType = "POCopy";
        if (parsed._id) {
          parsed.purchaseOrderId = parsed._id; // keep ref
          delete parsed._id;
        }
        // Normalise every item in parallel
        parsed.items = await Promise.all(parsed.items.map(normaliseCopiedItem));
        setGrnData(parsed);
        sessionStorage.removeItem("purchaseInvoiceData");
        setIsCopied(true);
        toast.info("PO data loaded into Purchase Invoice form.");
      } catch (err) {
        console.error("Error parsing PO data:", err);
        toast.error("Failed to load PO copy data.");
      }
    })();
  }, []);

  // ---------------------------------------------------------------------------
  // Copy from GRN (sessionStorage key: grnData)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      const raw = sessionStorage.getItem("grnData");
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw);
        parsed.invoiceType = "GRNCopy";
        if (parsed._id) {
          parsed.goodsReceiptId = parsed._id; // map for backend
          // delete parsed._id;
        }
        parsed.items = await Promise.all(parsed.items.map(normaliseCopiedItem));
        setGrnData(parsed);
        sessionStorage.removeItem("grnData");
        setIsCopied(true);
        toast.info("GRN copy data loaded into Purchase Invoice form.");
      } catch (err) {
        console.error("Error parsing GRN copy data:", err);
        toast.error("Failed to load GRN copy data.");
      }
    })();
  }, []);

  // ---------------------------------------------------------------------------
  // Save Invoice – performs client‑side validations then POSTs to API
  // ---------------------------------------------------------------------------
  const handleSaveInvoice = async () => {
    // ✅ Validate quantities vs allowedQuantity & batch quantities
    for (const it of grnData.items) {
      const allowed = +it.allowedQuantity || 0;
      if (allowed && +it.quantity > allowed) {
        toast.error(`Item ${it.itemCode}: quantity exceeds allowed (${allowed}).`);
        return;
      }
      if (it.managedBy?.toLowerCase() === "batch") {
        const batchTotal = (it.batches || []).reduce((s, b) => s + (+b.batchQuantity || 0), 0);
        if (batchTotal !== +it.quantity) {
          toast.error(`Batch mismatch for item ${it.itemCode}: ${batchTotal} ≠ ${it.quantity}`);
          return;
        }
      }
    }

    try {
      const res = await axios.post("/api/purchaseInvoice", grnData, { headers: { "Content-Type": "application/json" } });
      toast.success(`Invoice saved. ID: ${res.data.invoiceId}`);
      setGrnData(initialGRNState);
      router.push(`/admin/purchaseInvoice-view/${res.data.invoiceId}`);
    } catch (err) {
      console.error("Error saving invoice:", err);
      toast.error(err.response?.data?.message || "Error saving invoice");
    }
  };

  // ---------------------------------------------------------------------------
  // Cancel – reset form to initial state
  // ---------------------------------------------------------------------------
  const handleCancel = () => {
    setGrnData(initialGRNState);
    toast.info("Purchase Invoice form cleared.");
  };

  // ---------------------------------------------------------------------------
  // Copy current invoice → PO (rare but sometimes needed)
  // ---------------------------------------------------------------------------
  const handleCopyToPO = () => {
    sessionStorage.setItem("grnData", JSON.stringify(grnData));
    router.push("/admin/purchase-order");
  };

  // ===============================
  // 8️⃣ JSX – The form UI
  // ===============================
  return (
    <div ref={parentRef} className="m-11 p-5 shadow-xl rounded-md bg-white">
      <h1 className="text-2xl font-bold mb-6">Purchase Invoice Form</h1>

      {/* ------------------------------------------------------------------- */}
      {/* Supplier & Document details */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-wrap gap-6 border p-6 rounded-lg shadow-sm mb-8">
        {/* Left column */}
        <div className="grow md:basis-1/2 space-y-4">
          {/* Supplier Code (readonly once selected) */}
          <div>
            <label className="block font-medium mb-1">Supplier Code</label>
            <input
              className="w-full border rounded px-2 py-1 bg-gray-100"
              name="supplierCode"
              value={grnData.supplierCode}
              readOnly
            />
          </div>

          {/* Supplier Name – either readonly or search component */}
          <div>
            <label className="block font-medium mb-1">Supplier Name</label>
            {grnData.supplierName ? (
              <input
                className="w-full border rounded px-2 py-1 bg-gray-100"
                name="supplierName"
                value={grnData.supplierName}
                readOnly
              />
            ) : (
              <SupplierSearch onSelectSupplier={handleSupplierSelect} />
            )}
          </div>

          {/* Contact Person */}
          <div>
            <label className="block font-medium mb-1">Contact Person</label>
            <input
              className="w-full border rounded px-2 py-1 bg-gray-100"
              name="contactPerson"
              value={grnData.contactPerson}
              readOnly
            />
          </div>

          {/* Reference Number */}
          <div>
            <label className="block font-medium mb-1">Reference Number</label>
            <input
              className="w-full border rounded px-2 py-1"
              name="refNumber"
              value={grnData.refNumber}
              onChange={handleInputChange}
            />
          </div>

          {/* Invoice Type */}
          <div>
            <label className="block font-medium mb-1">Invoice Type</label>
            <select
              name="invoiceType"
              value={grnData.invoiceType}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
            >
              <option value="Normal">Normal</option>
              <option value="POCopy">PO Copy</option>
              <option value="GRNCopy">GRN Copy</option>
            </select>
          </div>
        </div>

        {/* Right column */}
        <div className="grow md:basis-1/2 space-y-4">
          {/* Status */}
          <div>
            <label className="block font-medium mb-1">Status</label>
            <select
              name="status"
              value={grnData.status}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
            >
              <option value="">Select status</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* Posting Date */}
          <div>
            <label className="block font-medium mb-1">Posting Date</label>
            <input
              type="date"
              name="postingDate"
              value={formatDateForInput(grnData.postingDate)}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>

          {/* Valid Until */}
          <div>
            <label className="block font-medium mb-1">Valid Until</label>
            <input
              type="date"
              name="validUntil"
              value={formatDateForInput(grnData.validUntil)}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>

          {/* Document Date */}
          <div>
            <label className="block font-medium mb-1">Document Date</label>
            <input
              type="date"
              name="documentDate"
              value={formatDateForInput(grnData.documentDate)}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* ItemSection – reusable child + handlers passed as props */}
      {/* ------------------------------------------------------------------- */}
      <h2 className="text-xl font-semibold mb-4">Items</h2>
      <div className="border rounded-lg shadow-sm p-6 mb-8">
        <ItemSection
          items={grnData.items}
          onAddItem={addItemRow}
          onItemChange={handleItemChange}
          onItemSelect={handleItemSelect}
          onRemoveItem={removeItemRow}
        />

        {/* Barcode quick‑add */}
        <div className="flex mt-4 gap-2">
          <input
            className="flex-grow border rounded px-2 py-1"
            placeholder="Scan / Enter barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleBarcodeScan}
          >
            Add by Barcode
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Batch‑modal trigger list – one button per batch‑managed item */}
      {/* ------------------------------------------------------------------- */}
      {grnData.items.some(it => it.managedBy?.toLowerCase() === "batch") && (
        <div className="mb-8 space-y-2">
          {grnData.items.map((it, idx) => (
            it.managedBy?.toLowerCase() === "batch" ? (
              <div key={idx} className="flex justify-between items-center border p-3 rounded">
                <span>
                  <strong>{it.itemCode}</strong> – {it.itemName}
                </span>
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => openBatchModal(idx)}
                >
                  Set Batch Details
                </button>
              </div>
            ) : null
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Batch Modal – appears over screen; uses selectedBatchItemIndex */}
      {/* ------------------------------------------------------------------- */}
      {showBatchModal && selectedBatchItemIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full space-y-4">
            <h3 className="text-xl font-semibold">
              Batch Details – {grnData.items[selectedBatchItemIndex].itemCode}
            </h3>
            {/* Table of existing batches */}
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1">Batch #</th>
                  <th className="border px-2 py-1">Expiry</th>
                  <th className="border px-2 py-1">Manufacturer</th>
                  <th className="border px-2 py-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {grnData.items[selectedBatchItemIndex].batches.map((b, bIdx) => (
                  <tr key={bIdx}>
                    {/** Batch Number */}
                    <td className="border px-2 py-1">
                      <input
                        className="w-full border rounded px-1"
                        value={b.batchNumber}
                        onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, bIdx, "batchNumber", e.target.value)}
                      />
                    </td>
                    {/** Expiry */}
                    <td className="border px-2 py-1">
                      <input
                        type="date"
                        className="w-full border rounded px-1"
                        value={b.expiryDate}
                        onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, bIdx, "expiryDate", e.target.value)}
                      />
                    </td>
                    {/** Manufacturer */}
                    <td className="border px-2 py-1">
                      <input
                        className="w-full border rounded px-1"
                        value={b.manufacturer}
                        onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, bIdx, "manufacturer", e.target.value)}
                      />
                    </td>
                    {/** Quantity */}
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        className="w-full border rounded px-1"
                        value={b.batchQuantity}
                        onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, bIdx, "batchQuantity", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add batch row */}
            <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={addBatchEntry}>
              Add Batch Entry
            </button>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2">
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={closeBatchModal}>
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Sales Employee & Remarks */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid md:grid-cols-2 gap-6 border p-6 rounded-lg shadow-sm mb-8">
        <div>
          <label className="block font-medium mb-1">Sales Employee</label>
          <input
            name="salesEmployee"
            value={grnData.salesEmployee}
            onChange={handleInputChange}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Remarks</label>
          <textarea
            name="remarks"
            value={grnData.remarks}
            onChange={handleInputChange}
            className="w-full border rounded px-2 py-1 h-24"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Summary totals */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid md:grid-cols-2 gap-6 border p-6 rounded-lg shadow-sm mb-8">
        <div>
          <label className="block font-medium mb-1">Taxable Amount</label>
          <input
            readOnly
            className="w-full border rounded px-2 py-1 bg-gray-100"
            value={summary.totalBeforeDiscount.toFixed(2)}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Rounding Adjustment</label>
          <input
            name="rounding"
            type="number"
            value={grnData.rounding}
            onChange={handleInputChange}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">GST Total</label>
          <input
            readOnly
            className="w-full border rounded px-2 py-1 bg-gray-100"
            value={summary.gstTotal.toFixed(2)}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Grand Total</label>
          <input
            readOnly
            className="w-full border rounded px-2 py-1 bg-gray-100"
            value={summary.grandTotal.toFixed(2)}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Action buttons */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-wrap gap-3">
        <button className="bg-orange-500 text-white px-5 py-2 rounded" onClick={handleSaveInvoice}>
          Save Invoice
        </button>
        <button className="bg-gray-400 text-white px-5 py-2 rounded" onClick={handleCancel}>
          Cancel
        </button>
        <button className="bg-blue-600 text-white px-5 py-2 rounded" onClick={handleCopyToPO}>
          Copy To PO
        </button>
      </div>

      {/* Toast notifications container */}
      <ToastContainer />
    </div>
  );
}
