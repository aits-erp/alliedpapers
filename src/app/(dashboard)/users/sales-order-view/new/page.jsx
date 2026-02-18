




"use client";

// --------------------------------------------------
// SalesOrderPage — full React client component (Next-13/14)
// • Company login (token.type === "company" && companyName) OR roles.includes("admin")
//   ⇒ full edit rights
// • Other users ⇒ when editing (editId present) only Status + Sales Stage may change
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
  const pad = round(price - disc);
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
  const [canEditStageOnly, setCanEditStageOnly] = useState(false);








  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const d = jwtDecode(token);
      const roles = Array.isArray(d?.roles) ? d.roles : [];
      const roleStr = d?.role ?? d?.userRole ?? null;
      const isCompany = d?.type === "company" && !!d?.companyName;
      const loweredRoles = roles.map((r) => r.toLowerCase());
      const isAdminRole = roleStr?.toLowerCase() === "admin" || loweredRoles.includes("admin");
      const isSalesManager = loweredRoles.includes("sales manager");
      setIsAdmin(isCompany || isAdminRole);
      setCanEditStageOnly(!isCompany && !isAdminRole && isSalesManager);
    } catch (e) {
      console.error("JWT decode error", e);
    }
  }, []);

  // `isReadOnly` is true if it's an existing order AND the user is neither an admin nor a sales manager.
  const isReadOnly = !!editId && !isAdmin && !canEditStageOnly;

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

  //   const gstTotal = items.reduce((s, i) => s + (parseFloat(i.gstAmount) || 0), 0);
  //   const igstTotal = items.reduce((s, i) => s + (parseFloat(i.igstAmount) || 0), 0);
  //    console.log("igstTotal", igstTotal);
  //   const freight = parseFloat(formData.freight) || 0;

  //   const unroundedTotal = totalBefore + gstTotal + igstTotal + freight;
  //   const roundedTotal = Math.round(unroundedTotal);
  //   const rounding = +(roundedTotal - unroundedTotal).toFixed(2);
  //   const grandTotal = roundedTotal;

  //   const dp = parseFloat(formData.totalDownPayment) || 0;
  //   const ap = parseFloat(formData.appliedAmounts) || 0;
  //   const openBalance = grandTotal - (dp + ap);

  //   setFormData((p) => ({
  //     ...p,
  //     totalBeforeDiscount: round(totalBefore),
  //     gstTotal: round(gstTotal),
  //     igstTotal: round(igstTotal),
  //     grandTotal: round(grandTotal),
  //     rounding, // derived
  //     openBalance: round(openBalance),
  //   }));
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [JSON.stringify(formData.items), formData.freight, formData.totalDownPayment, formData.appliedAmounts]);



      useEffect(() => {
      const items = formData.items || [];
      const totalBefore = items.reduce((s, i) => {
        const up = parseFloat(i.unitPrice) || 0;
        const qty = parseFloat(i.quantity) || 0;
        const disc = parseFloat(i.discount) || 0;
        return s + (up * qty - disc);
      }, 0);
  
      const gstTotal = items.reduce((s, i) => s + (parseFloat(i.gstAmount) || 0), 0);
      const igstTotal = items.reduce((s, i) => s + (parseFloat(i.igstAmount) || 0), 0);
  
      const freight = parseFloat(formData.freight) || 0;
  
      const unroundedTotal = totalBefore + gstTotal + igstTotal + freight;
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [(formData.items), formData.freight, formData.totalDownPayment, formData.appliedAmounts]);
  



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
      contactPerson: c.contactPersonName,
      // reset addresses for a new customer
      billingAddress: { ...emptyAddress },
      shippingAddress: { ...emptyAddress },
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
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
  // ✅ Item validation
if (!formData.items.length) {
  toast.error("Please add at least one item");
  return;
}

const invalidItem = formData.items.find(
  (i) => !i.itemName || i.itemName.trim() === ""
);

if (invalidItem) {
  toast.error("Please select Item Name for all rows");
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

      router.push("/users/sales-order-view");
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
            value={formData.contactPerson}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={isReadOnly ? ro : base}
          />
        </div>

        {/* Reference No. */}
        <div>
          <label className="font-medium">Reference No.</label>
          <input
            name="refNumber"
            value={formData.refNumber}
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
          <label className="font-medium block">Billing Address</label>
          {(!customBilling && !isReadOnly && !!selectedCustomer) ? (
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
                        updateAddressField("billingAddress", "country", e.target.value)
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

          {!isReadOnly && selectedCustomer && (
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
          <label className="font-medium block">Shipping Address</label>
          {(!customShipping && !isReadOnly && !!selectedCustomer) ? (
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
                        updateAddressField("shippingAddress", "country", e.target.value)
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

          {!isReadOnly && selectedCustomer && (
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
            disabled={isReadOnly}
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
      {/* <div className="grid grid-cols-1 md-grid-cols-2 md:grid-cols-2 gap-4 mt-6">
        {[
          ["Total Before Discount", "totalBeforeDiscount", true],
          ["GST Total", "gstTotal", true],
          ["IGST Total", "igstTotal", true],
          ["Freight", "freight", false],
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
      </div> */}


          <div className="grid grid-cols-1 md-grid-cols-2 md:grid-cols-2 gap-4 mt-6">
        {[
          ["Total Before Discount", "totalBeforeDiscount", true],
          ["GST Total", "gstTotal", true],
          ["IGST Total", "igstTotal", true],
          ["Freight", "freight", false],
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

