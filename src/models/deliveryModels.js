import mongoose from "mongoose";

// Schema for batch details
const BatchSchema = new mongoose.Schema({
  batchCode: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  manufacturer: { type: String, required: true },
  allocatedQuantity: { type: Number, required: true },
  availableQuantity: { type: Number, required: true }
});

// Schema for each delivery item (same as the Sales Order item)
const ItemSchema = new mongoose.Schema({
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
         
 
     batches: [BatchSchema],
     managedByBatch: { type: Boolean, default: true },
  
     removalReason: { type: String },
});

// Schema for the overall delivery
const DeliverySchema = new mongoose.Schema({
  // Reference to the original Sales Order (if copied)
  salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder" },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerCode: { type: String, required: true },
  customerName: { type: String, required: true },
  contactPerson: { type: String},
  refNumber: { type: String },
  salesEmployee: { type: String },
  status: { type: String, enum: ["Pending", "Confirmed"], default: "Pending" },
  orderDate: { type: Date },
  expectedDeliveryDate: { type: Date },
  items: [ItemSchema],
  remarks: { type: String },
  freight: { type: Number, default: 0 },
  rounding: { type: Number, default: 0 },
  totalDownPayment: { type: Number, default: 0 },
  appliedAmounts: { type: Number, default: 0 },
  totalBeforeDiscount: { type: Number, required: true },
  gstTotal: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  openBalance: { type: Number, required: true },
  fromQuote: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Delivery || mongoose.model("Delivery", DeliverySchema);



// import mongoose from 'mongoose';

// const ItemSchema = new mongoose.Schema({
//   itemCode: { type: String },
//   itemName:{type: String},
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
// });

// const SalesDeliverySchema = new mongoose.Schema({
//   supplierCode: { type: String },
//   supplierName: { type: String },
//   contactPerson: { type: String },
//   refNumber: { type: String },
//   status: { 
//     type: String, 
//     enum: ["Pending", "Partially Delivered", "Delivered"],
//     default: "Pending"
//   },
//   postingDate: { type: Date },
//   validUntil: { type: Date },
//   documentDate: { type: Date },
//   items: [ItemSchema],
//   salesEmployee: { type: String },
//   remarks: { type: String },
//   freight: { type: Number, default: 0 },
//   rounding: { type: Number, default: 0 },
//   totalBeforeDiscount: { type: Number, default: 0 },
//   totalDownPayment: { type: Number, default: 0 },
//   appliedAmounts: { type: Number, default: 0 },
//   gstTotal: { type: Number, default: 0 },
//   grandTotal: { type: Number, default: 0 },
//   openBalance: { type: Number, default: 0 },
// }, {
//   timestamps: true,
// });

// export default mongoose.models.SalesDelivery || mongoose.model('SalesDelivery', SalesDeliverySchema);