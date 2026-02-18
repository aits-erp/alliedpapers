// import supplier from "@/app/(dashboard)/admin/supplier/page";
// import mongoose from "mongoose";

// // Schema for batch details.
// const BatchSchema = new mongoose.Schema({
//   batchCode: { type: String, required: true },
//   expiryDate: { type: Date, required: true },
//   manufacturer: { type: String, required: true },
//   allocatedQuantity: { type: Number, required: true },
//   availableQuantity: { type: Number, required: true }
// });

// // Schema for each item in the debit note.
// const ItemSchema = new mongoose.Schema({
//   item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
//   item: { type: String, required: true },
//   itemCode: { type: String, required: true },
//   itemName: { type: String, required: true },
//   itemDescription: { type: String, required: true },
//   quantity: { type: Number, required: true }, // Total quantity for the item.
//   allowedQuantity: { type: Number, default: 0 },
//   unitPrice: { type: Number, required: true },
//   discount: { type: Number, default: 0 },
//   freight: { type: Number, default: 0 },
//   gstType: { type: Number, default: 0 },
//   priceAfterDiscount: { type: Number, required: true },
//   totalAmount: { type: Number, required: true },
//   gstAmount: { type: Number, required: true },
//   tdsAmount: { type: Number, required: true },
//   batches: [BatchSchema],
//   warehouse: { type: String, required: true },
//   warehouseName: { type: String, required: true },
//   warehouseCode: { type: String, required: true },
//   errorMessage: { type: String },
//   taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
//   igstAmount: { type: Number, default: 0 },
//   managedByBatch: { type: Boolean, default: true }
// });

// // Schema for the overall Debit Note.
// const DebitNoteSchema = new mongoose.Schema({
//   // Polymorphic reference to a Sales Order or Delivery (if this debit note is copied).
//   sourceId: { type: mongoose.Schema.Types.ObjectId, refPath: "sourceModel" },
//   sourceModel: { type: String, enum: ["SalesOrder", "Delivery"] },
  
//   // Supplier-related fields.
//   supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },  
//   supplierCode: { type: String, required: true },
//   supplierName: { type: String, required: true },
//   supplierContact: { type: String, required: true },
  
//   refNumber: { type: String }, // Debit Note Number.
//   salesEmployee: { type: String },
//   status: { type: String, enum: ["Pending", "Confirmed"], default: "Pending" },
  
//   // Date fields.
//   postingDate: { type: Date },
//   validUntil: { type: Date },
//   documentDate: { type: Date },
  
//   items: [ItemSchema],
//   remarks: { type: String },
//   freight: { type: Number, default: 0 },
//   rounding: { type: Number, default: 0 },
//   totalDownPayment: { type: Number, default: 0 },
//   appliedAmounts: { type: Number, default: 0 },
//   totalBeforeDiscount: { type: Number, required: true },
//   gstTotal: { type: Number, required: true },
//   grandTotal: { type: Number, required: true },
//   openBalance: { type: Number, required: true },
//   fromQuote: { type: Boolean, default: false },
//   createdAt: { type: Date, default: Date.now }
// });

// export default mongoose.models.DebitNote || mongoose.model("DebitNote", DebitNoteSchema);

import mongoose from 'mongoose';

/* ----------- BATCH (all fields now optional) ----------- */
const BatchSchema = new mongoose.Schema(
  {
    batchCode:         { type: String },          // no longer required
    expiryDate:        { type: Date   },
    manufacturer:      { type: String },
    allocatedQuantity: { type: Number, default: 0 },
    availableQuantity: { type: Number, default: 0 },
  },
  { _id: false }
);

/* ------------- ITEM (unchanged except dup fix) -------- */
const ItemSchema = new mongoose.Schema({
  item:              { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemCode:          { type: String  },
  itemName:          { type: String  },
  itemDescription:   { type: String  },

  quantity:          { type: Number  },
  allowedQuantity:   { type: Number,  default: 0 },

  unitPrice:         { type: Number  },
  discount:          { type: Number,  default: 0 },
  freight:           { type: Number,  default: 0 },
  gstType:           { type: Number,  default: 0 },

  priceAfterDiscount:{ type: Number  },
  totalAmount:       { type: Number  },
  gstAmount:         { type: Number  },
  tdsAmount:         { type: Number,  default: 0 },

  batches:           [BatchSchema],

  warehouse:         { type: String  },
  warehouseName:     { type: String  },
  warehouseCode:     { type: String  },
  errorMessage:      { type: String  },

  taxOption:         { type: String, enum: ['GST', 'IGST'], default: 'GST' },
  igstAmount:        { type: Number,  default: 0 },
  managedByBatch:    { type: Boolean, default: true },
});

/* -------------- DEBIT NOTE ----------------------------- */
const DebitNoteSchema = new mongoose.Schema({
  sourceId:    { type: mongoose.Schema.Types.ObjectId, refPath: 'sourceModel' },
  sourceModel: { type: String, enum: ['SalesOrder', 'Delivery'] },

  supplier:        { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierCode:    { type: String },
  supplierName:    { type: String },
  supplierContact: { type: String },                    // no longer required
  documentNumber: { type: String, unique: true }, // Unique document number for the debit note
  refNumber:    { type: String },
  salesEmployee:{ type: String },

  status:       {                         // now accepts “Received”
    type: String,
    enum: ['Pending', 'Confirmed', 'Received'],
    default: 'Pending',
  },

  postingDate:  { type: Date },
  validUntil:   { type: Date },
  documentDate: { type: Date },

  items:        [ItemSchema],

  remarks:      { type: String },
  freight:      { type: Number, default: 0 },
  rounding:     { type: Number, default: 0 },
  totalDownPayment:{ type: Number, default: 0 },
  appliedAmounts:  { type: Number, default: 0 },

  totalBeforeDiscount:{ type: Number },
  gstTotal:     { type: Number },
  grandTotal:   { type: Number },
  openBalance:  { type: Number },

  fromQuote:    { type: Boolean, default: false },
  createdAt:    { type: Date,    default: Date.now },
});
// Pre-save hook to debit document number
DebitNoteSchema.pre('save', async function (next) {
  if (!this.documentNumber) {
    const lastNote = await this.constructor.findOne().sort({ createdAt: -1 });
    const lastNumber = lastNote ? parseInt(lastNote.documentNumber.split('-')[1]) : 0;
    this.documentNumber = `DN-${lastNumber + 1}`;
  }
  next();
});

// DebitNoteSchema.pre("save", async function (next) {
//   if (!this.documentNumber) {
//     try {
//       const counter = await mongoose.model('Counter').findOneAndUpdate(
//         { id: "DebitNote" },
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true }
//       );
//       this.documentNumber = `DN-${String(counter.seq).padStart(3, "0")}`;
//     } catch (error) {
//       return next(error);
//     }
//   }
//   next();
// });

// DebitNoteSchema.pre("save", async function (next) {
//   if (!this.documentNumber) {
//     try {
//       const counter = await mongoose.model('Counter').findOneAndUpdate(
//         { id: "DebitNote" },
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true }
//       );

//       this.documentNumber = `DN-${String(counter.seq).padStart(3, "0")}`;
//     } catch (error) {
//       return next(error);
//     }
//   }
//   next();
// });

export default mongoose.models.DebitNote ||
       mongoose.model('DebitNote', DebitNoteSchema);
