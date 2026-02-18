import mongoose from "mongoose";

const ProjectionRowSchema = new mongoose.Schema({
  zone: { type: String, default: "" },
  productCode: { type: String, required: true }, // Ensure product code is mandatory
  productName: { type: String, default: "" },
  qty: { type: Number, default: 0 },
  liner: { type: String, default: "" },
  group: { type: String, default: "" },
  remark: { type: String, default: "" },
});

const ProjectionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true, // Index for faster queries by company
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    rows: [ProjectionRowSchema],
  },
  { timestamps: true }
);

// Prevent duplicate projections for the same Company + Year + Month
ProjectionSchema.index({ companyId: 1, year: 1, month: 1 }, { unique: true });

export default mongoose.models.Projection || mongoose.model("Projection", ProjectionSchema);