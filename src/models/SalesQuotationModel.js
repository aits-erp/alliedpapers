import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
 {
     item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
     itemCode: { type: String },
     itemName: { type: String },
     itemDescription: { type: String },
     quantity: { type: Number, default: 0 },
     orderedQuantity: { type: Number, default: 0 },
     unitPrice: { type: Number, default: 0 },
     discount: { type: Number, default: 0 },
     freight: { type: Number, default: 0 },
     gstRate: { type: Number, default: 0 },
     taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
     priceAfterDiscount: { type: Number, default: 0 },
     totalAmount: { type: Number, default: 0 },
     gstAmount: { type: Number, default: 0 },
     cgstAmount: { type: Number, default: 0 },
     sgstAmount: { type: Number, default: 0 },
     igstAmount: { type: Number, default: 0 },
     tdsAmount: { type: Number, default: 0 },
     warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
     warehouseName: { type: String },
     warehouseCode: { type: String },
     stockAdded: { type: Boolean, default: false },
     managedBy: { type: String },
 
  
     removalReason: { type: String },
   },
);

const SalesQuotationSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerCode: { type: String, required: true },
    customerName: { type: String, required: true },
    contactPerson: { type: String },
    refNumber: { type: String },
    status: { type: String, default: "Open" },
    postingDate: { type: Date },
    validUntil: { type: Date },
    documentDate: { type: Date },
    items: [ItemSchema],
    salesEmployee: { type: String },
    remarks: { type: String },
    freight: { type: Number, default: 0 },
    rounding: { type: Number, default: 0 },
    totalBeforeDiscount: { type: Number, default: 0 },
    totalDownPayment: { type: Number, default: 0 },
    appliedAmounts: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    openBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.SalesQuotation ||
  mongoose.model("SalesQuotation", SalesQuotationSchema);
