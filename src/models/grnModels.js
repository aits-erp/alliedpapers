import mongoose from 'mongoose';

// Batch sub-schema
const BatchSchema = new mongoose.Schema({
  batchNumber: { type: String },
  expiryDate: { type: Date },
  manufacturer: { type: String },
  batchQuantity: { type: Number, default: 0 },
}, { _id: false });

// Quality Check sub-schema
const QualityCheckDetailSchema = new mongoose.Schema({
  parameter: { type: String },
  min: { type: Number },
  max: { type: Number },
  actualValue: { type: Number },
}, { _id: false });

// GRN item schema
const GRNItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  itemCode: { type: String },
  itemName: { type: String },
  itemDescription: { type: String },
  quantity: { type: Number, default: 0 },
  allowedQuantity: { type: Number, default: 0 },
  receivedQuantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  freight: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 }, // ✅ FIXED: added igstRate
  taxOption: { type: String, enum: ['GST', 'IGST'], default: 'GST' },
  priceAfterDiscount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  managedBy: { type: String, default: 'batch' },
  batches: { type: [BatchSchema], default: [] },
    qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    warehouseName: { type: String },
    warehouseCode: { type: String },
    stockAdded: { type: Boolean, default: false },
  errorMessage: { type: String }
}, { _id: false });

// Full GRN schema
const GRNSchema = new mongoose.Schema({
  purchaseOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
   // ✅ RECOMMENDED: ensure every GRN is linked to a PO
  },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierCode: { type: String },
  supplierName: { type: String },
  contactPerson: { type: String },
  refNumber: { type: String },
   documentNumber: { type: String, unique: true },
  status: { type: String, default: 'Received' },
  postingDate: { type: Date },
  validUntil: { type: Date },
  documentDate: { type: Date },
  items: { type: [GRNItemSchema], default: [] },
  qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
  salesEmployee: { type: String },
  remarks: { type: String },
  freight: { type: Number, default: 0 },
  rounding: { type: Number, default: 0 },
  totalBeforeDiscount: { type: Number, default: 0 },
  gstTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 }
}, { timestamps: true });

// Pre-save hook to generate document number
GRNSchema.pre("save", async function (next) {
  if (!this.documentNumber) {
    try {
      const counter = await mongoose.model('Counter').findOneAndUpdate(
        { id: "GRN" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.documentNumber = `GRN-${String(counter.seq).padStart(3, "0")}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});
// Export model
export default mongoose.models.GRN || mongoose.model("GRN", GRNSchema);






// import mongoose from 'mongoose';

// const BatchSchema = new mongoose.Schema({
//   batchNumber: { type: String },
//   expiryDate: { type: Date },
//   manufacturer: { type: String },
//   batchQuantity: { type: Number, default: 0 },
// }, { _id: false });

// const QualityCheckDetailSchema = new mongoose.Schema({
//   parameter: { type: String },
//   min: { type: Number },
//   max: { type: Number },
//   actualValue: { type: Number },
// }, { _id: false });

// const GRNItemSchema = new mongoose.Schema({
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
//   itemCode: { type: String },
//   itemName: { type: String },
//   itemDescription: { type: String },
//   quantity: { type: Number, default: 0 },
//   allowedQuantity: { type: Number, default: 0 },
//   receivedQuantity: { type: Number, default: 0 },
//   unitPrice: { type: Number, default: 0 },
//   discount: { type: Number, default: 0 },
//   freight: { type: Number, default: 0 },
//   gstRate: { type: Number, default: 0 },
//   taxOption: { type: String, enum: ['GST', 'IGST'], default: 'GST' },
//   priceAfterDiscount: { type: Number, default: 0 },
//   totalAmount: { type: Number, default: 0 },
//   gstAmount: { type: Number, default: 0 },
//   cgstAmount: { type: Number, default: 0 },
//   sgstAmount: { type: Number, default: 0 },
//   igstAmount: { type: Number, default: 0 },
//   managedBy: { type: String, default: 'batch' },
//   batches: { type: [BatchSchema], default: [] },
//   errorMessage: { type: String }
// }, { _id: false });

// const GRNSchema = new mongoose.Schema({
//   purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
//   supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
//   supplierCode: { type: String },
//   supplierName: { type: String },
//   contactPerson: { type: String },
//   refNumber: { type: String },
//   status: { type: String, default: 'Received' },
//   postingDate: { type: Date },
//   validUntil: { type: Date },
//   documentDate: { type: Date },
//   items: { type: [GRNItemSchema], default: [] },
//   qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
//   salesEmployee: { type: String },
//   remarks: { type: String },
//   freight: { type: Number, default: 0 },
//   rounding: { type: Number, default: 0 },
//   totalBeforeDiscount: { type: Number, default: 0 },
//   gstTotal: { type: Number, default: 0 },
//   grandTotal: { type: Number, default: 0 }
// }, { timestamps: true });

// export default mongoose.models.GRN || mongoose.model("GRN", GRNSchema);




// import mongoose from 'mongoose';

// const GRNItemSchema = new mongoose.Schema({
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
//   itemCode: { type: String },
//   itemName: { type: String },
//   itemDescription: { type: String },
//   quantity: { type: Number, default: 0 },
//   unitPrice: { type: Number, default: 0 },
//   discount: { type: Number, default: 0 },
//   freight: { type: Number, default: 0 },
//   gstType: { type: Number, default: 0 },
//   priceAfterDiscount: { type: Number, default: 0 },
//   totalAmount: { type: Number, default: 0 },
//   gstAmount: { type: Number, default: 0 },
//   tdsAmount: { type: Number, default: 0 },
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
//   warehouseName: { type: String },
//   warehouseCode: { type: String },
//   stockAdded: { type: Boolean, default: false },
//   pendingQuantity: { type: Number, default: 0 },  // New field for pending quantity
// }, { _id: false });

// const GRNSchema = new mongoose.Schema({
//   supplierCode: { type: String },
//   supplierName: { type: String },
//   contactPerson: { type: String },
//   refNumber: { type: String },
//   status: { type: String, default: "Received" },
//   postingDate: { type: Date },
//   documentDate: { type: Date },
//   items: [GRNItemSchema],
//   remarks: { type: String },
//   stockAdded: { type: Boolean, default: false },
//   purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' }, // New field for PO reference
// }, {
//   timestamps: true,
// });

// export default mongoose.models.GRN || mongoose.model('GRN', GRNSchema);

