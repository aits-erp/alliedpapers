


// --- models/Customer.js ---
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  address1: { type: String, trim: true },
  address2: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  zip: {
    type: String,
    trim: true,
    match: [/^[0-9]{6}$/, "Invalid zip code format"]
  },
  country: { type: String, trim: true }
}, { _id: false });

const customerSchema = new mongoose.Schema({
  customerCode: {
    type: String,

    trim: true,
    
  },
  customerName: {
    type: String,
    required: [true, "Customer name is required"],
    trim: true
  },
  customerGroup: {
    type: String,
    // required: [true, "Customer group is required"],
    // trim: true
  },
  customerType: {
    type: String,
    // required: [true, "Customer type is required"],
    // enum: ['Individual', 'Business', 'Government'],
    // default: 'Individual'
  },
  emailId: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Invalid email format"]
  },
  fromLead: { type: String, trim: true },
  mobileNumber: {
    type: String,
    match: [/^[0-9]{10}$/, "Invalid mobile number format"]
  },
  fromOpportunity: { type: String, trim: true },
  billingAddresses: [addressSchema],
  shippingAddresses: [addressSchema],
  paymentTerms: { type: String, trim: true },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST format"]
  },
  gstCategory: {
    type: String,
    // trim: true,
  //   enum:[
  //   "Registered Regular",
  //   "Registered Composition",
  //   "Unregistered",
  //   "SEZ",
  //   "Overseas",
  //   "Deemed Export",
  //   "UIN Holders",
  //   "Tax Deductor",
  //   "Tax Collector",
  //   "Input Service Distributor"
  // ]
  },
  pan: {
    type: String,
    required: [true, "PAN is required"],
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"]
  },
  contactPersonName: { type: String, trim: true },
  commissionRate: { type: String, trim: true },
  // glAccount: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "BankHead",
  //   // required: [true, "GL BankHead is required"]
  // },
  salesEmployee: { type: String }, // from "SALES PERON NAME"
  zone: { type: String },          // from "REGION"
}, {
  timestamps: true,
  collection: "customers"
});

customerSchema.index({ customerCode: 1 });
customerSchema.index({ emailId: 1 });
customerSchema.index({ mobileNumber: 1 });

customerSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    next(new Error(`${field} already exists`));
  } else {
    next(error);
  }
});

const Customer = mongoose.models.Customer || mongoose.model("Customer", customerSchema);
export default Customer;



