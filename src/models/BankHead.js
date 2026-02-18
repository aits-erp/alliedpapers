import mongoose from "mongoose";

const BankHeadSchema = new mongoose.Schema(
  {
    accountCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    accountHead: {
      type: String,
      required: true,
      trim: true,
    },
    isActualBank: {
      type: Boolean,
      required: true,
      default: false,
    },
    status: {
      type: String,
      required: true,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

export default mongoose.models.BankHead || mongoose.model("BankHead", BankHeadSchema);



// import mongoose from "mongoose";

// const BankHeadSchema = new mongoose.Schema(
//   {
//     accountCode: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//     },
//     accountName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     accountHead: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     status: {
//       type: String,
//       required: true,
//       enum: ["Active", "Inactive"],
//       default: "Active",
//     },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.BankHead ||
//   mongoose.model("BankHead", BankHeadSchema);
