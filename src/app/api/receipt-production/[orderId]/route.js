// import { NextResponse } from 'next/server';
// import mongoose from 'mongoose';
// import connectDB from '@/lib/db';
// import Inventory from '@/models/Inventory';
// import ReceiptProduction from '@/models/ReceiptProduction';

// export async function POST(req, { params }) {
//   try {
//     await connectDB();

//     const { orderId } = params;
//     const url = new URL(req.url);
//     // qty from query param (optional in your code)
//     const qty = parseFloat(url.searchParams.get("qty") || "0");

//     const body = await req.json(); // Expecting array of entries

//     for (const entry of body) {
//       const {
//         itemId,
//         productNo,      // Expecting item ObjectId or itemCode string?
//         productDesc,
//         sourceWarehouse,
//         docNo,
//         docDate,
//         batches = [],
//       } = entry;

//       const itemObjId = new mongoose.Types.ObjectId(itemId);
//       const warehouseObjId = new mongoose.Types.ObjectId(sourceWarehouse);

//       // Find or create inventory record for this item+warehouse
//       let inventory = await Inventory.findOne({
//         item: itemObjId,
//         warehouse: warehouseObjId,
//       });

//       if (!inventory) {
//         inventory = new Inventory({
//           item: itemObjId,
//           productNo,
//           productDesc,
//           warehouse: warehouseObjId,
//           quantity: 0,
//           committed: 0,
//           onOrder: 0,
//           unitPrice: 0,
//           batches: [],
//         });
//       } else {
//         // Update missing fields if any
//         if (!inventory.productNo) inventory.productNo = productNo;
//         if (!inventory.productDesc) inventory.productDesc = productDesc;
//       }

//       let totalBatchQty = 0;

//       for (const batch of batches) {
//         const {
//           batchNumber,
//           quantity,
//           expiryDate,
//           manufacturer,
//           unitPrice,
//         } = batch;

//         totalBatchQty += quantity;

//         const existingBatch = inventory.batches.find(
//           (b) => b.batchNumber === batchNumber
//         );

//         if (existingBatch) {
//           existingBatch.quantity += quantity;
//           // optionally update other batch info like expiryDate etc. if needed
//         } else {
//           inventory.batches.push({
//             batchNumber,
//             quantity,
//             expiryDate,
//             manufacturer,
//             unitPrice,
//           });
//         }
//       }

//       inventory.quantity += totalBatchQty;
//       await inventory.save();

//       // Save production receipt
//       const receipt = new ReceiptProduction({
//         productionOrder: new mongoose.Types.ObjectId(orderId),
//         item: itemObjId,
//         sourceWarehouse: warehouseObjId,
//         docNo,
//         docDate,
//         quantity: totalBatchQty,
//         unitPrice: batches[0]?.unitPrice || 0,
//         totalPrice: totalBatchQty * (batches[0]?.unitPrice || 0),
//         batches,
//       });

//       await receipt.save();
//     }

//     return NextResponse.json({ success: true, message: "Receipt created and inventory updated." });
//   } catch (error) {
//     console.error("Receipt Production Error:", error);
//     return NextResponse.json(
//       { success: false, message: error.message },
//       { status: 500 }
//     );
//   }
// }






import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Inventory from '@/models/Inventory';
import ReceiptProduction from '@/models/ReceiptProduction';
import ProductionOrder from '@/models/ProductionOrder';

