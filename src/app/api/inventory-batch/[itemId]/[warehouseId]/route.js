// File: app/api/inventory/[itemId]/[warehouseId]/route.js
import dbConnect from '@/lib/db';
import Inventory from '@/models/Inventory';
import { Types } from 'mongoose';

export async function GET(request, context) {
   const { itemId, warehouseId } = await context.params;
  await dbConnect();

  try {
    // Ensure both IDs are valid ObjectId strings
    if (!Types.ObjectId.isValid(itemId) || !Types.ObjectId.isValid(warehouseId)) {
      return new Response(JSON.stringify({ error: 'Invalid ID format' }), { status: 400 });
    }

    const inventory = await Inventory.findOne({
      item: new Types.ObjectId(itemId),
      warehouse: new Types.ObjectId(warehouseId),
    });

    if (!inventory) {
      return new Response(JSON.stringify({ message: 'Inventory not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ batches: inventory.batches }), { status: 200 });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}