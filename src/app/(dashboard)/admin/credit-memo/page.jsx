"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";
import CustomerSearch from "@/components/CustomerSearch";
import ItemSection from "@/components/ItemSection";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Initial Credit Note state.
const initialCreditNoteState = {
  _id: "",
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "", // Credit Note Number.
  salesEmployee: "",
  status: "Pending",
  postingDate: "",
  validUntil: "",
  documentDate: "",
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
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      managedBy: "", // will be set via item master (if "batch", then show batch details)
      batches: [],
      errorMessage: "",
      taxOption: "GST",
      managedByBatch: true,
    },
  ],
  remarks: "",
  freight: 0,
  rounding: 0,
  totalBeforeDiscount: 0,
  gstTotal: 0,
  grandTotal: 0,
  openBalance: 0,
  fromQuote: false,
};

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
}

/* 
  New BatchModal component – allows manual entry/editing of batch details.
  It displays the current batch entries (if any), allows you to add a new entry,
  and then save & close the modal.
*/
function BatchModal({ batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName, unitPrice }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-2">
          Batch Details for {itemCode} - {itemName}
        </h2>
        <p className="mb-4 text-sm text-gray-600">Unit Price: {unitPrice}</p>
        {batches && batches.length > 0 ? (
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
              {batches.map((batch, idx) => (
                <tr key={idx}>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={batch.batchNumber || ""}
                      onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="date"
                      value={batch.expiryDate || ""}
                      onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={batch.manufacturer || ""}
                      onChange={(e) => onBatchEntryChange(idx, "manufacturer", e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={batch.batchQuantity || 0}
                      onChange={(e) => onBatchEntryChange(idx, "batchQuantity", e.target.value)}
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
        <button
          type="button"
          onClick={onAddBatchEntry}
          className="px-4 py-2 bg-green-500 text-white rounded mb-4"
        >
          Add Batch Entry
        </button>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CreditNoteFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <CreditNoteForm />
    </Suspense>
  );
}



 function CreditNoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentRef = useRef(null);
  const [isCopied, setIsCopied] = useState(false);
  const editId = searchParams.get("editId");
  const [formData, setFormData] = useState(initialCreditNoteState);
  // modalItemIndex holds the index of the item for which the batch modal is open.
  const [modalItemIndex, setModalItemIndex] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Summary Calculation Effect.
  useEffect(() => {
    const totalBeforeDiscountCalc = formData.items.reduce((acc, item) => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      return acc + (unitPrice - discount) * quantity;
    }, 0);

    const totalItemsCalc = formData.items.reduce(
      (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
      0
    );

    const gstTotalCalc = formData.items.reduce((acc, item) => {
      if (item.taxOption === "IGST") {
        return acc + (parseFloat(item.igstAmount) || 0);
      }
      return acc + (parseFloat(item.gstAmount) || 0);
    }, 0);

    const overallFreight = parseFloat(formData.freight) || 0;
    const roundingCalc = parseFloat(formData.rounding) || 0;
    const totalDownPaymentCalc = parseFloat(formData.totalDownPayment) || 0;
    const appliedAmountsCalc = parseFloat(formData.appliedAmounts) || 0;

    const grandTotalCalc = totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
    const openBalanceCalc = grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);

    if (
      totalBeforeDiscountCalc !== formData.totalBeforeDiscount ||
      gstTotalCalc !== formData.gstTotal ||
      grandTotalCalc !== formData.grandTotal ||
      openBalanceCalc !== formData.openBalance
    ) {
      setFormData((prev) => ({
        ...prev,
        totalBeforeDiscount: totalBeforeDiscountCalc,
        gstTotal: gstTotalCalc,
        grandTotal: grandTotalCalc,
        openBalance: openBalanceCalc,
      }));
    }
  }, [
    formData.items,
    formData.freight,
    formData.rounding,
    formData.totalDownPayment,
    formData.appliedAmounts,
    formData.totalBeforeDiscount,
    formData.gstTotal,
    formData.grandTotal,
    formData.openBalance,
  ]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCustomerSelect = useCallback((selectedCustomer) => {
    setFormData((prev) => ({
      ...prev,
      customerCode: selectedCustomer.customerCode || "",
      customerName: selectedCustomer.customerName || "",
      contactPerson: selectedCustomer.contactPersonName || "",
    }));
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
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          managedBy: "",
          batches: [],
          errorMessage: "",
          taxOption: "GST",
          managedByBatch: true,
        },
      ],
    }));
  }, []);

  // When an item is selected, fetch its managedBy if needed and compute derived values.
  const handleItemSelect = useCallback(async (index, selectedItem) => {
    if (!selectedItem._id) {
      toast.error("Selected item does not have a valid ID.");
      return;
    }
    let managedBy = selectedItem.managedBy;
    if (!managedBy || managedBy.trim() === "") {
      try {
        const res = await axios.get(`/api/items/${selectedItem._id}`);
        if (res.data.success) {
          managedBy = res.data.data.managedBy;
          console.log(`Fetched managedBy for ${selectedItem.itemCode}:`, managedBy);
        }
      } catch (error) {
        console.error("Error fetching item master details:", error);
        managedBy = "";
      }
    } else {
      console.log(`Using managedBy from selected item for ${selectedItem.itemCode}:`, managedBy);
    }
    const unitPrice = Number(selectedItem.unitPrice) || 0;
    const discount = Number(selectedItem.discount) || 0;
    const freight = Number(selectedItem.freight) || 0;
    const quantity = 1;
    const taxOption = selectedItem.taxOption || "GST";
    const gstRate = selectedItem.gstRate ? Number(selectedItem.gstRate) : 0;
    const priceAfterDiscount = unitPrice - discount;
    const totalAmount = quantity * priceAfterDiscount + freight;
    const cgstRate = selectedItem.cgstRate ? Number(selectedItem.cgstRate) : gstRate / 2;
    const sgstRate = selectedItem.sgstRate ? Number(selectedItem.sgstRate) : gstRate / 2;
    const cgstAmount = totalAmount * (cgstRate / 100);
    const sgstAmount = totalAmount * (sgstRate / 100);
    const gstAmount = cgstAmount + sgstAmount;
    const igstAmount = taxOption === "IGST" ? totalAmount * (gstRate / 100) : 0;
    const updatedItem = {
      item: selectedItem._id,
      itemCode: selectedItem.itemCode || "",
      itemName: selectedItem.itemName,
      itemDescription: selectedItem.description || "",
      unitPrice,
      discount,
      freight,
      gstRate,
      taxOption,
      quantity,
      priceAfterDiscount,
      totalAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      managedBy,
      // Only initialize batches if managedBy equals "batch"
      batches: managedBy && managedBy.trim().toLowerCase() === "batch" ? [] : [],
    };
    if (selectedItem.qualityCheckDetails && selectedItem.qualityCheckDetails.length > 0) {
      setFormData((prev) => ({
        ...prev,
        qualityCheckDetails: selectedItem.qualityCheckDetails,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        qualityCheckDetails: [
          { parameter: "Weight", min: "", max: "", actualValue: "" },
          { parameter: "Dimension", min: "", max: "", actualValue: "" },
        ],
      }));
    }
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], ...updatedItem };
      return { ...prev, items: updatedItems };
    });
  }, []);

  // Batch modal handlers.
  const openBatchModal = useCallback((index) => {
    setModalItemIndex(index);
    setShowBatchModal(true);
  }, []);

  const closeBatchModal = useCallback(() => {
    setShowBatchModal(false);
    setModalItemIndex(null);
  }, []);

  // In this modal, batch entries are updated directly via handleBatchEntryChange.
  const handleBatchEntryChange = useCallback((itemIndex, batchIndex, field, value) => {
    setFormData((prev) => {
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
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[modalItemIndex] };
      if (!currentItem.batches) currentItem.batches = [];
      const lastEntry = currentItem.batches[currentItem.batches.length - 1];
      if (
        lastEntry &&
        lastEntry.batchNumber === "" &&
        lastEntry.expiryDate === "" &&
        lastEntry.manufacturer === "" &&
        (lastEntry.batchQuantity === 0 || !lastEntry.batchQuantity)
      ) {
        return { ...prev, items: updatedItems };
      }
      currentItem.batches.push({
        batchNumber: "",
        expiryDate: "",
        manufacturer: "",
        batchQuantity: 0,
      });
      updatedItems[modalItemIndex] = currentItem;
      return { ...prev, items: updatedItems };
    });
  }, [modalItemIndex]);

  // Check for copied data from Sales Order/Delivery.
  useEffect(() => {
    if (typeof window !== "undefined") {
      let copiedData = null;
      const soData = sessionStorage.getItem("CreditData");
      const delData = sessionStorage.getItem("CreditNoteData");
      if (soData) {
        copiedData = JSON.parse(soData);
        sessionStorage.removeItem("CreditData");
      } else if (delData) {
        copiedData = JSON.parse(delData);
        sessionStorage.removeItem("CreditNoteData");
      }
      if (copiedData) {
        setFormData(copiedData);
        setIsCopied(true);
      }
    }
  }, []);

  useEffect(() => {
    if (editId) {
      axios
        .get(`/api/credit-note/${editId}`)
        .then((res) => {
          if (res.data.success) {
            const record = res.data.data;
            setFormData({
              ...record,
              postingDate: formatDateForInput(record.postingDate),
              validUntil: formatDateForInput(record.validUntil),
              documentDate: formatDateForInput(record.documentDate),
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching credit note for edit", err);
          toast.error("Error fetching credit note data");
        });
    }
  }, [editId]);

  const handleSubmit = async () => {
    try {
      if (formData._id) {
        await axios.put(`/api/credit-note/${formData._id}`, formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Credit Note updated successfully");
      } else {
        await axios.post("/api/credit-note", formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Credit Note added successfully");
        setFormData(initialCreditNoteState);
      }
      router.push("/admin/credit-note");
    } catch (error) {
      console.error("Error saving credit note:", error);
      toast.error(formData._id ? "Failed to update credit note" : "Error adding credit note");
    }
  };

  return (
    <div ref={parentRef} className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Edit Credit Note" : "Create Credit Note"}
      </h1>
      {/* Customer Section */}
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
            {isCopied ? (
              <div>
                <label className="block mb-2 font-medium">Customer Name</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName || ""}
                  onChange={handleInputChange}
                  placeholder="Enter customer name"
                  className="w-full p-2 border rounded"
                />
              </div>
            ) : (
              <div>
                <label className="block mb-2 font-medium">Customer Name</label>
                <CustomerSearch onSelectCustomer={handleCustomerSelect} />
              </div>
            )}
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
            <label className="block mb-2 font-medium">Credit Note Number</label>
            <input
              type="text"
              name="refNumber"
              value={formData.refNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        {/* Additional Credit Note Info */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
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
            <label className="block mb-2 font-medium">Posting Date</label>
            <input
              type="date"
              name="postingDate"
              value={formatDateForInput(formData.postingDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="dd-mm-yyyy"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Valid Until</label>
            <input
              type="date"
              name="validUntil"
              value={formatDateForInput(formData.validUntil)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="dd-mm-yyyy"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Document Date</label>
            <input
              type="date"
              name="documentDate"
              value={formatDateForInput(formData.documentDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="dd-mm-yyyy"
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
          onItemSelect={handleItemSelect}
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
      {/* Batch Modal Trigger – for items with managedByBatch true and managedBy = "batch" */}
      <div className="mb-8">
       {formData.items.map((item, index) =>
  item.item && item.managedByBatch ? (
    <div key={index} className="flex items-center justify-between border p-3 rounded mb-2">
      <div>
        <strong>{item.itemCode} - {item.itemName}</strong>
        <span className="ml-2 text-sm text-gray-600">(Unit Price: {item.unitPrice})</span>
      </div>
      <button
        type="button"
        onClick={() => openBatchModal(index)}
        className="px-3 py-1 bg-green-500 text-white rounded"
      >
        Set Batch Details
      </button>
    </div>
  ) : null
)}

      </div>
      {/* Batch Modal – allows manual entry of batch details */}
      {showBatchModal && modalItemIndex !== null && (
        <BatchModal
          batches={formData.items[modalItemIndex].batches}
          onBatchEntryChange={(batchIndex, field, value) =>
            handleBatchEntryChange(modalItemIndex, batchIndex, field, value)
          }
          onAddBatchEntry={addBatchEntry}
          onClose={closeBatchModal}
          itemCode={formData.items[modalItemIndex].itemCode}
          itemName={formData.items[modalItemIndex].itemName}
          unitPrice={formData.items[modalItemIndex].unitPrice}
        />
      )}
      {/* Sales Employee & Remarks */}
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
          <label className="block mb-2 font-medium">Total Before Discount</label>
          <input
            type="number"
            value={formData.totalBeforeDiscount.toFixed(2)}
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
          <label className="block mb-2 font-medium">GST Total</label>
          <input
            type="number"
            value={formData.gstTotal.toFixed(2)}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Grand Total</label>
          <input
            type="number"
            value={formData.grandTotal.toFixed(2)}
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
          {formData._id ? "Update" : "Add"}
        </button>
        <button
          onClick={() => {
            setFormData(initialCreditNoteState);
            router.push("/admin/credit-note");
          }}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            sessionStorage.setItem("creditNoteData", JSON.stringify(formData));
            alert("Data copied from Sales Order/Delivery!");
          }}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Copy From
        </button>
      </div>
      <ToastContainer />
    </div>
  );
}

export default CreditNoteFormWrapper;


