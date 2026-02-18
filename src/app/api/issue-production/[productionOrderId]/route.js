import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import IssueProduction from '@/models/IssueProduction';
import ProductionOrder from '@/models/ProductionOrder';
import Inventory from '@/models/Inventory';

export async function POST(req, context) {
  try {
    await connectDB();

    // 1️⃣ Extract and validate the dynamic route param
    const { productionOrderId } = context.params || {};
    if (!productionOrderId) {
      return NextResponse.json(
        { message: 'Missing productionOrderId in URL' },
        { status: 400 }
      );
    }

    // 2️⃣ Parse query and body
    const { searchParams } = new URL(req.url);
    const qtyParam = Number(searchParams.get('qty')) || 0;
    const body = await req.json();
    const { avgCostPrice, data } = body;

    // 3️⃣ Validate body
    if (avgCostPrice == null) {
      return NextResponse.json(
        { message: 'Missing avgCostPrice in request body' },
        { status: 400 }
      );
    }
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { message: '`data` must be a non‑empty array' },
        { status: 400 }
      );
    }

    // 4️⃣ For each line item: validate and prepare updates
    const createdRecords = [];
    for (const entry of data) {
      const {
        itemId,
        sourceWarehouse,
        destinationWarehouse,
        batchNumber,
        quantity,
        expiryDate,
        manufacturer,
        unitPrice,
        managedByBatch,
      } = entry;

      // 4a. Basic field checks
      if (!itemId || !sourceWarehouse || !quantity || quantity <= 0) {
        return NextResponse.json(
          { message: 'Each entry needs itemId, sourceWarehouse, and positive quantity' },
          { status: 400 }
        );
      }
      // 4b. Batch‑managed checks
      if (managedByBatch && !batchNumber) {
        return NextResponse.json(
          { message: 'batchNumber required for batch‑managed items' },
          { status: 400 }
        );
      }

      // 5️⃣ Fetch inventory
      const inventory = await Inventory.findOne({
        item: itemId,
        warehouse: sourceWarehouse,
      });
      if (!inventory) {
        return NextResponse.json(
          { message: `No inventory for item ${itemId} in warehouse ${sourceWarehouse}` },
          { status: 404 }
        );
      }

      // 6️⃣ Deduct quantities
      if (managedByBatch) {
        const batch = inventory.batches.find(b => b.batchNumber === batchNumber);
        if (!batch) {
          return NextResponse.json(
            { message: `Batch ${batchNumber} not found in inventory` },
            { status: 404 }
          );
        }
        if (batch.quantity < quantity) {
          return NextResponse.json(
            { 
              message: `Insufficient in batch ${batchNumber}: have ${batch.quantity}, need ${quantity}` 
            },
            { status: 400 }
          );
        }
        batch.quantity -= quantity;
      }
      // Always deduct overall quantity
      inventory.quantity = Math.max(0, inventory.quantity - quantity);
      await inventory.save();

      // 7️⃣ Prepare IssueProduction record
      createdRecords.push({
        productionOrderId,
        itemId,
        sourceWarehouse,
        destinationWarehouse: destinationWarehouse || '',
        batchNumber: managedByBatch ? batchNumber : '',
        quantity,
        expiryDate: expiryDate || null,
        manufacturer: manufacturer || null,
        unitPrice: unitPrice || 0,
        qtyParam,
        managedByBatch,
      });
    }

    // 8️⃣ Bulk‑insert all issue records
    const result = await IssueProduction.insertMany(createdRecords);

    // 9️⃣ Update the production order (“issued so far” and cost rate)
    await ProductionOrder.findByIdAndUpdate(productionOrderId, {
      $inc: { issuforproductionqty: qtyParam }, 
      $set: { rate: avgCostPrice },
    });

    return NextResponse.json(
      { message: 'Issued successfully', data: result },
      { status: 201 }
    );
  } catch (err) {
    console.error('IssueProduction POST Error:', err);
    return NextResponse.json(
      { message: 'Internal Server Error', error: err.message },
      { status: 500 }
    );
  }
}






// import { NextResponse } from 'next/server';
// import connectDB from '@/lib/db';
// import IssueProduction from '@/models/IssueProduction';
// import ProductionOrder from '@/models/ProductionOrder';
// import Inventory from '@/models/Inventory'; // assuming you have this

// export async function POST(req) {
//   try {
//     await connectDB();
//     const data = await req.json();

//     if (!Array.isArray(data) || data.length === 0) {
//       return NextResponse.json({ message: 'No data provided' }, { status: 400 });
//     }

//     const created = [];

//     for (const entry of data) {
//       const {
//         productionOrderId,
//         itemId,
//         sourceWarehouse,
//         destinationWarehouse,
//         batchNumber,
//         quantity,
//         expiryDate,
//         manufacturer,
//         unitPrice,
//         qtyParam,
//       } = entry;

//       if (!productionOrderId || !itemId || !sourceWarehouse || !batchNumber || !quantity ) {
//         return NextResponse.json({ message: 'Missing fields in request' }, { status: 400 });
//       }

//       // 1. Create issue record
//       const issuedItem = await IssueProduction.create(item);
//       created.push(issuedItem);

//       // 2. Reduce inventory (assumes you track batches)
//       await Inventory.findOneAndUpdate(
//         {
//           itemId,
//           warehouse: sourceWarehouse,
//           batchNumber,
//         },
//         {
//           $inc: { quantity: -quantity },
//         }
//       );

//       // 3. Update ProductionOrder's issued quantity
//       await ProductionOrder.findByIdAndUpdate(
//         productionOrderId,
//         {
//           $inc: { issuforproductionqty: +qtyParam },
//         }
//       );
//     }

//     return NextResponse.json({ message: 'Issued successfully', data: created }, { status: 201 });
//   } catch (error) {
//     console.error('IssueProduction Error:', error);
//     return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
//   }
// }
