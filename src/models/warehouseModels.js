import mongoose from "mongoose";

const WarehouseSchema = new mongoose.Schema(
  {
    warehouseCode: { type: String, required: true, unique: true },
    warehouseName: { type: String, required: true },
    parentWarehouse: { type: String },
    account: { type: String, required: true },
    company: { type: String, required: true },
    phoneNo: { type: String, required: true },
    mobileNo: { type: String },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pin: { type: String, required: true },
    country: { type: String, required: true },
    warehouseType: { type: String, required: true },
    defaultInTransit: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Warehouse ||
  mongoose.model("Warehouse", WarehouseSchema);