export async function  POST(req, contextPromise) {
  try {
  
  const context = await contextPromise;
  const { params } = context;
  const { orderId } = params || {};
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Missing orderId in URL' },
        { status: 400 }
      );
    }

    // Optional qty query‑param for how much to credit
    const url = new URL(req.url);
    const qtyParam = parseFloat(url.searchParams.get('qty') || '0');

    // Body must be an array of batch entries
    const entries = await req.json();
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Request body must be a non-empty array' },
        { status: 400 }
      );
    }

    // Process each batch entry
    for (const entry of entries) {
      const {
        itemId,
        productNo,
        productDesc,
        sourceWarehouse,
        docNo,
        docDate,
        batches = [],
      } = entry;

      // Basic validation
      if (!itemId || !sourceWarehouse || !batches.length) {
        return NextResponse.json(
          { success: false, message: 'Each entry needs itemId, sourceWarehouse, and at least one batch' },
          { status: 400 }
        );
      }

      // Correct ObjectId assignment
        await connectDB();
const itemObjId = new mongoose.Types.ObjectId(itemId);
const warehouseObjId = new mongoose.Types.ObjectId(sourceWarehouse);

// Find or create inventory
let inventory = await Inventory.findOne({
  item: itemObjId,
  warehouse: warehouseObjId,
});

if (!inventory) {
  inventory = new Inventory({
    item: itemObjId,            // ✅ correctly referencing Item
    warehouse: warehouseObjId,
    productNo,
    productDesc,
    quantity: 0,
    committed: 0,
    onOrder: 0,
    unitPrice: 0,
    batches: [],
  });
} else {
  inventory.productNo = inventory.productNo || productNo;
  inventory.productDesc = inventory.productDesc || productDesc;
}

      // Sum up total new quantity from batches
      let totalBatchQty = 0;
      for (const b of batches) {
        const { batchNumber, quantity, expiryDate, manufacturer, unitPrice } = b;
        if (!batchNumber || quantity == null) {
          return NextResponse.json(
            { success: false, message: 'Each batch must have batchNumber and quantity' },
            { status: 400 }
          );
        }
        totalBatchQty += quantity;

        const existing = inventory.batches.find(x => x.batchNumber === batchNumber);
        if (existing) {
          existing.quantity += quantity;
          existing.expiryDate = expiryDate || existing.expiryDate;
          existing.manufacturer = manufacturer || existing.manufacturer;
          existing.unitPrice = unitPrice != null ? unitPrice : existing.unitPrice;
        } else {
          inventory.batches.push({ batchNumber, quantity, expiryDate, manufacturer, unitPrice });
        }
      }

      // Update inventory totals
      inventory.quantity += totalBatchQty;
      await inventory.save();

      // Record the receipt
      await ReceiptProduction.create({
        productionOrder: new mongoose.Types.ObjectId(orderId),
        item: itemObjId,
        sourceWarehouse: warehouseObjId,
        docNo: docNo || '',
        docDate: docDate ? new Date(docDate) : new Date(),
        quantity: totalBatchQty,
        unitPrice: batches[0]?.unitPrice || 0,
        totalPrice: totalBatchQty * (batches[0]?.unitPrice || 0),
        batches,
        qtyParam
      });
    }

    // --- NEW STEP: update the ProductionOrder's received‑for‑production qty
    await ProductionOrder.findByIdAndUpdate(
      orderId,
      { $inc: { reciptforproductionqty: qtyParam } }
    );

    return NextResponse.json(
      { success: true, message: 'Receipt created, inventory updated, production order incremented.' },
      { status: 201 }
    );
  } catch (err) {
    console.error('ReceiptProduction POST Error:', err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}


























// import { NextResponse } from 'next/server';
// import mongoose from 'mongoose';
// import connectDB from '@/lib/db';
// import Inventory from '@/models/Inventory';
// import ReceiptProduction from '@/models/ReceiptProduction';
// import ProductionOrder from '@/models/ProductionOrder';

// export async function POST(req, { params }) {
//   try {
//     await connectDB();

//     const { orderId } = params;
//     const url = new URL(req.url);
//     const qty = parseFloat(url.searchParams.get("qty") || "0");

//     const body = await req.json(); // Expecting array

//     for (const entry of body) {
//       const {
//         itemId,
//         productNo,
//         productDesc,
//         sourceWarehouse,
//         docNo,
//         docDate,
//         batches = [],

       
//       } = entry;

//       const itemObjId = new mongoose.Types.ObjectId(itemId);
//       const warehouseObjId = new mongoose.Types.ObjectId(sourceWarehouse);

//       // 1. Update or Create Inventory
//       let inventory = await Inventory.findOne({
//         item: itemObjId,
//         warehouse: warehouseObjId,
//       });

//       if (!inventory) {
//         inventory = new Inventory({
//           item: itemObjId,
//           productNo,
//           productDesc,
//           warehouse: warehouseObjId,
//           quantity: 0,
//           committed: 0,
//           onOrder: 0,
//           unitPrice: 0,
//           batches: [],
        
//         });
//       }else {
//   // ✅ Update if existing and fields are missing
//   if (!inventory.productNo) inventory.productNo = productNo;
//   if (!inventory.productDesc) inventory.productDesc = productDesc;
// }

//       let totalBatchQty = 0;

//       for (const batch of batches) {
//         const {
//           batchNumber,
//           quantity,
//           expiryDate,
//           manufacturer,
//           unitPrice,
//         } = batch;

//         totalBatchQty += quantity;

//         const existingBatch = inventory.batches.find(
//           (b) => b.batchNumber === batchNumber
//         );

//         if (existingBatch) {
//           existingBatch.quantity += quantity;
//         } else {
//           inventory.batches.push({
//             batchNumber,
//             quantity,
//             expiryDate,
//             manufacturer,
//             unitPrice,
//           });
//         }
//       }

//       inventory.quantity += totalBatchQty;
//       await inventory.save();

//       // 2. Save Production Receipt
//       const receipt = new ReceiptProduction({
//         productionOrder: new mongoose.Types.ObjectId(orderId),
//         item: itemObjId,
//         sourceWarehouse: warehouseObjId,
//         docNo,
//         docDate,
//         quantity: totalBatchQty,
//         unitPrice: batches[0]?.unitPrice || 0, // taking unitPrice from first batch
//         totalPrice: totalBatchQty * (batches[0]?.unitPrice || 0),
//         batches,
//       });

//       await receipt.save();
//     }

    

//     return NextResponse.json({ success: true, message: "Receipt created and inventory updated." });
//   } catch (error) {
//     console.error("Receipt Production Error:", error);
//     return NextResponse.json(
//       { success: false, message: error.message },
//       { status: 500 }
//     );
//   }
// }
