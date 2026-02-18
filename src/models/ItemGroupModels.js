import mongoose from 'mongoose';

// Define the schema for ItemGroup
const ItemGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
}, { timestamps: true });

// Create a model for the schema
const ItemGroup = mongoose.models.ItemGroup || mongoose.model('ItemGroup', ItemGroupSchema);

export default ItemGroup;
