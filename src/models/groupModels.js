import mongoose from "mongoose";

// Define the Group schema
const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },


    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically add `createdAt` and `updatedAt`
  }
);

// Create and export the Group model
const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

export default Group;
