import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import GRN from "@/models/grnModels";
import PurchaseOrder from "@/models/PurchaseOrder";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";

const { Types } = mongoose;

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const grnData = await req.json();
    console.log("Received GRN Data:", grnData);

    // ----- Data Cleaning -----
    if ("_id" in grnData) delete grnData._id;
    let purchaseOrderId = null;
    if (grnData.purchaseOrderId) {
      purchaseOrderId = grnData.purchaseOrderId;
      delete grnData.purchaseOrderId;
    }
    if (Array.isArray(grnData.items)) {
      grnData.items = grnData.items.map((item) => {
        if ("_id" in item) delete item._id;
        return item;
      });
    }

    // ----- Validation: Quantities & Required Fields -----
    for (const [i, item] of grnData.items.entries()) {
      const allowedQty = Number(item.allowedQuantity) || 0;
      if (allowedQty > 0 && Number(item.quantity) > allowedQty) {
        throw new Error(
          `For item ${item.itemCode}, GRN quantity (${item.quantity}) exceeds allowed quantity (${allowedQty}).`
        );
      }
      if (!item.item) {
        throw new Error(
          `Missing item ObjectId for row ${i + 1} with code: ${item.itemCode}`
        );
      }
      if (!item.warehouse) {
        throw new Error(
          `Missing warehouse ObjectId for row ${i + 1} with code: ${item.itemCode}`
        );
      }
      if (!Types.ObjectId.isValid(item.warehouse)) {
        throw new Error(
          `Invalid warehouse ObjectId for row ${i + 1}: ${item.warehouse}`
        );
      }
    }

    // ----- Validation: Batch-managed Items -----
    for (const [i, item] of grnData.items.entries()) {
      if (item.managedBy && item.managedBy.toLowerCase() === "batch") {
        const totalBatchQty = (item.batches || []).reduce(
          (sum, batch) => sum + Number(batch.batchQuantity || 0),
          0
        );
        if (totalBatchQty !== Number(item.quantity)) {
          throw new Error(
            `Batch quantity mismatch for item row ${i + 1} (${item.itemCode}): total batch quantity (${totalBatchQty}) does not equal item quantity (${item.quantity}).`
          );
        }
      }
    }

    // ----- Create GRN Document -----
    const [grn] = await GRN.create([grnData], { session });
    console.log("GRN created with _id:", grn._id);

    // ----- Update Inventory & Log Stock Movements -----
    // For each item, update the Inventory document.
    for (const item of grnData.items) {
      const itemQty = Number(item.quantity);
      // If the item is managed by batch, update batch details.
      if (
        item.managedBy &&
        item.managedBy.toLowerCase() === "batch" &&
        Array.isArray(item.batches) &&
        item.batches.length > 0
      ) {
        for (const batch of item.batches) {
          if (!batch.batchNumber || batch.batchNumber.trim() === "") {
            throw new Error(`Batch number is required for item ${item.itemCode}.`);
          }
          const batchQty = Number(batch.batchQuantity);
          let inventoryDoc = await Inventory.findOne({
            item: item.item,
            warehouse: item.warehouse,
          }).session(session);
          if (!inventoryDoc) {
            // Create a new inventory document with an overall quantity equal to the batch quantity.
            inventoryDoc = await Inventory.create(
              [
                {
                  item: item.item,
                  warehouse: item.warehouse,
                  quantity: batchQty, // overall quantity (you can choose to sum batches later)
                  onOrder: 0,
                  batches: [
                    {
                      batchNumber: batch.batchNumber,
                      expiryDate: batch.expiryDate,
                      manufacturer: batch.manufacturer,
                      quantity: batchQty,
                      unitPrice: Number(item.unitPrice),
                    },
                  ],
                },
              ],
              { session }
            );
          } else {
            // Update batch details.
            const existingBatch = inventoryDoc.batches.find(
              (b) => b.batchNumber === batch.batchNumber
            );
            if (existingBatch) {
              existingBatch.quantity = Number(existingBatch.quantity) + batchQty;
            } else {
              inventoryDoc.batches.push({
                batchNumber: batch.batchNumber,
                expiryDate: batch.expiryDate,
                manufacturer: batch.manufacturer,
                quantity: batchQty,
                unitPrice: Number(item.unitPrice),
              });
            }
            // Also update the overall quantity.
            inventoryDoc.quantity = (inventoryDoc.quantity || 0) + batchQty;
            await inventoryDoc.save({ session });
          }
          // Log stock movement for the batch.
          await StockMovement.create(
            [
              {
                item: item.item,
                warehouse: item.warehouse,
                movementType: "IN",
                quantity: batchQty,
                reference: grn._id,
                remarks: `Stock updated via GRN for batch ${batch.batchNumber}`,
              },
            ],
            { session }
          );
        }
        // For batch-managed items, adjust the onOrder field.
        let inventoryDoc = await Inventory.findOne({
          item: item.item,
          warehouse: item.warehouse,
        }).session(session);
        if (inventoryDoc) {
          inventoryDoc.onOrder = Math.max((inventoryDoc.onOrder || 0) - itemQty, 0);
          await inventoryDoc.save({ session });
        }
      } else {
        // For non-batch-managed items, update the overall quantity.
        await Inventory.updateOne(
          { item: item.item, warehouse: item.warehouse },
          { $inc: { quantity: itemQty, onOrder: -itemQty } },
          { upsert: true, session }
        );
        await StockMovement.create(
          [
            {
              item: item.item,
              warehouse: item.warehouse,
              movementType: "IN",
              quantity: itemQty,
              reference: grn._id,
              remarks: "Stock updated via GRN",
            },
          ],
          { session }
        );
      }
    }

    // ----- Update Linked Purchase Order (PO) -----
    // if (purchaseOrderId) {
    //   const po = await PurchaseOrder.findById(purchaseOrderId).session(session);
    //   if (!po) {
    //     throw new Error(
    //       `Purchase Order with id ${purchaseOrderId} not found. Aborting GRN save.`
    //     );
    //   }
    //   let allItemsReceived = false;
    //   for (const poItem of po.items) {
    //     poItem.receivedQuantity = poItem.receivedQuantity || 0;
    //     const grnItem = grnData.items.find(
    //       (i) => i.item.toString() === poItem.item.toString()
    //     );
    //     if (grnItem) {
    //       poItem.receivedQuantity += Number(grnItem.quantity) || 0;
    //     }
    //     const originalQty = Number(poItem.orderedQuantity) || 0;
    //     const remaining = Math.max(originalQty - poItem.receivedQuantity);
    //     poItem.quantity = remaining; // pending quantity
    //     console.log(
    //       `PO item ${poItem.item.toString()} - ordered: ${originalQty}, received: ${poItem.receivedQuantity}, remaining: ${remaining}`
    //     );
    //     if (remaining > 0) {
    //       allItemsReceived = true;
    //     }
    //   }
    //   po.orderStatus = allItemsReceived ? "Close" : "Open";
    //   po.stockStatus = allItemsReceived ? "Updated" : "Adjusted";
    //   console.log(`Final PO status: orderStatus=${po.orderStatus}, stockStatus=${po.stockStatus}`);
    //   await po.save({ session });
    // }
    if (purchaseOrderId) {
      const po = await PurchaseOrder.findById(purchaseOrderId).session(session);
      if (!po) {
        throw new Error(
          `Purchase Order with id ${purchaseOrderId} not found. Aborting GRN save.`
        );
      }
      
      let allItemsReceived = true;
      
      for (const poItem of po.items) {
        // Initialize receivedQuantity if not already set.
        poItem.receivedQuantity = poItem.receivedQuantity || 0;
        
        // Find the corresponding GRN item for this PO item.
        const grnItem = grnData.items.find(
          (i) => i.item.toString() === poItem.item.toString()
        );
        
        // If a matching GRN item exists, add its quantity.
        if (grnItem) {
          poItem.receivedQuantity += Number(grnItem.quantity) || 0;
        }
        
        // Determine the original (expected) quantity:
        // Use the PO's orderedQuantity if it's greater than zero,
        // otherwise fall back to the GRN item's allowedQuantity.
        const originalQty =
          Number(poItem.orderedQuantity) > 0
            ? Number(poItem.orderedQuantity)
            : (grnItem && Number(grnItem.allowedQuantity) > 0
                 ? Number(grnItem.allowedQuantity)
                 : 0);
        
        // Calculate remaining pending quantity.
        const remaining = Math.max(originalQty - poItem.receivedQuantity, 0);
        // Optionally, store the remaining quantity in a dedicated field.
        poItem.pendingQuantity = remaining;
        poItem.quantity = remaining;
        
        console.log(
          `PO item ${poItem.item.toString()} - ordered: ${originalQty}, received: ${poItem.receivedQuantity}, remaining: ${remaining}`
        );
        
        // If any item has remaining quantity, then the PO is not fully received.
        if (remaining > 0) {
          allItemsReceived = false;
        }
      }
      
      // Set PO status based on whether all items are fully received.
      po.orderStatus = allItemsReceived ? "Close" : "Open";
      po.stockStatus = allItemsReceived ? "Updated" : "Adjusted";
      console.log(`Final PO status: orderStatus=${po.orderStatus}, stockStatus=${po.stockStatus}`);
      await po.save({ session });
    }
    
    

    await session.commitTransaction();
    session.endSession();
    return new Response(
      JSON.stringify({ message: "GRN processed and inventory updated", grnId: grn._id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error processing GRN:", error.stack || error);
    return new Response(
      JSON.stringify({ message: "Error processing GRN", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


/* ------------------------------------------------------------------ */
/* GET /api/grn         → list every GRN (optionally filter)          */
/* ------------------------------------------------------------------ */
export async function GET(req) {
  try {
    await dbConnect();

    // Example: /api/grn?supplierCode=S-1001
    const { searchParams } = new URL(req.url);
    const query = {};

    if (searchParams.get("supplierCode"))
      query.supplierCode = searchParams.get("supplierCode");
    if (searchParams.get("purchaseOrderId"))
      query.purchaseOrderId = searchParams.get("purchaseOrderId");

    const grns = await GRN.find(query).sort({ createdAt: -1 }).lean();

    return new Response(
      JSON.stringify({ success: true, data: grns }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("GET /api/grn:", err);
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}




// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import GRN from "@/models/grnModels";
// import PurchaseOrder from "@/models/PurchaseOrder";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";

// const { Types } = mongoose;

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const grnData = await req.json();

//     // ----- Data Cleaning -----
//     const cleanGRNData = { ...grnData };
//     if ("_id" in cleanGRNData) delete cleanGRNData._id;
    
//     // Extract and clean purchaseOrderId
//     const purchaseOrderId = cleanGRNData.purchaseOrderId || null;
//     delete cleanGRNData.purchaseOrderId;
    
//     // Clean items array
//     if (Array.isArray(cleanGRNData.items)) {
//       cleanGRNData.items = cleanGRNData.items.map((item) => {
//         const cleanItem = { ...item };
//         if ("_id" in cleanItem) delete cleanItem._id;
//         return cleanItem;
//       });
//     }

//     // ----- Validation: Quantities & Required Fields -----
//     for (const [i, item] of cleanGRNData.items.entries()) {
//       const itemIndex = i + 1;
//       const allowedQty = Number(item.allowedQuantity) || 0;
//       const receivedQty = Number(item.receivedQuantity) || 0;
      
//       // Validate quantity limits
//       if (allowedQty > 0 && receivedQty > allowedQty) {
//         throw new Error(
//           `Item ${itemIndex} (${item.itemCode}): Received quantity (${receivedQty}) exceeds allowed (${allowedQty})`
//         );
//       }
      
//       // Validate required fields
//       if (!item.item || !Types.ObjectId.isValid(item.item)) {
//         throw new Error(
//           `Item ${itemIndex} (${item.itemCode}): Missing or invalid item ID`
//         );
//       }
      
//       if (!item.warehouse || !Types.ObjectId.isValid(item.warehouse)) {
//         throw new Error(
//           `Item ${itemIndex} (${item.itemCode}): Missing or invalid warehouse ID`
//         );
//       }
//     }

//     // ----- Validation: Batch-managed Items -----
//     for (const [i, item] of cleanGRNData.items.entries()) {
//       if (item.managedBy?.toLowerCase() === "batch") {
//         const totalBatchQty = (item.batches || []).reduce(
//           (sum, batch) => sum + Number(batch.batchQuantity || 0),
//           0
//         );
        
//         if (totalBatchQty !== Number(item.receivedQuantity || 0)) {
//           throw new Error(
//             `Batch item ${i + 1} (${item.itemCode}): Batch total (${totalBatchQty}) doesn't match received (${item.receivedQuantity})`
//           );
//         }
//       }
//     }

//     // ----- Create GRN Document -----
//     const [grn] = await GRN.create([cleanGRNData], { session });

//     // ----- Update Inventory & Log Stock Movements -----
//     for (const item of cleanGRNData.items) {
//       const itemId = new Types.ObjectId(item.item);
//       const warehouseId = new Types.ObjectId(item.warehouse);
//       const receivedQty = Number(item.receivedQuantity) || 0;
//       const unitPrice = Number(item.unitPrice) || 0;
      
//       // Batch-managed items
//       if (item.managedBy?.toLowerCase() === "batch" && item.batches?.length > 0) {
//         for (const batch of item.batches) {
//           if (!batch.batchNumber?.trim()) {
//             throw new Error(`Batch number required for item ${item.itemCode}`);
//           }
          
//           const batchQty = Number(batch.batchQuantity) || 0;
          
//           // Find or create inventory
//           let inventoryDoc = await Inventory.findOne({
//             item: itemId,
//             warehouse: warehouseId
//           }).session(session);
          
//           if (!inventoryDoc) {
//             inventoryDoc = await Inventory.create([{
//               item: itemId,
//               warehouse: warehouseId,
//               quantity: batchQty,
//               onOrder: 0,
//               batches: [{
//                 batchNumber: batch.batchNumber,
//                 expiryDate: batch.expiryDate,
//                 manufacturer: batch.manufacturer,
//                 quantity: batchQty,
//                 unitPrice: unitPrice,
//               }]
//             }], { session })[0];
//           } else {
//             // Update existing batch or add new one
//             const existingBatch = inventoryDoc.batches.find(
//               b => b.batchNumber === batch.batchNumber
//             );
            
//             if (existingBatch) {
//               existingBatch.quantity += batchQty;
//             } else {
//               inventoryDoc.batches.push({
//                 batchNumber: batch.batchNumber,
//                 expiryDate: batch.expiryDate,
//                 manufacturer: batch.manufacturer,
//                 quantity: batchQty,
//                 unitPrice: unitPrice,
//               });
//             }
            
//             inventoryDoc.quantity += batchQty;
//             await inventoryDoc.save({ session });
//           }
          
//           // Create stock movement
//           await StockMovement.create([{
//             item: itemId,
//             warehouse: warehouseId,
//             movementType: "IN",
//             quantity: batchQty,
//             reference: grn._id,
//             remarks: `Batch ${batch.batchNumber} received via GRN`,
//             batchNumber: batch.batchNumber
//           }], { session });
//         }
//       } 
//       // Non-batch items
//       else {
//         // Update inventory
//         await Inventory.updateOne(
//           { item: itemId, warehouse: warehouseId },
//           { 
//             $inc: { 
//               quantity: receivedQty,
//               onOrder: -receivedQty
//             }
//           },
//           { upsert: true, session }
//         );
        
//         // Create stock movement
//         await StockMovement.create([{
//           item: itemId,
//           warehouse: warehouseId,
//           movementType: "IN",
//           quantity: receivedQty,
//           reference: grn._id,
//           remarks: "Stock received via GRN"
//         }], { session });
//       }
//     }

//     // ----- Update Linked Purchase Order (PO) -----
//     if (purchaseOrderId) {
//       const po = await PurchaseOrder.findById(purchaseOrderId).session(session);
//       if (!po) {
//         throw new Error(`Purchase Order ${purchaseOrderId} not found`);
//       }
      
//       // Create map of received quantities by item ID
//       const receivedMap = new Map();
//       for (const item of cleanGRNData.items) {
//         const itemId = item.item.toString();
//         receivedMap.set(itemId, (receivedMap.get(itemId) || 0) + Number(item.receivedQuantity || 0));
//       }
      
//       // Track PO status
//       let allItemsFullyReceived = true;
//       let anyItemsReceived = false;
      
//       // Update PO items
//       for (const poItem of po.items) {
//         const poItemId = poItem.item.toString();
//         const receivedQty = receivedMap.get(poItemId) || 0;
        
//         // Update received quantity
//         poItem.receivedQuantity = (poItem.receivedQuantity || 0) + receivedQty;
        
//         // Calculate remaining
//         const orderedQty = Number(poItem.orderedQuantity) || 0;
//         const remainingQty = Math.max(0, orderedQty - poItem.receivedQuantity);
//         poItem.pendingQuantity = remainingQty;
        
//         // Update status flags
//         if (remainingQty > 0) allItemsFullyReceived = false;
//         if (receivedQty > 0) anyItemsReceived = true;
//       }
      
//       // Update PO status
//       if (allItemsFullyReceived) {
//         po.orderStatus = "Completed";
//       } else if (anyItemsReceived) {
//         po.orderStatus = "PartiallyReceived";
//       } else {
//         po.orderStatus = "Open";
//       }
      
//       await po.save({ session });
//     }

//     await session.commitTransaction();
//     session.endSession();
    
//     return new Response(
//       JSON.stringify({ 
//         success: true,
//         message: "GRN processed successfully",
//         grnId: grn._id 
//       }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
    
//     return new Response(
//       JSON.stringify({ 
//         success: false,
//         message: "GRN processing failed",
//         error: error.message 
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }