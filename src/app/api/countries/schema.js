import mongoose from 'mongoose';

const CountrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
}, { timestamps: true });

export default mongoose.models.Country || mongoose.model('Country', CountrySchema);
