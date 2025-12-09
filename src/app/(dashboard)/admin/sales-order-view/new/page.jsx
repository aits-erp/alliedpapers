"use client";

// --------------------------------------------------
//  SalesOrderPage — full React client component (Next-13/14)
//  • Company login (token.type === "company" && companyName) OR roles.includes("admin")
//    ⇒ full edit rights
//  • Other users ⇒ when editing (editId present) only Status + Sales Stage may change
// --------------------------------------------------

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import CustomerAddressSelector from "@/components/CustomerAddressSelector";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


// ------------------ Constants --------------------
const emptyAddress = {
  address1: "",
  address2: "",
  city: "",
  state: "",
  pincode: "",
  country: "",
};

const initialOrderState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "",
  phoneNumber: "",
  salesEmployee: "",
  status: "Open",
  statusStages: "ETD Pending",
  orderDate: "",
  expectedDeliveryDate: "",
  billingAddress: { ...emptyAddress },
  shippingAddress: { ...emptyAddress },
  items: [
    {
      item: "",
      itemCode: "",
      itemId: "",
      itemName: "",
      itemDescription: "",
      quantity: "",
      allowedQuantity: 0,
      receivedQuantity: 0,
      unitPrice: "",
      discount: 0,
      freight: 0,
      taxOption: "GST",
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      gstRate: "",
      igstRate: "",
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      managedBy: "",
      batches: [],
      errorMessage: "",
      warehouse: "",
      warehouseName: "",
      warehouseCode: "",
      warehouseId: "",
      managedByBatch: true,
    },
  ],
  remarks: "",
  freight: 0,
  insuranceCharges: 0,
  otherCharges: 0,
  rounding: 0,
  totalDownPayment: 0,
  appliedAmounts: 0,
  totalBeforeDiscount: 0,
  gstTotal: 0,
  igstTotal: 0,
  grandTotal: 0,
  openBalance: 0,
  fromQuote: false,
};

const round = (num, d = 2) =>
  isNaN(Number(num)) ? 0 : Number(Number(num).toFixed(d));
const formatDate = (d) => (!d ? "" : new Date(d).toISOString().slice(0, 10));

const computeItemValues = (item) => {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  const disc = parseFloat(item.discount) || 0;
  const fr = parseFloat(item.freight) || 0;

  const pad = round(price *(1 - disc /100));
  const total = round(qty * pad + fr);

  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgst = round(total * (gstRate / 200));
    return {
      priceAfterDiscount: pad,
      totalAmount: total,
      gstAmount: cgst * 2,
      cgstAmount: cgst,
      sgstAmount: cgst,
      igstAmount: 0,
    };
  }

  const igst = round(total * ((parseFloat(item.igstRate) || 0) / 100));
  return {
    priceAfterDiscount: pad,
    totalAmount: total,
    gstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: igst,
  };
};

// ------------------ Suspense wrapper -------------
export default function SalesOrderPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <SalesOrderForm />
    </Suspense>
  );
}

