"use server";
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ProductionOrder from '@/models/ProductionOrder';
// import  Warehouse from '@/models/Warehouse'; 
// import BOM from '@/models/BOM';

import '@/models/warehouseModels'; 
import '@/models/BOM';
import '@/models/ItemModels'; // Ensure Item model is imported if used in population


export async function GET(request, { params }) {
  const { id } = await params;
  await connectDB();

  try {
    const order = await ProductionOrder.findById(id)
      .populate('warehouse', 'warehouseName')
      .populate('items.warehouse', 'warehouseName')
      .populate({
        path: 'bomId',
        populate: {
          path: 'productNo', // populate the productNo inside bomId
          select: 'itemCode itemName',
        },
        select: 'productNo productDesc', // fields in BOM
      })
      .populate('items','managedBy')
      .populate({
  path: 'items.item',
  select: 'unitPrice itemName itemCode',
});

      // const order1 = await ProductionOrder.findById(id)

      

    if (!order) {
      return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
    }

    return NextResponse.json(order.toObject(), { status: 200 });
  } catch (err) {
    console.error('Error fetching production order:', err);
    return NextResponse.json({ error: 'Failed to fetch production order' }, { status: 500 });
  }
}





export async function PUT(request, context) {
  const { id } = await context.params;
  await connectDB();

  try {
    const data = await request.json();

    // If transferQty is present, handle it with validation
    if (typeof data.transferQty === 'number') {
      const { transferQty } = data;

      if (transferQty < 1) {
        return NextResponse.json(
          { error: 'transferQty must be at least 1' },
          { status: 400 }
        );
      }

      const order = await ProductionOrder.findById(id);
      if (!order) {
        return NextResponse.json(
          { error: 'Production order not found' },
          { status: 404 }
        );
      }

      const totalTransferred = (order.transferQty || 0) + transferQty;
      if (totalTransferred > order.quantity) {
        return NextResponse.json(
          { error: `Transfer quantity exceeds available production quantity. Allowed max: ${order.quantity - (order.transferQty || 0)}` },
          { status: 400 }
        );
      }

      // Update transferQty
      order.transferQty = totalTransferred;

      // Apply other data fields (optional updates)
      for (const [key, value] of Object.entries(data)) {
        if (key !== 'transferQty') {
          order[key] = value;
        }
      }

      const updated = await order.save();
      return NextResponse.json(updated, { status: 200 });
    }

    // Fallback: regular update if no transferQty
    const updated = await ProductionOrder.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });

  } catch (err) {
    console.error('Error updating production order:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update production order' },
      { status: 400 }
    );
  }
}

  
  // export async function PUT(request, { params }) {
  //   const { id } = await params;
  //   await connectDB();
  //   try {
  //     const data = await request.json();
  //     const updated = await ProductionOrder.findByIdAndUpdate(id, data, { new: true });
  //     if (!updated) {
  //       return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
  //     }
  //     return NextResponse.json(updated, { status: 200 });
  //   } catch (err) {
  //     console.error('Error updating production order:', err);
  //     return NextResponse.json({ error: 'Failed to update production order' }, { status: 400 });
  //   }
  // }
  
  export async function DELETE(request, { params }) {
    const { id } = await params;
    await connectDB();
    try {
      const deleted = await ProductionOrder.findByIdAndDelete(id);
      if (!deleted) {
        return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
      console.error('Error deleting production order:', err);
      return NextResponse.json({ error: 'Failed to delete production order' }, { status: 400 });
    }
  }
  