// ------------------ Main form --------------------
function SalesOrderForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("editId");

  // ---- Auth parsing ----
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const d = jwtDecode(token);
      const roles = Array.isArray(d?.roles) ? d.roles : [];
      const roleStr = d?.role ?? d?.userRole ?? null;
      const isCompany = d?.type === "company" && !!d?.companyName;
      const isAdminRole =
        roleStr === "Sales Manager" ||
        roles.includes("admin") ||
        roles.includes("sales manager");
      setIsAdmin(isAdminRole || isCompany);
    } catch (e) {
      console.error("JWT decode error", e);
    }
  }, []);

  const isReadOnly = !!editId && !isAdmin; // locked when editing & not admin/company

  // ---- State ----
  const [formData, setFormData] = useState(initialOrderState);
  const [loading, setLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customBilling, setCustomBilling] = useState(false);
  const [customShipping, setCustomShipping] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [existingFiles, setExistingFiles] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);

  // ---- Prefill when copying ----
  useEffect(() => {
    const cached = sessionStorage.getItem("salesOrderData");
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached);
      // enforce address object shapes if copied data had strings
      setFormData((p) => ({
        ...p,
        ...parsed,
        billingAddress: normalizeAddress(parsed.billingAddress),
        shippingAddress: normalizeAddress(parsed.shippingAddress),
      }));
      setIsCopied(true);
    } catch {}
    sessionStorage.removeItem("salesOrderData");
  }, []);

  // ---- Load when editing ----
  useEffect(() => {
    if (!editId || !/^[0-9a-fA-F]{24}$/.test(editId)) return;
    setLoading(true);
    axios
      .get(`/api/sales-order/${editId}`)
      .then(({ data }) => {
        const r = data.data;

        const items = (r.items ?? []).map((i) => ({
          ...initialOrderState.items[0],
          ...i,
          item: i.item?._id || i.item || "",
          warehouse: i.warehouse?._id || i.warehouse || "",
          taxOption: i.taxOption || "GST",
        }));

        setExistingFiles(r.attachments || []);

        setFormData({
          ...initialOrderState,
          ...r,
          billingAddress: normalizeAddress(r.billingAddress),
          shippingAddress: normalizeAddress(r.shippingAddress),
          items: items.length ? items : initialOrderState.items,
          orderDate: formatDate(r.orderDate),
          expectedDeliveryDate: formatDate(r.expectedDeliveryDate),
        });

        if (r.customerCode || r.customerName) {
          setSelectedCustomer({
            _id: r.customer || r.customerCode,
            customerCode: r.customerCode,
            customerName: r.customerName,
            contactPersonName: r.contactPerson,
          });
        }
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [editId]);

  

  // ---- Totals calculation ----
  // useEffect(() => {
  //   const items = formData.items || [];
  //   const totalBefore = items.reduce((s, i) => {
  //     const up = parseFloat(i.unitPrice) || 0;
  //     const qty = parseFloat(i.quantity) || 0;
  //     const disc = parseFloat(i.discount) || 0;
  //     return s + (up * qty - disc);
  //   }, 0);


// ---------- Totals calculation useEffect (include insurance/other deps) ----------
useEffect(() => {
  const items = formData.items || [];
  const totalBefore = items.reduce((s, i) => {
    const up = parseFloat(i.unitPrice) || 0;
    const qty = parseFloat(i.quantity) || 0;
    const disc = parseFloat(i.discount) || 0; // percent

    const lineTotal = up * qty;
    const discountAmt = (lineTotal * disc) / 100;
    return s + (lineTotal - discountAmt);
  }, 0);

  const gstTotal = items.reduce((s, i) => s + (parseFloat(i.gstAmount) || 0), 0);
  const igstTotal = items.reduce((s, i) => s + (parseFloat(i.igstAmount) || 0), 0);

  const freight = parseFloat(formData.freight) || 0;
  const insuranceCharges = parseFloat(formData.insuranceCharges) || 0;
  const otherCharges = parseFloat(formData.otherCharges) || 0;

  const unroundedTotal = totalBefore + gstTotal + igstTotal + freight + insuranceCharges + otherCharges;
  const roundedTotal = Math.round(unroundedTotal);
  const rounding = +(roundedTotal - unroundedTotal).toFixed(2);
  const grandTotal = roundedTotal;

  const dp = parseFloat(formData.totalDownPayment) || 0;
  const ap = parseFloat(formData.appliedAmounts) || 0;
  const openBalance = grandTotal - (dp + ap);

  setFormData((p) => ({
    ...p,
    totalBeforeDiscount: round(totalBefore),
    gstTotal: round(gstTotal),
    igstTotal: round(igstTotal),
    grandTotal: round(grandTotal),
    rounding, // derived
    openBalance: round(openBalance),
  }));
  // ensure totals update whenever items OR any top-level numeric fields change
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  JSON.stringify(formData.items),
  formData.freight,
  formData.insuranceCharges,
  formData.otherCharges,
  formData.totalDownPayment,
  formData.appliedAmounts,
]);

  // ---- Helpers ----
  function normalizeAddress(a) {
    if (!a) return { ...emptyAddress };
    if (typeof a === "string")
      return { ...emptyAddress, address1: a };
    // if it’s already an object, ensure all keys exist
    return { ...emptyAddress, ...a };
  }

  const onCustomer = (c) => {
    setSelectedCustomer(c);
    setFormData((p) => ({
      ...p,
      customer: c._id,
      customerName: c.customerName,
      customerCode: c.customerCode,
      contactPerson: c.contactPerson,
      phoneNumber: c.phoneNumber || "",

      // reset addresses for a new customer
      billingAddress: { ...emptyAddress },
      shippingAddress: { ...emptyAddress },
    }));
  };

 // ---------- improved handleChange (parse numeric fields) ----------
const handleChange = (e) => {
  const { name, value } = e.target;

  // treat these fields as numeric
  const numericTopLevel = [
    "freight",
    "insuranceCharges",
    "otherCharges",
    "rounding",
    "totalDownPayment",
    "appliedAmounts",
    "gstTotal",
    "igstTotal",
    "grandTotal",
    "totalBeforeDiscount",
  ];

  const newVal = numericTopLevel.includes(name) ? (parseFloat(value) || 0) : value;

  setFormData((p) => ({ ...p, [name]: newVal }));
};



  // nested address updates
  const updateAddressField = (kind, field, value) => {
    setFormData((p) => ({
      ...p,
      [kind]: { ...(p[kind] || emptyAddress), [field]: value },
    }));
  };

  const handleItemChange = (idx, e) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    setFormData((p) => {
      const items = [...p.items];
      const numeric = [
        "quantity",
        "allowedQuantity",
        "receivedQuantity",
        "unitPrice",
        "discount",
        "freight",
        "insuranceCharges",
        "otherCharges",
        "rounding",
        "gstRate",
        "igstRate",
        "cgstRate",
        "sgstRate",
        "gstAmount",
        "igstAmount",
        "cgstAmount",
        "sgstAmount",
        "priceAfterDiscount",
        "totalAmount",
      ];
      const val = numeric.includes(name) ? parseFloat(value) || 0 : value;
      items[idx] = {
        ...items[idx],
        [name]: val,
        ...computeItemValues({ ...items[idx], [name]: val }),
      };
      return { ...p, items };
    });
  };

  const addItemRow = () =>
    !isReadOnly &&
    setFormData((p) => ({
      ...p,
      items: [...p.items, { ...initialOrderState.items[0] }],
    }));

  const removeItemRow = (idx) =>
    !isReadOnly &&
    setFormData((p) => ({
      ...p,
      items: p.items.filter((_, i) => i !== idx),
    }));

  const handleSubmit = async () => {
    if (!formData.customerCode || !formData.customerName) {
      toast.error("Select a customer");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const headers = { Authorization: `Bearer ${token}` };

      // data is already normalized: addresses are objects
      const dataToSend = {
        ...formData,
        billingAddress: normalizeAddress(formData.billingAddress),
        shippingAddress: normalizeAddress(formData.shippingAddress),
      };

      const buildFormData = (data, newFiles = [], removed = []) => {
        const fd = new FormData();
        fd.append("orderData", JSON.stringify(data));
        newFiles.forEach((f) => fd.append("newFiles", f));
        if (removed.length > 0) {
          fd.append("removedFiles", JSON.stringify(removed));
        }
        return fd;
      };

      if (editId) {
        if (!isAdmin) {
          // non-admins can only change status + stage
          await axios.put(
            `/api/sales-order/${editId}`,
            { status: dataToSend.status, statusStages: dataToSend.statusStages },
            { headers }
          );
          toast.success("Stage updated");
        } else {
          const fileChanges =
            attachments.length > 0 || removedFiles.length > 0;
          if (fileChanges) {
            const body = buildFormData(dataToSend, attachments, removedFiles);
            await axios.put(`/api/sales-order/${editId}`, body, { headers });
          } else {
            await axios.put(`/api/sales-order/${editId}`, dataToSend, {
              headers,
            });
          }
          toast.success("Updated successfully");
        }
      } else {
        const body = buildFormData(dataToSend, attachments);
        await axios.post(`/api/sales-order`, body, { headers });
        toast.success("Created successfully");
        setFormData(initialOrderState);
        setAttachments([]);
      }

      router.push("/admin/sales-order-view");
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Auto-set today for new order ----
  useEffect(() => {
    if (!editId)
      setFormData((p) => ({
        ...p,
        orderDate: new Date().toISOString().slice(0, 10),
      }));
  }, [editId]);

  console.log("form data",{ formData });

  // ---- Render helpers ----
  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  const base = "w-full p-2 border rounded";
  const ro = `${base} bg-gray-100`;

  return (
    <div className="m-8 p-5 border shadow-xl">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Edit Sales Order" : "Create Sales Order"}
      </h1>
      {isReadOnly && (
        <p className="text-sm text-gray-500 mb-2 italic">
          Only Status and Sales Stage are editable for your role.
        </p>
      )}

      {/* ---------- Customer / Meta ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Customer Name */}
        <div>
          <label className="font-medium block mb-1">Customer Name</label>
          {isReadOnly || isCopied ? (
            <input value={formData.customerName} readOnly className={ro} />
          ) : isNewCustomer ? (
            <>
              <input
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                className={base}
                placeholder="Enter new customer"
              />
              <button
                type="button"
                onClick={() => setIsNewCustomer(false)}
                className="mt-1 bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm transition"
              >
                ⬅︎ Back to search
              </button>
            </>
          ) : (
            <>
              <CustomerSearch
                onSelectCustomer={onCustomer}
                onNotFound={(text) => {
                  setIsNewCustomer(true);
                  setFormData((p) => ({ ...p, customerName: text }));
                }}
              />
              <button
                type="button"
                onClick={() => setIsNewCustomer(true)}
                className="mt-1 bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm transition"
              >
                + Add new customer
              </button>
            </>
          )}
        </div>

        {/* Customer Code */}
        <div>
          <label className="font-medium">Customer Code</label>
          <input
            name="customerCode"
            value={formData.customerCode}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={isReadOnly ? ro : base}
          />
        </div>

        {/* Contact Person */}
        <div>
          <label className="font-medium">Contact Person</label>
          <input
            name="contactPerson"
            value={formData?.contactPerson}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={isReadOnly ? ro : base}
          />
        </div>

        {/* Reference No. */}
        {/* <div>
          <label className="font-medium">Reference No.</label>
          <input
            name="refNumber"
            value={formData.refNumber}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={isReadOnly ? ro : base}
          />
        </div> */}
           <div>
          <label className="font-medium">Phone No.</label>
          <input
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={isReadOnly ? ro : base}
          />
        </div>
      </div>

      {/* ---------- Address Section ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Billing */}
        <div>
    

          {(!customBilling && !isReadOnly) ? (
            <CustomerAddressSelector
              disabled={isReadOnly}
              customer={selectedCustomer}
              selectedAddress={formData.billingAddress}
              onAddressSelect={(addr) =>
                setFormData((p) => ({ ...p, billingAddress: normalizeAddress(addr) }))
              }
              type="billing"
            />
          ) : (
            <div className="space-y-2">
              <textarea
                value={formData.billingAddress?.address1 || ""}
                onChange={(e) =>
                  updateAddressField("billingAddress", "address1", e.target.value)
                }
                rows={3}
                readOnly={isReadOnly}
                className={isReadOnly ? ro : base}
                placeholder="Address line 1"
              />
              {!isReadOnly && (
                <>
                  <input
                    className={base}
                    placeholder="Address line 2"
                    value={formData.billingAddress?.address2 || ""}
                    onChange={(e) =>
                      updateAddressField("billingAddress", "address2", e.target.value)
                    }
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className={base}
                      placeholder="City"
                      value={formData.billingAddress?.city || ""}
                      onChange={(e) =>
                        updateAddressField("billingAddress", "city", e.target.value)
                      }
                    />
                    <input
                      className={base}
                      placeholder="State"
                      value={formData.billingAddress?.state || ""}
                      onChange={(e) =>
                        updateAddressField("billingAddress", "state", e.target.value)
                      }
                    />
                    <input
                      className={base}
                      placeholder="Country"
                      value={formData.billingAddress?.country || ""}
                      onChange={(e) =>
                        updateAddressField("billingAddress", "Country", e.target.value)
                      }
                    />
                    <input
                      className={base}
                      placeholder="Pincode"
                      value={formData.billingAddress?.pincode || ""}
                      onChange={(e) =>
                        updateAddressField("billingAddress", "pincode", e.target.value)
                      }
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {!isReadOnly && (
            <button
              type="button"
              className="text-blue-600 text-sm mt-1"
              onClick={() => setCustomBilling((v) => !v)}
            >
              {customBilling ? "⬅︎ Select saved address" : "+ Enter custom address"}
            </button>
          )}
        </div>

        {/* Shipping */}
        <div>
        

          {(!customShipping && !isReadOnly) ? (
            <CustomerAddressSelector
              disabled={isReadOnly}
              customer={selectedCustomer}
              selectedAddress={formData.shippingAddress}
              onAddressSelect={(addr) =>
                setFormData((p) => ({ ...p, shippingAddress: normalizeAddress(addr) }))
              }
              type="shipping"
            />
          ) : (
            <div className="space-y-2">
              <textarea
                value={formData.shippingAddress?.address1 || ""}
                onChange={(e) =>
                  updateAddressField("shippingAddress", "address1", e.target.value)
                }
                rows={3}
                readOnly={isReadOnly}
                className={isReadOnly ? ro : base}
                placeholder="Address line 1"
              />
              {!isReadOnly && (
                <>
                  <input
                    className={base}
                    placeholder="Address line 2"
                    value={formData.shippingAddress?.address2 || ""}
                    onChange={(e) =>
                      updateAddressField("shippingAddress", "address2", e.target.value)
                    }
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className={base}
                      placeholder="City"
                      value={formData.shippingAddress?.city || ""}
                      onChange={(e) =>
                        updateAddressField("shippingAddress", "city", e.target.value)
                      }
                    />
                    <input
                      className={base}
                      placeholder="State"
                      value={formData.shippingAddress?.state || ""}
                      onChange={(e) =>
                        updateAddressField("shippingAddress", "state", e.target.value)
                      }
                    />
                    <input
                      className={base}
                      placeholder="Country"
                      value={formData.shippingAddress?.country || ""}
                      onChange={(e) =>
                        updateAddressField("shippingAddress", "Country", e.target.value)
                      }
                    />
                    <input
                      className={base}
                      placeholder="Pincode"
                      value={formData.shippingAddress?.pincode || ""}
                      onChange={(e) =>
                        updateAddressField("shippingAddress", "pincode", e.target.value)
                      }
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {!isReadOnly && (
            <button
              type="button"
              className="text-blue-600 text-sm mt-1"
              onClick={() => setCustomShipping((v) => !v)}
            >
              {customShipping ? "⬅︎ Select saved address" : "+ Enter custom address"}
            </button>
          )}
        </div>
      </div>

      {/* ---------- Dates & Status ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="font-medium">Order Date</label>
          <input type="date" value={formData.orderDate} readOnly className={ro} />
        </div>
        <div>
          <label className="font-medium">Expected Delivery</label>
          <input
            type="date"
            name="expectedDeliveryDate"
            value={formData.expectedDeliveryDate}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={isReadOnly ? ro : base}
          />
        </div>
        <div>
          <label className="font-medium">Status</label>
        <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={base}
            disabled={isReadOnly} // since isReadOnly already means !isAdmin
          >
            <option>Open</option>
            <option>Pending</option>
            <option>Closed</option>
            <option>Cancelled</option>
          </select>
        </div>
        <div>
          <label className="font-medium">Sales Stage</label>
          <select
            name="statusStages"
            value={formData.statusStages}
            onChange={handleChange}
            className={base}
            disabled={isReadOnly}
          >
            <option>ETD Pending</option>
            <option>ETD Confirmation from plant</option>
            <option>ETD notification for SC-cremika</option>
            <option>SC to concerned sales & customer</option>
            <option>Material in QC-OK/NOK</option>
            <option>Dispatch with qty</option>
            <option>Delivered to customer</option>
          </select>
        </div>
      </div>

      {/* ---------- Items ---------- */}
      <ItemSection
        items={formData.items}
        onItemChange={handleItemChange}
        onAddItem={addItemRow}
        onRemoveItem={removeItemRow}
        computeItemValues={computeItemValues}
        disabled={isReadOnly}
      />

      {/* ---------- Totals ---------- */}
      <div className="grid grid-cols-1 md-grid-cols-2 md:grid-cols-2 gap-4 mt-6">
        {[
          ["Total ", "totalBeforeDiscount", true],
          ["GST Total", "gstTotal", true],
          ["IGST Total", "igstTotal", true],
          ["Freight", "freight", false],
          ["Insurance Charges", "insuranceCharges", false],
          ["Other Charges","otherCharges", false],
          ["Rounding", "rounding", true], // derived, read-only
          ["Grand Total", "grandTotal", true],
        ].map(([label, key, readOnly]) => (
          <div key={key}>
            <label>{label}</label>
            <input
              name={key}
              value={formData[key]}
              onChange={handleChange}
              readOnly={readOnly || isReadOnly}
              className={readOnly || isReadOnly ? ro : base}
            />
          </div>
        ))}
      </div>

      {/* ---------- Remarks ---------- */}
      <div className="mt-6">
        <label className="font-medium">Remarks</label>
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          readOnly={isReadOnly}
          rows={3}
          className={isReadOnly ? ro : base}
        />
      </div>

      {/* ---------- Attachments ---------- */}
      <div className="mt-6">
        <label className="font-medium block mb-1">Attachments</label>

        {existingFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
            {existingFiles.map((file, idx) => {
              const url =
                typeof file === "string"
                  ? file
                  : file?.fileUrl || file?.url || file?.path || file?.location || "";
              const type = file?.fileType || "";
              const name =
                file?.fileName || url?.split("/").pop() || `File-${idx}`;
              if (!url) return null;

              const isPDF =
                type === "application/pdf" || url.toLowerCase().endsWith(".pdf");

              return (
                <div key={idx} className="relative border rounded p-2 text-center">
                  {isPDF ? (
                    <object
                      data={url}
                      type="application/pdf"
                      className="h-24 w-full rounded"
                    />
                  ) : (
                    <img
                      src={url}
                      alt={name}
                      className="h-24 w-full object-cover rounded"
                    />
                  )}

                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 text-xs mt-1 truncate"
                  >
                    {name}
                  </a>

                  {!isReadOnly && (
                    <button
                      onClick={() => {
                        setExistingFiles((prev) =>
                          prev.filter((_, i) => i !== idx)
                        );
                        setRemovedFiles((prev) => [...prev, file]);
                      }}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          disabled={isReadOnly}
          onChange={(e) => {
            if (isReadOnly) return;
            const files = Array.from(e.target.files || []);
            setAttachments((prev) => {
              const m = new Map(prev.map((f) => [f.name + f.size, f]));
              files.forEach((f) => m.set(f.name + f.size, f));
              return [...m.values()];
            });
            e.target.value = "";
          }}
          className={isReadOnly ? `${ro} cursor-not-allowed` : base}
        />

        {!isReadOnly && attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
            {attachments.map((file, idx) => {
              const url = URL.createObjectURL(file);
              const isPDF = file.type === "application/pdf";
              const isImage = file.type.startsWith("image/");

              return (
                <div key={idx} className="relative border rounded p-2 text-center">
                  {isImage ? (
                    <img
                      src={url}
                      alt={file.name}
                      className="h-24 w-full object-cover rounded"
                    />
                  ) : isPDF ? (
                    <object
                      data={url}
                      type="application/pdf"
                      className="h-24 w-full rounded"
                    />
                  ) : (
                    <p className="truncate text-xs">{file.name}</p>
                  )}
                  <button
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------- Buttons ---------- */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`px-4 py-2 rounded text-white ${
            submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          {submitting ? "Saving…" : editId ? "Update" : "Create Order"}
        </button>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}




// "use client";

// // --------------------------------------------------
// //  SalesOrderPage — full React client component (Next‑13/14)
// //  • Company login (token.type === "company" && companyName) OR roles.includes("admin")
// //    ⇒ full edit rights
// //  • Other users ⇒ when editing (editId present) only Status + Sales Stage may change
// // --------------------------------------------------

// import { useState, useEffect, useCallback, Suspense } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { jwtDecode } from "jwt-decode"; // ✅ correct


// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import CustomerAddressSelector from "@/components/CustomerAddressSelector";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import {uploadOrderWithFiles} from "@/lib/uploadOrderWithFiles"

// // ------------------ Constants --------------------
// const initialOrderState = {
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
//   salesEmployee: "",
//   status: "Open",
//   statusStages: "ETD Pending",
//   orderDate: "",
//   expectedDeliveryDate: "",
//   billingAddress: [],
//   shippingAddress: [],
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemId: "",
//       itemName: "",
//       itemDescription: "",
//       quantity:"",
//       allowedQuantity: 0,
//       receivedQuantity: 0,
//       unitPrice: "",
//       discount: 0,
//       freight: 0,
//       taxOption: "GST",
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       gstRate: "",
//       igstRate: "",
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//       managedBy: "",
//       batches: [],
//       errorMessage: "",
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//       warehouseId: "",
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

// const round = (num, d = 2) => (isNaN(Number(num)) ? 0 : Number(Number(num).toFixed(d)));
// const formatDate = (d) => (!d ? "" : new Date(d).toISOString().slice(0, 10));

// const computeItemValues = (item) => {
//   const qty = parseFloat(item.quantity) || 0;
//   const price = parseFloat(item.unitPrice) || 0;
//   const disc = parseFloat(item.discount) || 0;
//   const fr = parseFloat(item.freight) || 0;
//   const pad = round(price - disc);
//   const total = round(qty * pad + fr);
//   if (item.taxOption === "GST") {
//     const gstRate = parseFloat(item.gstRate) || 0;
//     const cgst = round(total * (gstRate / 200));
//     return { priceAfterDiscount: pad, totalAmount: total, gstAmount: cgst * 2, cgstAmount: cgst, sgstAmount: cgst, igstAmount: 0 };
//   }
//   const igst = round(total * ((parseFloat(item.igstRate) || 0) / 100));
//   return { priceAfterDiscount: pad, totalAmount: total, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: igst };
// };

// // ------------------ Suspense wrapper -------------
// export default function SalesOrderPage() {
//   return (
//     <Suspense fallback={<div className="p-4">Loading…</div>}>
//       <SalesOrderForm />
//     </Suspense>
//   );
// }

// // ------------------ Main form --------------------
// function SalesOrderForm() {
//   const router = useRouter();
//   const params = useSearchParams();
//   const editId = params.get("editId");

//   // ---- Auth parsing ----
//   const [isAdmin, setIsAdmin] = useState(false);


//   //  
// useEffect(() => {
//   const token = localStorage.getItem("token");
//   if (!token) return;
//   try {
//     const d = jwtDecode(token); // ✅ correct method
//     const roles = Array.isArray(d?.roles) ? d.roles : [];
//     const roleStr = d?.role ?? d?.userRole ?? null;
//     const isCompany = d?.type === "company" && !!d?.companyName;
//     const isAdminRole = roleStr === "Sales Manager" || roles.includes("admin") || roles.includes("sales manager");
//     setIsAdmin(isAdminRole || isCompany);
//   } catch (e) {
//     console.error("JWT decode error", e);
//   }
// }, []);

//   const isReadOnly = !!editId && !isAdmin; // locked when editing & not admin/company

//   // ---- State ----
//   const [formData, setFormData] = useState(initialOrderState);
//   const [loading, setLoading] = useState(false);
//   const [isCopied, setIsCopied] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [attachments, setAttachments] = useState([]);
//   const [error, setError] = useState(null);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);
//   const [customBilling, setCustomBilling] = useState(false);
//   const [customShipping, setCustomShipping] = useState(false);
//   const [isNewCustomer, setIsNewCustomer] = useState(false);
//   const [existingFiles, setExistingFiles] = useState([]);
//   const [removedFiles, setRemovedFiles] = useState([]);

//   // ---- Prefill when copying ----
//   useEffect(() => {
//     const cached = sessionStorage.getItem("salesOrderData");
//     if (!cached) return;
//     try { setFormData(JSON.parse(cached)); setIsCopied(true); } catch {}
//     sessionStorage.removeItem("salesOrderData");
//   }, []);

//   // ---- Load when editing ----
//   useEffect(() => {
//     if (!editId || !/^[0-9a-fA-F]{24}$/.test(editId)) return;
//     setLoading(true);
//     axios.get(`/api/sales-order/${editId}`)
//       .then(({ data }) => {
//         const r = data.data;
//         const items = (r.items ?? []).map((i) => ({
//           ...initialOrderState.items[0],
//           ...i,

//           item: i.item?._id || i.item || "",
//           warehouse: i.warehouse?._id || i.warehouse || "",
//           taxOption: i.taxOption || "GST",
//         }));
//         setExistingFiles(r.attachments || []);
//         setFormData({ ...initialOrderState, ...r, items: items.length ? items : initialOrderState.items, orderDate: formatDate(r.orderDate), expectedDeliveryDate: formatDate(r.expectedDeliveryDate) });
//         if (r.customerCode || r.customerName) {
//           setSelectedCustomer({ _id: r.customer || r.customerCode, customerCode: r.customerCode, customerName: r.customerName, contactPersonName: r.contactPerson });
//         }
//       })
//       .catch((e) => setError(e.message || "Failed to load"))
//       .finally(() => setLoading(false));
//   }, [editId]);

//   // ---- Totals calculation ----
//   useEffect(() => {
//     const items = formData.items || [];
//     const totalBefore = items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.discount), 0);
//     const gstTotal = items.reduce((s, i) => s + i.gstAmount, 0);
//     const igstTotal = items.reduce((s, i) => s + i.igstAmount, 0);



//     const freight = parseFloat(formData.freight) || 0;
// const unroundedTotal = totalBefore + gstTotal + igstTotal + freight;
// const roundedTotal = Math.round(unroundedTotal);
// const rounding = +(roundedTotal - unroundedTotal).toFixed(2);
// const grandTotal = roundedTotal;
// formData.rounding = rounding;

//     const openBalance = grandTotal - (formData.totalDownPayment + formData.appliedAmounts);
//     setFormData((p) => ({ ...p, totalBeforeDiscount: round(totalBefore), gstTotal: round(gstTotal), grandTotal: round(grandTotal), openBalance: round(openBalance),igstTotal: round(igstTotal), }));
//   }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);



// // useEffect(() => {
// //   const items = formData.items || [];

// //   // Total before discount
// //   const totalBefore = items.reduce(
// //     (s, i) => s + (i.unitPrice * i.quantity - (i.discount || 0)),
// //     0
// //   );

// //   // Tax totals
// //   const gstTotal = items.reduce((s, i) => s + (i.gstAmount || 0), 0);
// //   const igstTotal = items.reduce((s, i) => s + (i.igstAmount || 0), 0);

// //   // Freight
// //   const freight = parseFloat(formData.freight) || 0;

// //   // Grand total calculation with rounding
// //   const unroundedTotal = totalBefore + gstTotal + igstTotal + freight;
// //   const roundedTotal = Math.round(unroundedTotal);
// //   const rounding = +(roundedTotal - unroundedTotal).toFixed(2);
// //   const grandTotal = roundedTotal;

// //   const openBalance =
// //     grandTotal - ((formData.totalDownPayment || 0) + (formData.appliedAmounts || 0));

// //   // Update state including IGST
// //   setFormData((p) => ({
// //     ...p,
// //     totalBeforeDiscount: round(totalBefore),
// //     gstTotal: round(gstTotal),
// //     igstTotal: round(igstTotal), // ✅ make sure this is here
// //     grandTotal: round(grandTotal),
// //     rounding,
// //     openBalance: round(openBalance),
// //   }));
// // }, [
// //   formData.items,
// //   formData.freight,
// //   formData.rounding,
// //   formData.totalDownPayment,
// //   formData.appliedAmounts,
// // ]);


//   // ---- Change helpers ----
//   const onCustomer = (c) => {
//     setSelectedCustomer(c);
//     setFormData((p) => ({ ...p, customer: c._id, customerName: c.customerName, customerCode: c.customerCode, contactPerson: c.contactPersonName, billingAddress: null, shippingAddress: null }));
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((p) => ({ ...p, [name]: value }));
//   };

//   const handleItemChange = (idx, e) => {
//     if (isReadOnly) return;
//     const { name, value } = e.target;
//     setFormData((p) => {
//       const items = [...p.items];
//       const numeric = ["quantity", "allowedQuantity", "receivedQuantity", "unitPrice", "discount", "freight", "gstRate", "igstRate", "cgstRate", "sgstRate", "gstAmount", "igstAmount", "cgstAmount", "sgstAmount", "priceAfterDiscount", "totalAmount"];
//       const val = numeric.includes(name) ? parseFloat(value) || 0 : value;
//       items[idx] = { ...items[idx], [name]: val, ...computeItemValues({ ...items[idx], [name]: val }) };
//       return { ...p, items };
//     });
//   };

//   const addItemRow = () => !isReadOnly && setFormData((p) => ({ ...p, items: [...p.items, { ...initialOrderState.items[0] }] }));
//   const removeItemRow = (idx) => !isReadOnly && setFormData((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  

// const handleSubmit = async () => {
//   if (!formData.customerCode || !formData.customerName) {
//     toast.error("Select a customer");
//     return;
//   }

//   setSubmitting(true);
//   try {
//     const token = localStorage.getItem("token");
//     if (!token) throw new Error("Not authenticated");

//     const headers = { Authorization: `Bearer ${token}` };

//     // 🛠 Fix: wrap string addresses into object
//     if (typeof formData.shippingAddress === "string") {
//       formData.shippingAddress = { address1: formData.shippingAddress };
//     }
//     if (typeof formData.billingAddress === "string") {
//       formData.billingAddress = { address1: formData.billingAddress };
//     }

//     // 📦 Utility: builds FormData
//     const buildFormData = (data, newFiles = [], removed = []) => {
//       const fd = new FormData();
//       fd.append("orderData", JSON.stringify(data));
//       newFiles.forEach((f) => fd.append("newFiles", f));
//       if (removed.length > 0) {
//         fd.append("removedFiles", JSON.stringify(removed));
//       }
//       return fd;
//     };

//     // ───────── 🛠 EDIT MODE ─────────
//     if (editId) {
//       if (!isAdmin) {
//         // non-admins → only update stage
//         await axios.put(
//           `/api/sales-order/${editId}`,
//           { status: formData.status, statusStages: formData.statusStages },
//           { headers }
//         );
//         toast.success("Stage updated");
//       } else {
//         const fileChanges = attachments.length > 0 || removedFiles.length > 0;
//         if (fileChanges) {
//           const body = buildFormData(formData, attachments, removedFiles);
//           await axios.put(`/api/sales-order/${editId}`, body, { headers });
//         } else {
//           await axios.put(`/api/sales-order/${editId}`, formData, { headers });
//         }
//         toast.success("Updated successfully");
//       }

//     // ───────── 🆕 CREATE MODE ─────────
//     } else {
//       const body = buildFormData(formData, attachments);
//       await axios.post("/api/sales-order", body, { headers });
//       toast.success("Created successfully");
//       setFormData(initialOrderState);
//       setAttachments([]);
//     }

//     router.push("/admin/sales-order-view");
//   } catch (e) {
//     toast.error(e?.response?.data?.message || e.message);
//   } finally {
//     setSubmitting(false);
//   }
// };


//   // ---- Auto‑set today for new order ----
//   useEffect(() => { if (!editId) setFormData((p) => ({ ...p, orderDate: new Date().toISOString().slice(0, 10) })); }, [editId]);

//   // ---- Render helpers ----
//   if (loading) return <div>Loading…</div>;
//   if (error) return <div className="text-red-600">{error}</div>;
//   const base = "w-full p-2 border rounded";
//   const ro = `${base} bg-gray-100`;

//   return (
//     <div className="m-8 p-5 border shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">{editId ? "Edit Sales Order" : "Create Sales Order"}</h1>
//       {isReadOnly && <p className="text-sm text-gray-500 mb-2 italic">Only Status and Sales Stage are editable for your role.</p>}

//       {/* ---------- Customer / Meta ---------- */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//         {/* Customer Name */}
//         <div>
//           <label className="font-medium block mb-1">Customer Name</label>
//           {isReadOnly || isCopied ? (
//             <input value={formData.customerName} readOnly className={ro} />
//           ) : isNewCustomer ? (
//             <>
//               <input name="customerName" value={formData.customerName} onChange={handleChange} className={base} placeholder="Enter new customer" />
//               <button type="button" onClick={() => setIsNewCustomer(false)} className="mt-1 bg-gray-200 px-3 py-1 rounded text-sm">⬅︎ Back to search</button>
//             </>
//           ) : (
//             <>
//               <CustomerSearch onSelectCustomer={onCustomer} onNotFound={(text) => { setIsNewCustomer(true); setFormData((p) => ({ ...p, customerName: text })); }} />
//               <button type="button" onClick={() => setIsNewCustomer(true)} className="mt-1 bg-gray-200 px-3 py-1 rounded text-sm">+ Add new customer</button>
//             </>
//           )}
//         </div>
//         {/* Customer Code */}
//         <div>
//           <label className="font-medium">Customer Code</label>
//           <input name="customerCode" value={formData.customerCode} onChange={handleChange} readOnly={isReadOnly} className={isReadOnly ? ro : base} />
//         </div>
//         {/* Contact Person */}
//         <div>
//           <label className="font-medium">Contact Person</label>
//           <input name="contactPerson" value={formData.contactPerson} onChange={handleChange} readOnly={isReadOnly} className={isReadOnly ? ro : base} />
//         </div>
//         {/* Ref Number */}
//         <div>
//           <label className="font-medium">Reference No.</label>
//           <input name="refNumber" value={formData.refNumber} onChange={handleChange} readOnly={isReadOnly} className={isReadOnly ? ro : base} />
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//   {/* Customer Name */}
//   <div>
//     <label className="font-medium block mb-1">Customer Name</label>
//     {isReadOnly || isCopied ? (
//       <input value={formData.customerName} readOnly className={ro} />
//     ) : isNewCustomer ? (
//       <>
//         <input
//           name="customerName"
//           value={formData.customerName}
//           onChange={handleChange}
//           className={base}
//           placeholder="Enter new customer"
//         />
//         <button
//           type="button"
//           onClick={() => setIsNewCustomer(false)}
//           className="mt-1 bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm transition"
//         >
//           ⬅︎ Back to search
//         </button>
//       </>
//     ) : (
//       <>
//         <CustomerSearch
//           onSelectCustomer={onCustomer}
//           onNotFound={(text) => {
//             setIsNewCustomer(true);
//             setFormData((p) => ({ ...p, customerName: text }));
//           }}
//         />
//         <button
//           type="button"
//           onClick={() => setIsNewCustomer(true)}
//           className="mt-1 bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm transition"
//         >
//           + Add new customer
//         </button>
//       </>
//     )}
//   </div>

//   {/* Customer Code */}
//   <div>
//     <label className="font-medium">Customer Code</label>
//     <input
//       name="customerCode"
//       value={formData.customerCode}
//       onChange={handleChange}
//       readOnly={isReadOnly}
//       className={isReadOnly ? ro : base}
//     />
//   </div>

//   {/* Contact Person */}
//   <div>
//     <label className="font-medium">Contact Person</label>
//     <input
//       name="contactPerson"
//       value={formData.contactPerson}
//       onChange={handleChange}
//       readOnly={isReadOnly}
//       className={isReadOnly ? ro : base}
//     />
//   </div>

//   {/* Reference No. */}
//   <div>
//     <label className="font-medium">Reference No.</label>
//     <input
//       name="refNumber"
//       value={formData.refNumber}
//       onChange={handleChange}
//       readOnly={isReadOnly}
//       className={isReadOnly ? ro : base}
//     />
//   </div>
// </div>


//       {/* ---------- Address Section ---------- */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//         {/* Billing */}
//         <div>
//           <label className="font-medium block">Billing Address</label>
//           {customBilling && !isReadOnly ? (
//             <>
//               <textarea name="billingAddress" value={formData.billingAddress || ""} onChange={handleChange} rows={3} className={base} />
//               <button className="text-blue-600 text-sm" onClick={() => { setCustomBilling(false); setFormData((p) => ({ ...p, billingAddress: null })); }}>⬅︎ Select saved</button>
//             </>
//           ) : (
//             <>
//               {/* <CustomerAddressSelector disabled={isReadOnly} customer={selectedCustomer} selectedBillingAddress={formData.billingAddress} selectedShippingAddress={formData.shippingAddress} onBillingAddressSelect={(addr) => setFormData((p) => ({ ...p, billingAddress: addr }))} onShippingAddressSelect={(addr) => setFormData((p) => ({ ...p, shippingAddress: addr }))} /> */}
//                <textarea name="billingAddress" value={formData.billingAddress.address1 || ""} onChange={handleChange} rows={3} className={base} />
//               {!isReadOnly && <button className="text-blue-600 text-sm" onClick={() => { setCustomBilling(true); setFormData((p) => ({ ...p, billingAddress: "" })); }}>+ Enter billing address</button>}
//             </>
//           )}
//         </div>
//         {/* Shipping */}
//         <div>
//           <label className="font-medium block">Shipping Address</label>
//           {customShipping && !isReadOnly ? (
//             <>
//               <textarea name="shippingAddress" value={formData.shippingAddress || ""} onChange={handleChange} rows={3} className={base} />
//               <button className="text-blue-600 text-sm" onClick={() => { setCustomShipping(false); setFormData((p) => ({ ...p, shippingAddress: null })); }}>⬅︎ Select saved</button>
//             </>
//           ) : (
//             <>
//               {/* <CustomerAddressSelector disabled={isReadOnly} customer={selectedCustomer} selectedBillingAddress={formData.billingAddress} selectedShippingAddress={formData.shippingAddress} onBillingAddressSelect={(addr) => setFormData((p) => ({ ...p, billingAddress: addr }))} onShippingAddressSelect={(addr) => setFormData((p) => ({ ...p, shippingAddress: addr }))} /> */}
//                  <textarea name="shippingAddress" value={formData.shippingAddress.address1 || ""} onChange={handleChange} rows={3} className={base} />
//               {!isReadOnly && <button className="text-blue-600 text-sm" onClick={() => { setCustomShipping(true); setFormData((p) => ({ ...p, shippingAddress: "" })); }}>+ Enter shipping address</button>}
//             </>
//           )}
//         </div>
//       </div>

//       {/* ---------- Dates & Status ---------- */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//         <div>
//           <label className="font-medium">Order Date</label>
//           <input type="date" value={formData.orderDate} readOnly className={ro} />
//         </div>
//         <div>
//           <label className="font-medium">Expected Delivery</label>
//           <input type="date" name="expectedDeliveryDate" value={formData.expectedDeliveryDate} onChange={handleChange} readOnly={isReadOnly} className={isReadOnly ? ro : base} />
//         </div>
//         <div>
//           <label className="font-medium">Status</label>
//           <select name="status" value={formData.status} onChange={handleChange} className={base} disabled={isReadOnly && !isAdmin}>
//             <option>Open</option><option>Pending</option><option>Closed</option><option>Cancelled</option>
//           </select>
//         </div>
//         <div>
//           <label className="font-medium">Sales Stage</label>
//           <select name="statusStages" value={formData.statusStages} onChange={handleChange} className={base} disabled={isReadOnly && !isAdmin}>
//             <option>ETD Pending</option><option>ETD Confirmation from plant</option><option>ETD notification for SC-cremika</option><option>SC to concerned sales & customer</option><option>Material in QC-OK/NOK</option><option>Dispatch with qty</option><option>Delivered to customer</option>
//           </select>
//         </div>
//       </div>

//       {/* ---------- Items ---------- */}
//       <ItemSection items={formData.items} onItemChange={handleItemChange} onAddItem={addItemRow} onRemoveItem={removeItemRow} computeItemValues={computeItemValues} disabled={isReadOnly} />

//       {/* ---------- Totals ---------- */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
//         {[
//           ["Total Before Discount", "totalBeforeDiscount", true],
//           ["GST Total", "gstTotal", true],
//            ["IGST Total", "igstTotal", true],
//           ["Freight", "freight", false],
//           ["Rounding", "rounding", false],
//           ["Grand Total", "grandTotal", true],
//           // ["Open Balance", "openBalance", true],
//         ].map(([label, key, readOnly]) => (
//           <div key={key}>
//             <label>{label}</label>
//             <input name={key} value={formData[key]} onChange={handleChange} readOnly={readOnly || isReadOnly} className={readOnly || isReadOnly ? ro : base} />
//           </div>
//         ))}
//       </div>

//       {/* ---------- Remarks ---------- */}
//       <div className="mt-6">
//         <label className="font-medium">Remarks</label>
//         <textarea name="remarks" value={formData.remarks} onChange={handleChange} readOnly={isReadOnly} rows={3} className={isReadOnly ? ro : base} />
//       </div>

 


// <div className="mt-6">
//   <label className="font-medium block mb-1">Attachments</label>

//   {/* Existing uploaded files */}
// {existingFiles.length > 0 && (
//   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
//     {existingFiles.map((file, idx) => {
//       const url = typeof file === "string"
//         ? file
//         : file?.fileUrl || file?.url || file?.path || file?.location || "";

//       const type = file?.fileType || "";
//       const name = file?.fileName || url?.split("/").pop() || `File-${idx}`;
//       if (!url) return null;

//       const isPDF = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");

//       return (
//         <div key={idx} className="relative border rounded p-2 text-center">
//           {isPDF ? (
//             <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//           ) : (
//             <img src={url} alt={name} className="h-24 w-full object-cover rounded" />
//           )}

//           <a
//             href={url}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="block text-blue-600 text-xs mt-1 truncate"
//           >
//             {name}
//           </a>

//           {!isReadOnly && (
//             <button
//               onClick={() => {
//                 setExistingFiles((prev) => prev.filter((_, i) => i !== idx));
//                 // Optional: keep track of deleted files if needed for API call
//                 setRemovedFiles((prev) => [...prev, file]);
//               }}
//               className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
//             >
//               ×
//             </button>
//           )}
//         </div>
//       );
//     })}
//   </div>
// )}

//   {/* New Uploads */}
// <input
//   type="file"
//   multiple
//   accept="image/*,application/pdf"
//   disabled={isReadOnly}
//   onChange={(e) => {
//     if (isReadOnly) return;
//     const files = Array.from(e.target.files);
//     setAttachments((prev) => {
//       const m = new Map(prev.map((f) => [f.name + f.size, f]));
//       files.forEach((f) => m.set(f.name + f.size, f));
//       return [...m.values()];
//     });
//     e.target.value = "";
//   }}
//   className={isReadOnly ? `${ro} cursor-not-allowed` : base}
// />


//   {/* Previews of new uploads */}
//   {!isReadOnly && attachments.length > 0 && (
//     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//       {attachments.map((file, idx) => {
//         const url = URL.createObjectURL(file);
//         const isPDF = file.type === "application/pdf";
//         const isImage = file.type.startsWith("image/");

//         return (
//           <div key={idx} className="relative border rounded p-2 text-center">
//             {isImage ? (
//               <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />
//             ) : isPDF ? (
//               <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//             ) : (
//               <p className="truncate text-xs">{file.name}</p>
//             )}
//             <button
//               onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
//               className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
//             >
//               ×
//             </button>
//           </div>
//         );
//       })}
//     </div>
//   )}
// </div>


//       {/* ---------- Buttons ---------- */}
//       <div className="mt-6 flex gap-4">
//         <button onClick={handleSubmit} disabled={submitting} className={`px-4 py-2 rounded text-white ${submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-500"}`}>{submitting ? "Saving…" : editId ? "Update" : "Create Order"}</button>
//         <button onClick={() => router.back()} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-400">Cancel</button>
//       </div>
//     </div>
//   );
// }








// "use client";

// import { useState, useEffect, useCallback, Suspense,useRef, } from "react";

// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import CustomerAddressSelector from "@/components/CustomerAddressSelector";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Initial state with full set of fields
// const initialOrderState = {
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
//   salesEmployee: "",
//   status: "Open",
//   statusStages: "ETD Confirmation from plant", // Default status stage
//   orderDate: "",
//   expectedDeliveryDate: "",
//   billingAddress: null,
//   shippingAddress: null,
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemId: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0,
//       allowedQuantity: 0,
//       receivedQuantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       taxOption: "GST",
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       gstRate: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//       managedBy: "",
//       batches: [],
//       errorMessage: "",
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//       warehouseId: "",
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

// // Helper functions
// const round = (num, d = 2) => {
//   const n = Number(num);
//   return isNaN(n) ? 0 : Number(n.toFixed(d));
// };

// function formatDate(d) {
//   if (!d) return "";
//   const date = new Date(d);
//   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
//     2,
//     "0"
//   )}-${String(date.getDate()).padStart(2, "0")}`;
// }

// const computeItemValues = (item) => {
//   const qty = parseFloat(item.quantity) || 0;
//   const price = parseFloat(item.unitPrice) || 0;
//   const disc = parseFloat(item.discount) || 0;
//   const fr = parseFloat(item.freight) || 0;
//   const pad = round(price - disc);
//   const total = round(qty * pad + fr);

//   if (item.taxOption === "GST") {
//     const gstRate = parseFloat(item.gstRate) || 0;
//     const cgst = round(total * (gstRate / 200));
//     const sgst = cgst;
//     return {
//       priceAfterDiscount: pad,
//       totalAmount: total,
//       gstAmount: cgst + sgst,
//       cgstAmount: cgst,
//       sgstAmount: sgst,
//       igstAmount: 0,
//     };
//   }
//   const igst = round(total * ((parseFloat(item.gstRate) || 0) / 100));
//   return {
//     priceAfterDiscount: pad,
//     totalAmount: total,
//     gstAmount: 0,
//     cgstAmount: 0,
//     sgstAmount: 0,
//     igstAmount: igst,
//   };
// };

// export default function SalesOrderPage() {
//   return (
//     <Suspense fallback={<div className="p-4">Loading...</div>}>
//       <SalesOrderForm />
//     </Suspense>
//   );
// }

// function SalesOrderForm() {
//   const router = useRouter();
//   const params = useSearchParams();
//   const editId = params.get("editId");

//   const [formData, setFormData] = useState(initialOrderState);
//   const [loading, setLoading] = useState(false);
//   const [isCopied, setIsCopied] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [attachments, setAttachments] = useState([]);
//   const [error, setError] = useState(null);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);
//   const [customShipping, setCustomShipping] = useState(false);
//   const [customBilling, setCustomBilling] = useState(false);

//   const [isNewCustomer, setIsNewCustomer] = useState(false);

//   /* ---------- handlers ---------- */

//   // called when CustomerSearch reports “no match”
//   const onSearchNotFound = (searchText) => {
//     // pre‑fill the name so the user doesn’t re‑type it
//     setFormData((prev) => ({ ...prev, customerName: searchText }));
//     setIsNewCustomer(true);
//   };

//   const handleNewCustomerToggle = () => setIsNewCustomer((prev) => !prev);

//   useEffect(() => {
//     const key = "salesOrderData";
//     const stored = sessionStorage.getItem(key);
//     if (!stored) return;
//     try {
//       setFormData(JSON.parse(stored));
//       setIsCopied(true);
//     } catch (err) {
//       console.error("Bad JSON in sessionStorage", err);
//     } finally {
//       sessionStorage.removeItem(key);
//     }
//   }, []);

//   // Load existing order if editing
//   useEffect(() => {
//     if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
//       setLoading(true);
//       axios
//         .get(`/api/sales-order/${editId}`)
//         .then((res) => {
//           const record = res.data.data;
//           const items = Array.isArray(record.items)
//             ? record.items.map((i) => ({
//                 ...initialOrderState.items[0],
//                 ...i,
//                 item: i.item?._id || i.item || "",
//                 warehouse: i.warehouse?._id || i.warehouse || "",
//                 taxOption: i.taxOption || "GST",
//               }))
//             : [...initialOrderState.items];

//           // Set form data
//           setFormData({
//             ...initialOrderState,
//             ...record,
//             items,
//             billingAddress: record.billingAddress || null,
//             shippingAddress: record.shippingAddress || null,
//             orderDate: formatDate(record.orderDate),
//             expectedDeliveryDate: formatDate(record.expectedDeliveryDate),
//           });

//           // Set selected customer for address component
//           if (record.customerCode || record.customerName) {
//             setSelectedCustomer({
//               _id: record.customer || record.customerCode,
//               customerCode: record.customerCode,
//               customerName: record.customerName,
//               contactPersonName: record.contactPerson,
//             });
//           }
//         })
//         .catch((err) => setError(err.message || "Failed to load"))
//         .finally(() => setLoading(false));
//     }
//   }, [editId]);

//   // const onCustomer = useCallback((c) => {
//   //   setFormData((p) => ({
//   //     ...p,
//   //     customerCode: c.customerCode ?? "",
//   //     customerName: c.customerName ?? "",
//   //     contactPerson: c.contactPersonName ?? "",
//   //   }));
//   // }, []);

//   // Recalculate totals
//   useEffect(() => {
//     const items = Array.isArray(formData.items) ? formData.items : [];
//     const totalBeforeDiscount = items.reduce(
//       (s, i) => s + (i.unitPrice * i.quantity - i.discount),
//       0
//     );
//     const gstTotal = items.reduce((s, i) => s + i.gstAmount, 0);
//     const grandTotal =
//       totalBeforeDiscount + gstTotal + formData.freight + formData.rounding;
//     const openBalance =
//       grandTotal - (formData.totalDownPayment + formData.appliedAmounts);

//     setFormData((prev) => ({
//       ...prev,
//       totalBeforeDiscount: round(totalBeforeDiscount),
//       gstTotal: round(gstTotal),
//       grandTotal: round(grandTotal),
//       openBalance: round(openBalance),
//     }));
//   }, [
//     formData.items,
//     formData.freight,
//     formData.rounding,
//     formData.totalDownPayment,
//     formData.appliedAmounts,
//   ]);

//   // Handlers
//   const onCustomer = useCallback((c) => {
//     setSelectedCustomer(c);
//     setFormData((prev) => ({
//       ...prev,
//       customer: c._id || "",
//       customerName: c.customerName,
//       customerCode: c.customerCode,
//       contactPerson: c.contactPersonName,
//       billingAddress: null,
//       shippingAddress: null,
//     }));
//   }, []);

//   const handleChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }, []);

//   const handleItemChange = useCallback((idx, e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => {
//       const arr = Array.isArray(prev.items) ? [...prev.items] : [];
//       const newVal = [
//         "quantity",
//         "allowedQuantity",
//         "receivedQuantity",
//         "unitPrice",
//         "discount",
//         "freight",
//         "gstRate",
//       ].includes(name)
//         ? parseFloat(value) || 0
//         : value;
//       arr[idx] = {
//         ...arr[idx],
//         [name]: newVal,
//         ...computeItemValues({ ...arr[idx], [name]: newVal }),
//       };
//       return { ...prev, items: arr };
//     });
//   }, []);

//   const onInput = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((p) => ({ ...p, [name]: value }));
//   }, []);

//   const addItemRow = () => {
//     setFormData((prev) => {
//       const arr = Array.isArray(prev.items) ? prev.items : [];
//       return { ...prev, items: [...arr, { ...initialOrderState.items[0] }] };
//     });
//   };

//   const removeItemRow = (idx) => {
//     setFormData((prev) => {
//       const arr = Array.isArray(prev.items) ? prev.items : [];
//       return { ...prev, items: arr.filter((_, i) => i !== idx) };
//     });
//   };

//   const handleSubmit = async () => {
//     if (!formData.customerCode || !formData.customerName) {
//       toast.error("❌ Please select a customer");
//       return;
//     }

//     setSubmitting(true);
//     setError(null);

//     let payload = { ...formData };
    // // 🟡 Convert plain string to object if needed
    // if (typeof formData.shippingAddress === "string") {
    //   formData.shippingAddress = { address1: formData.shippingAddress };
    // }
    // if (typeof formData.billingAddress === "string") {
    //   formData.billingAddress = { address1: formData.billingAddress };
    // }

//     try {
//       const token = localStorage.getItem("token");

//       if (!token) {
//         throw new Error("User is not authenticated");
//       }

//       // const headers = {
//       //   'Content-Type': 'application/json',
//       //   'Authorization': `Bearer ${token}`,
//       // };
//       const headers = { Authorization: `Bearer ${token}` };

//       if (editId) {
//         await axios.put(`/api/sales-order/${editId}`, formData, {
//           ...headers,
//           headers: { ...headers, "Content-Type": "application/json" },
//         });
//         toast.success("✅ Sales Order updated successfully");
//       } else {
        // const body = new FormData();
        // body.append("orderData", JSON.stringify(formData)); // the JSON blob
        // attachments.forEach((file) => body.append("attachments", file));
        // await axios.post("/api/sales-order", body, { headers });
        // // const res = await axios.post("/api/sales-order", formData, { headers });
//         toast.success("✅ Sales Order created successfully");
//         setFormData(initialOrderState); // reset form
//         setAttachments([]);
//       }

//       router.push("/admin/sales-order-view");
//     } catch (err) {
//       const message =
//         err?.response?.data?.error ||
//         err?.response?.data?.message ||
//         err.message ||
//         "Unknown error";

//       setError(message);
//       toast.error(`❌ ${message}`);
//       console.error("Error saving sales order:", err);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // 1️⃣  Auto‑set to today on first render
//   useEffect(() => {
//     const today = new Date().toISOString().split("T")[0]; // "YYYY‑MM‑DD"
//     setFormData((fd) => ({ ...fd, orderDate: today }));
//   }, []);

//   if (loading) return <div>Loading...</div>;
//   if (error) return <div className="text-red-500">{error}</div>;
// const customerBoxRef = useRef(null);
//   return (
//     <div className="m-8 p-5 border shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">
//         {editId ? "Edit Sales Order" : "Create Sales Order"}
//       </h1>

//       {/* Customer & Meta */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//         <div ref={customerBoxRef} >
//           <label className="mb-2 block font-medium">Customer Name</label>

//           {/* CASE 1 – editing an existing record or copying -> always free text */}
//           {editId || isCopied ? (
//             <input
//               type="text"
//               name="customerName"
//               value={formData.customerName}
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           ) : (
//             /* CASE 2 – brand‑new record */
//             <>
//               {isNewCustomer ? (
//                 <>
//                   <input
//                     type="text"
//                     name="customerName"
//                     value={formData.customerName}
//                     onChange={onInput}
//                     placeholder="Enter new customer"
//                     className="w-full rounded border p-2"
//                   />
//                   <button
//                     type="button"
//                     onClick={handleNewCustomerToggle}
//                     className="mt-2 rounded bg-gray-200 px-3 py-1 text-sm"
//                   >
//                     ⬅︎ Back to search
//                   </button>
//                 </>
//               ) : (
//                 <>
//                   <CustomerSearch
//                     onSelectCustomer={onCustomer}
//                     onNotFound={onSearchNotFound} 
//                     // 👈 add this prop inside CustomerSearch
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setIsNewCustomer(true)}
//                     className="mt-2 rounded bg-gray-200 px-3 py-1 text-sm"
//                   >
//                     + Add new customer
//                   </button>
//                 </>
//               )}
//             </>
//           )}
//         </div>
//         <div>
//           <label className="font-medium">Customer Code</label>
//           <input
//             name="customerCode"
//             value={formData.customerCode}
//             onChange={handleChange}
//             className="w-full p-2 border bg-gray-100 rounded"
//           />
//         </div>
//         <div>
//           <label className="font-medium">Contact Person</label>
//           <input
//             name="contactPerson"
//             value={formData.contactPerson}
//             onChange={handleChange}
//             className="w-full p-2 border bg-gray-100 rounded"
//           />
//         </div>
//         <div>
//           <label className="font-medium">Reference No.</label>
//           <input
//             name="refNumber"
//             value={formData.refNumber}
//             onChange={handleChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//       </div>

//       {/* Customer Address Selection */}
//       {/* <CustomerAddressSelector
//         customer={selectedCustomer}
//         selectedBillingAddress={formData.billingAddress}
//         selectedShippingAddress={formData.shippingAddress}
//         onBillingAddressSelect={(address) =>
//           setFormData((prev) => ({ ...prev, billingAddress: address }))
//         }
//         onShippingAddressSelect={(address) =>
//           setFormData((prev) => ({ ...prev, shippingAddress: address }))
//         }
//       /> */}

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

//             <div className="mt-4">
//         <label className="block font-medium mb-1">Billing Address</label>
//         {customBilling ? (
//           <>
//             <textarea
//               name="billingAddress" 
//               value={formData.billingAddress || ""}
//               onChange={(e) =>  
//                 setFormData((prev) => ({  
//                   ...prev,
//                   billingAddress: e.target.value,
//                 }))
//               }
//               rows={3}
//               placeholder="Enter custom billing address"
//               className="w-full p-2 border rounded"
//             />
//             <button 
//               type="button"
//               onClick={() => {
//                 setCustomBilling(false);
//                 setFormData((prev) => ({ ...prev, billingAddress: null }));
//               }}
//               className="mt-1 text-blue-600 text-sm"
//             >
//               ⬅︎ Select from saved addresses
//             </button>
//           </>
//         ) : (
//           <>
//             <CustomerAddressSelector
//               customer={selectedCustomer}
//               selectedBillingAddress={formData.billingAddress}
//               selectedShippingAddress={formData.shippingAddress}
//               onBillingAddressSelect={(addr) =>
//                 setFormData((prev) => ({ ...prev, billingAddress: addr }))
//               } 
//               onShippingAddressSelect={(addr) =>
//                 setFormData((prev) => ({ ...prev, shippingAddress: addr })) 
//               }
//             />
//             <button
//               type="button"
//               onClick={() => {
//                 setCustomBilling(true);
//                 setFormData((prev) => ({ ...prev, billingAddress: "" }));
//               }}
//               className="mt-1 text-blue-600 text-sm"  
//             >
//               + Enter customer billing address
//             </button>
//           </>
//         )}  
//       </div>


//       {/* shipping */}
//       <div className="mt-4">
//         <label className="block font-medium mb-1">Shipping Address</label>

//         {customShipping ? (
//           <>
//             <textarea
//               name="shippingAddress"
//               value={formData.shippingAddress || ""}
//               onChange={(e) =>
//                 setFormData((prev) => ({
//                   ...prev,
//                   shippingAddress: e.target.value,
//                 }))
//               }
//               rows={3}
//               placeholder="Enter custom shipping address"
//               className="w-full p-2 border rounded"
//             />
//             <button
//               type="button"
//               onClick={() => {
//                 setCustomShipping(false);
//                 setFormData((prev) => ({ ...prev, shippingAddress: null }));
//               }}
//               className="mt-1 text-blue-600 text-sm"
//             >
//               ⬅︎ Select from saved addresses
//             </button>
//           </>
//         ) : (
//           <>
//             <CustomerAddressSelector
//               customer={selectedCustomer}
//               selectedBillingAddress={formData.billingAddress}
//               selectedShippingAddress={formData.shippingAddress}
//               onBillingAddressSelect={(addr) =>
//                 setFormData((prev) => ({ ...prev, billingAddress: addr }))
//               }
//               onShippingAddressSelect={(addr) =>
//                 setFormData((prev) => ({ ...prev, shippingAddress: addr }))
//               }
//             />
//             <button
//               type="button"
//               onClick={() => {
//                 setCustomShipping(true);
//                 setFormData((prev) => ({ ...prev, shippingAddress: "" }));
//               }}
//               className="mt-1 text-blue-600 text-sm"
//             >
//               + Enter customer shipping address
//             </button>
//           </>
//         )}
//       </div>
  
//       </div>

//       {/* Dates & Status */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//         <div>
//           <label className="font-medium">Order Date</label>
//           <input
//             type="date"
//             name="orderDate"
//             value={formData.orderDate}
//             readOnly // prevents manual change / calendar popup
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="font-medium">Expected Delivery</label>
//           <input
//             type="date"
//             name="expectedDeliveryDate"
//             value={formData.expectedDeliveryDate}
//             onChange={handleChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="font-medium">Status</label>
//           <select
//             name="status"
//             value={formData.status}
//             onChange={handleChange}
//             className="w-full p-2 border rounded"
//           >
//             <option>Open</option> <option>Pending</option>
//             <option>Closed</option>
//             <option>Cancelled</option>
//           </select>
//         </div>
//         <div>
//           <label className="font-medium">Sales Stages</label>
//           <select
//             name="statusStages"
//             value={formData.statusStages}
//             onChange={handleChange}
//             className="w-full p-2 border rounded"
//           >
//             <option>ETD Confirmation from plant</option>{" "}
//             <option>ETD notification for SC-cremika</option>
//             <option>SC to concerned sales & customer</option>
//             <option>Material in QC-OK/NOK</option>
//             <option>Dispatch with qty</option>{" "}
//             <option>Delivered to customer</option>
//           </select>
//         </div>
//       </div>

//       {/* Items */}
//       <ItemSection
//         items={Array.isArray(formData.items) ? formData.items : []}
//         onItemChange={handleItemChange}
//         onAddItem={addItemRow}
//         onRemoveItem={removeItemRow}
//         computeItemValues={computeItemValues}
//       />

//       {/* Totals */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
//         <div>
//           <label>Total Before Discount</label>
//           <input
//             readOnly
//             value={formData.totalBeforeDiscount}
//             className="w-full p-2 border bg-gray-100 rounded"
//           />
//         </div>
//         <div>
//           <label>GST Total</label>
//           <input
//             readOnly
//             value={formData.gstTotal}
//             className="w-full p-2 border bg-gray-100 rounded"
//           />
//         </div>
//         <div>
//           <label>Freight</label>
//           <input
//             type="number"
//             name="freight"
//             value={formData.freight}
//             onChange={handleChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label>Rounding</label>
//           <input
//             type="number"
//             name="rounding"
//             value={formData.rounding}
//             onChange={handleChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label>Grand Total</label>
//           <input
//             readOnly
//             value={formData.grandTotal}
//             className="w-full p-2 border bg-gray-100 rounded"
//           />
//         </div>
//         <div>
//           <label>Open Balance</label>
//           <input
//             readOnly
//             value={formData.openBalance}
//             className="w-full p-2 border bg-gray-100 rounded"
//           />
//         </div>
//       </div>

//       <div className="mt-6">
//         <label className="font-medium">Remarks</label>
//         <textarea
//           name="remarks"
//           value={formData.remarks}
//           onChange={handleChange}
//           rows={3}
//           className="w-full p-2 border rounded"
//         ></textarea>
//       </div>
//       {/* <div className="mt-6">
//         <label className="font-medium">Attachments</label>
//         <input
//           type="file"
//           multiple
//           onChange={(e) => {
//             const incoming = Array.from(e.target.files);
//             setAttachments((prev) => {
//               // merge by name + size to avoid exact duplicates
//               const map = new Map(prev.map((f) => [f.name + f.size, f]));
//               incoming.forEach((f) => map.set(f.name + f.size, f));
//               return [...map.values()];
//             });
//             e.target.value = ""; // clear picker so same file can be re‑chosen
//           }}
//           className="block w-full rounded border p-2"
//         />

//         {attachments.length > 0 && (
//           <ul className="mt-2 divide-y text-sm text-gray-700">
//             {attachments.map((file, idx) => (
//               <li key={idx} className="flex items-center justify-between py-1">
//                 <span>
//                   {file.name} ({(file.size / 1024).toFixed(1)} KB)
//                 </span>
//                 <button
//                   type="button"
//                   onClick={() =>
//                     setAttachments((prev) => prev.filter((_, i) => i !== idx))
//                   }
//                   className="text-red-600 hover:text-red-800"
//                   title="Remove"
//                 >
//                   ×
//                 </button>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div> */}

//       <div className="mt-6">
//         <label className="block font-medium mb-2">Attachments</label>

//         <input
//           type="file"
//           multiple
//           accept="image/*,application/pdf"
//           onChange={(e) => {
//             const incoming = Array.from(e.target.files);
//             setAttachments((prev) => {
//               const map = new Map(prev.map((f) => [f.name + f.size, f]));
//               incoming.forEach((f) => map.set(f.name + f.size, f));
//               return [...map.values()];
//             });
//             e.target.value = "";
//           }}
//           className="block w-full rounded border p-2"
//         />

//         {attachments.length > 0 && (
//           <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
//             {attachments.map((file, idx) => {
//               const url = URL.createObjectURL(file);

//               /* pick component by type */
//               let preview;
//               if (file.type.startsWith("image/")) {
//                 preview = (
//                   <img
//                     src={url}
//                     alt={file.name}
//                     className="h-24 w-full object-cover rounded"
//                   />
//                 );
//               } else if (file.type === "application/pdf") {
//                 preview = (
//                   <object
//                     data={url}
//                     type="application/pdf"
//                     className="h-24 w-full rounded"
//                   >
//                     <p className="truncate text-xs">
//                       {file.name} ({(file.size / 1024).toFixed(1)} KB)
//                     </p>
//                   </object>
//                 );
//               } else {
//                 preview = (
//                   <p className="truncate text-xs">
//                     {file.name} ({(file.size / 1024).toFixed(1)} KB)
//                   </p>
//                 );
//               }

//               return (
//                 <div
//                   key={idx}
//                   className="relative border rounded p-2 text-center"
//                 >
//                   {preview}

//                   <button
//                     type="button"
//                     onClick={() =>
//                       setAttachments((prev) => prev.filter((_, i) => i !== idx))
//                     }
//                     className="absolute top-1 right-1 text-white bg-red-600 px-2 py-0.5 text-xs rounded hover:bg-red-700"
//                     title="Remove"
//                   >
//                     ×
//                   </button>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       <div className="mt-6 flex gap-4">
//         <button
//           onClick={handleSubmit}
//           disabled={submitting}
//           className={`px-4 py-2 rounded text-white ${
//             submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-500"
//           }`}
//         >
//           {submitting ? "Saving..." : editId ? "Update Order" : "Create Order"}
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialOrderState);
//             router.push("/admin/salesOrder");
//           }}
//           className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-400"
//         >
//           Cancel
//         </button>
//       </div>
//     </div>
//   );
// }

// "use client";

// import React, { useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { Suspense } from "react";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const initialOrderState = {
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
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
//       receivedQuantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       taxOption: "GST",
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       gstRate: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//       managedBy: "",
//       batches: [],
//       errorMessage: "",
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//       warehouseId: "",
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
//   return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
// }

// async function fetchManagedBy(itemId) {
//   if (!itemId) {
//     console.warn("fetchManagedBy called with undefined itemId");
//     return "";
//   }

//   try {
//     const res = await axios.get(`/api/items/${itemId}`);
//     return res.data.managedBy;
//   } catch (error) {
//     console.error("Error fetching managedBy for item", itemId, error);
//     return "";
//   }
// }

// function SalesOrderFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
//       <SalesOrderForm />
//     </Suspense>
//   );
// }

// function SalesOrderForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [isCopied, setIsCopied] = useState(false);
//   const [formData, setFormData] = useState(initialOrderState);

//   useEffect(() => {
//     const calcTotals = () => {
//       const totalBeforeDiscount = formData.items.reduce((acc, item) => acc + (item.unitPrice - item.discount) * item.quantity, 0);
//       const totalItems = formData.items.reduce((acc, item) => acc + item.totalAmount, 0);
//       const gstTotal = formData.items.reduce((acc, item) => acc + (item.taxOption === "IGST" ? item.igstAmount : item.gstAmount), 0);
//       const freight = parseFloat(formData.freight) || 0;
//       const rounding = parseFloat(formData.rounding) || 0;
//       const downPayment = parseFloat(formData.totalDownPayment) || 0;
//       const applied = parseFloat(formData.appliedAmounts) || 0;
//       const grandTotal = totalItems + gstTotal + freight + rounding;
//       const openBalance = grandTotal - (downPayment + applied);

//       setFormData(prev => ({
//         ...prev,
//         totalBeforeDiscount,
//         gstTotal,
//         grandTotal,
//         openBalance,
//       }));
//     };
//     calcTotals();
//   }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

//   useEffect(() => {
//     const storedData = sessionStorage.getItem("salesOrderData");
//     if (storedData) {
//       (async () => {
//         try {
//           const parsed = JSON.parse(storedData);
//           parsed.items = await Promise.all(
//             parsed.items.map(async (item, idx) => {
//               const itemId = item.item || item.item?._id || item.item || "";
//               console.log(`Processing item[${idx}]`, itemId);
//               const managedBy = await fetchManagedBy(itemId);
//               return { ...item, managedBy: managedBy || "batch" };
//             })
//           );
//           setFormData(parsed);
//           setIsCopied(true);
//           sessionStorage.removeItem("salesOrderData");
//         } catch (e) {
//           console.error("Error parsing salesOrderData", e);
//         }
//       })();
//     }
//   }, []);

//   useEffect(() => {
//     if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
//       setLoading(true);
//       axios.get(`/api/sales-order/${editId}`)
//         .then(res => {
//           const record = res.data.data;
//           setFormData({
//             ...record,
//             customer: record.customer?._id || record.customer || "",
//             postingDate: formatDateForInput(record.postingDate),
//             validUntil: formatDateForInput(record.validUntil),
//             documentDate: formatDateForInput(record.documentDate),
//             items: record.items.map((item) => ({
//               ...item,
//               item: item.item?._id || item.item || "",
//               warehouse: item.warehouse?._id || item.warehouse || "",
//             }))
//           });
//         })
//         .catch(err => setError(err.response?.data?.error || err.message))
//         .finally(() => setLoading(false));
//     }
//   }, [editId]);

//   const handleCustomerSelect = useCallback((selectedCustomer) => {
//     setFormData(prev => ({
//       ...prev,
//       customer: selectedCustomer._id || "",
//       customerCode: selectedCustomer.customerCode || "",
//       customerName: selectedCustomer.customerName || "",
//       contactPerson: selectedCustomer.contactPersonName || "",
//     }));
//   }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   }, []);

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData(prev => {
//       const items = [...prev.items];
//       items[index] = { ...items[index], [name]: value };
//       return { ...prev, items };
//     });
//   }, []);

//   const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);

//   const addItemRow = useCallback(() => {
//     setFormData(prev => ({
//       ...prev,
//       items: [...prev.items, { ...initialOrderState.items[0] }],
//     }));
//   }, []);

//   const handleSubmit = async () => {
//     try {
//       // const updatedItems = await Promise.all(
//       //   formData.items.map(async (item) => {
//       //     const itemId = item.itemId || item.item?._id || item.item || "";
//       //     const managedByValue = await fetchManagedBy(itemId);
//       //     return { ...item, managedBy: managedByValue || "batch" };
//       //   })
//       // );
//       const updatedFormData = { ...formData};

//       if (editId) {
//         await axios.put(`/api/sales-order/${editId}`, updatedFormData);
//         toast.success("Sales Order updated successfully");
//       } else {
//         await axios.post("/api/sales-order", updatedFormData);
//         toast.success("Sales Order added successfully");
//         setFormData(initialOrderState);
//       }
//       router.push("/admin/sales-order-view");
//     } catch (err) {
//       console.error("Submit error:", err);
//       toast.error(editId ? "Failed to update Sales Order" : "Failed to add Sales Order");
//     }
//   };

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">
//         {editId ? "Edit Sales Order" : "Create Sales Order"}
//       </h1>
//       {/* Customer Section */}
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             {isCopied ? (
//               <div>
//                 <label className="block mb-2 font-medium">Customer Name</label>
//                 <input
//                   type="text"
//                   name="customerName"
//                   value={formData.customerName || ""}
//                   onChange={handleInputChange}
//                   placeholder="Enter customer name"
//                   className="w-full p-2 border rounded"
//                 />
//               </div>
//             ) : (
//               <div>
//                 <label className="block mb-2 font-medium">Customer Name</label>
//                 <CustomerSearch onSelectCustomer={handleCustomerSelect} />
//               </div>
//             )}
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
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
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
//             <label className="block mb-2 font-medium">Order Date</label>
//             <input
//               type="date"
//               name="orderDate"
//               value={formData.orderDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">
//               Expected Delivery Date
//             </label>
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
//         <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}

//               onRemoveItem={removeItemRow}

//           setFormData={setFormData}
//         />
//       </div>

//       {/* Remarks & Sales Employee */}
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
//           <label className="block mb-2 font-medium">Total Before Discount</label>
//           <input
//             type="number"
//             value={formData.totalBeforeDiscount.toFixed(2)}
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
//             value={(formData.gstTotal ?? 0).toFixed(2)}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Grand Total</label>
//           <input
//             type="number"
//             value={(formData.grandTotal ?? 0).toFixed(2)}
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
//             setFormData(initialOrderState);
//             router.push("/admin/salesOrder");
//           }}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={() => {
//             sessionStorage.setItem("salesOrderData", JSON.stringify(formData));
//             alert("Data copied from Sales Order!");
//           }}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Copy From
//         </button>
//       </div>

//       <ToastContainer />
//     </div>
//   );
// }
// export default SalesOrderFormWrapper;
