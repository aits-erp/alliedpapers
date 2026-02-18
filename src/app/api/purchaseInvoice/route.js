import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import PurchaseInvoice from "@/models/InvoiceModel"; // Purchase Invoice model
import PurchaseOrder from "@/models/PurchaseOrder";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";

const { Types } = mongoose;

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const invoiceData = await req.json();
    console.log("Received Invoice Data:", invoiceData);

    // ----- Data Cleaning -----
    delete invoiceData._id;
    let purchaseOrderId = null;
    if (invoiceData.purchaseOrderId) {
      purchaseOrderId = invoiceData.purchaseOrderId;
      delete invoiceData.purchaseOrderId;
    }
    if (Array.isArray(invoiceData.items)) {
      invoiceData.items = invoiceData.items.map((item) => {
        delete item._id;
        return item;
      });
    }

    // ----- Validation: Quantities & Required Fields -----
    for (const [i, item] of invoiceData.items.entries()) {
      const allowedQty = Number(item.allowedQuantity) || 0;
      if (allowedQty > 0 && Number(item.quantity) > allowedQty) {
        throw new Error(
          `For item ${item.itemCode}, invoice quantity (${item.quantity}) exceeds allowed quantity (${allowedQty}).`
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
    for (const [i, item] of invoiceData.items.entries()) {
      if (item.managedBy && item.managedBy.toLowerCase() === "batch") {
        const totalBatchQty = (item.batches || []).reduce(
          (sum, batch) => sum + (Number(batch.batchQuantity) || 0),
          0
        );
        if (totalBatchQty !== Number(item.quantity)) {
          throw new Error(
            `Batch quantity mismatch for item row ${i + 1} (${item.itemCode}): total batch quantity (${totalBatchQty}) does not equal invoice quantity (${item.quantity}).`
          );
        }
      }
    }

    // ----- Create Purchase Invoice Document -----
    const [invoice] = await PurchaseInvoice.create([invoiceData], { session });
    console.log("Invoice created with _id:", invoice._id);

    // ----- Helper: Process Each Invoice Item -----
    async function processItem(item) {
      if (item.stockAdded) {
        console.log("Item already processed:", item.itemCode);
        return;
      }
      console.log("Processing item:", item.itemCode, "Quantity:", Number(item.quantity));
      if (item.batches && item.batches.length > 0) {
        // Batch-managed items
        let inventoryDoc = await Inventory.findOne({
          item: item.item,
          warehouse: item.warehouse,
        }).session(session);
    
        for (const batch of item.batches) {
          const batchQty = Number(batch.batchQuantity) || 0;
          if (!inventoryDoc) {
            inventoryDoc = await Inventory.create(
              [
                {
                  item: item.item,
                  warehouse: item.warehouse,
                  // For PO copy, reduce onOrder by item.quantity; for Normal, start at 0.
                  onOrder: invoiceData.invoiceType === "POCopy" ? 0 - Number(item.quantity) : 0,
                  batches: [
                    {
                      batchNumber: batch.batchNumber,
                      expiryDate: batch.expiryDate,
                      manufacturer: batch.manufacturer,
                      quantity: batchQty,
                      unitPrice: Number(item.unitPrice) || 0,
                    },
                  ],
                },
              ],
              { session }
            );
          } else {
            const existingBatch = inventoryDoc.batches.find(
              (b) => b.batchNumber === batch.batchNumber
            );
            if (existingBatch) {
              existingBatch.quantity += batchQty;
            } else {
              inventoryDoc.batches.push({
                batchNumber: batch.batchNumber,
                expiryDate: batch.expiryDate,
                manufacturer: batch.manufacturer,
                quantity: batchQty,
                unitPrice: Number(item.unitPrice) || 0,
              });
            }
            await inventoryDoc.save({ session });
          }
          // Log stock movement for this batch.
          await StockMovement.create(
            [
              {
                item: item.item,
                warehouse: item.warehouse,
                movementType: "IN",
                quantity: batchQty,
                reference: invoice._id,
                remarks: `Stock updated via Purchase Invoice for batch ${batch.batchNumber}`,
              },
            ],
            { session }
          );
        }
        // Update overall quantity from all batches.
        if (inventoryDoc) {
          const totalQuantity = inventoryDoc.batches.reduce(
            (sum, batch) => sum + (Number(batch.quantity) || 0),
            0
          );
          inventoryDoc.quantity = totalQuantity;
          if (invoiceData.invoiceType === "POCopy") {
            inventoryDoc.onOrder = Math.max(
              (inventoryDoc.onOrder || 0) - Number(item.quantity),
              0
            );
          }
          await inventoryDoc.save({ session });
        }
      } else {
        // Non-batch-managed items.
        const updateObj =
          invoiceData.invoiceType === "POCopy"
            ? { $inc: { quantity: Number(item.quantity), onOrder: -Number(item.quantity) } }
            : { $inc: { quantity: Number(item.quantity) } };
        await Inventory.updateOne(
          { item: item.item, warehouse: item.warehouse },
          updateObj,
          { upsert: true, session }
        );
        await StockMovement.create(
          [
            {
              item: item.item,
              warehouse: item.warehouse,
              movementType: "IN",
              quantity: Number(item.quantity),
              reference: invoice._id,
              remarks: "Stock updated via Purchase Invoice",
            },
          ],
          { session }
        );
      }
      item.stockAdded = true;
    }
    
    // ----- Process Invoice Items Based on Invoice Type -----
    // For GRNCopy invoices, skip inventory update.
    if (invoiceData.invoiceType === "GRNCopy") {
      console.log("Skipping inventory update for GRN Copy invoice.");
    } else {
      // Process each item only once.
      for (const item of invoiceData.items) {
        await processItem(item);
      }
    }
    
    // ----- Update Linked Purchase Order (if applicable) -----
    if (purchaseOrderId) {
      const po = await PurchaseOrder.findById(purchaseOrderId).session(session);
      if (!po) {
        console.warn(
          `Purchase Order with id ${purchaseOrderId} not found. Skipping PO update.`
        );
      } else {
        let allItemsInvoiced = true;
        for (const poItem of po.items) {
          poItem.receivedQuantity = poItem.receivedQuantity || 0;
          const invoiceItem = invoiceData.items.find(
            (i) => i.item.toString() === poItem.item.toString()
          );
          if (invoiceItem) {
            poItem.receivedQuantity += Number(invoiceItem.quantity) || 0;
          }
          const originalQty = Number(poItem.orderedQuantity) || 0;
          const remaining = Math.max(originalQty - poItem.receivedQuantity, 0);
          poItem.quantity = remaining;
          console.log(
            `PO item ${poItem.item.toString()} - ordered: ${originalQty}, invoiced: ${poItem.receivedQuantity}, remaining: ${remaining}`
          );
          if (Math.abs(remaining) > 0.01) {
            allItemsInvoiced = false;
          }
        }
        po.orderStatus = allItemsInvoiced ? "Close" : "Open";
        po.stockStatus = allItemsInvoiced ? "Updated" : "Adjusted";
        console.log(
          `Final PO status: orderStatus=${po.orderStatus}, stockStatus=${po.stockStatus}`
        );
        await po.save({ session });
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    return new Response(
      JSON.stringify({
        message: "Purchase Invoice processed and inventory updated",
        invoiceId: invoice._id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error processing Purchase Invoice:", error.stack || error);
    return new Response(
      JSON.stringify({
        message: "Error processing Purchase Invoice",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}




// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import PurchaseInvoice from "@/models/InvoiceModel"; // Purchase Invoice model
// import PurchaseOrder from "@/models/PurchaseOrder";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";

// const { Types } = mongoose;

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const invoiceData = await req.json();
//     console.log("Received Invoice Data:", invoiceData);

//     // ----- Data Cleaning -----
//     // Remove any existing _id field from the invoice data and its items.
//     delete invoiceData._id;
    
//     // If invoice is linked to a Purchase Order, extract and remove its id.
//     let purchaseOrderId = null;
//     if (invoiceData.purchaseOrderId) {
//       purchaseOrderId = invoiceData.purchaseOrderId;
//       delete invoiceData.purchaseOrderId;
//     }
    
//     if (Array.isArray(invoiceData.items)) {
//       invoiceData.items = invoiceData.items.map((item) => {
//         delete item._id;
//         return item;
//       });
//     }

//     // ----- Validation: Quantities & Required Fields -----
//     for (const [i, item] of invoiceData.items.entries()) {
//       const allowedQty = Number(item.allowedQuantity) || 0;
//       if (allowedQty > 0 && Number(item.quantity) > allowedQty) {
//         throw new Error(
//           `For item ${item.itemCode}, invoice quantity (${item.quantity}) exceeds allowed quantity (${allowedQty}).`
//         );
//       }
//       if (!item.item) {
//         throw new Error(
//           `Missing item ObjectId for row ${i + 1} with code: ${item.itemCode}`
//         );
//       }
//       if (!item.warehouse) {
//         throw new Error(
//           `Missing warehouse ObjectId for row ${i + 1} with code: ${item.itemCode}`
//         );
//       }
//       if (!Types.ObjectId.isValid(item.warehouse)) {
//         throw new Error(
//           `Invalid warehouse ObjectId for row ${i + 1}: ${item.warehouse}`
//         );
//       }
//     }

//     // ----- Validation: Batch-managed Items -----
//     for (const [i, item] of invoiceData.items.entries()) {
//       if (item.managedBy && item.managedBy.toLowerCase() === "batch") {
//         const totalBatchQty = (item.batches || []).reduce(
//           (sum, batch) => sum + (Number(batch.batchQuantity) || 0),
//           0
//         );
//         if (totalBatchQty !== Number(item.quantity)) {
//           throw new Error(
//             `Batch quantity mismatch for item row ${i + 1} (${item.itemCode}): total batch quantity (${totalBatchQty}) does not equal invoice quantity (${item.quantity}).`
//           );
//         }
//       }
//     }

//     // ----- Create Purchase Invoice Document -----
//     const [invoice] = await PurchaseInvoice.create([invoiceData], { session });
//     console.log("Invoice created with _id:", invoice._id);

//     // ----- Helper: Process Each Invoice Item -----
//     async function processItem(item) {
//       if (!item.stockAdded) {
//         if (item.batches && item.batches.length > 0) {
//           // Batch-managed items: update inventory record and log a stock movement per batch.
//           for (const batch of item.batches) {
//             let inventoryDoc = await Inventory.findOne({
//               item: item.item,
//               warehouse: item.warehouse,
//             }).session(session);

//             if (!inventoryDoc) {
//               inventoryDoc = await Inventory.create(
//                 [
//                   {
//                     item: item.item,
//                     warehouse: item.warehouse,
//                     onOrder: 0,
//                     batches: [
//                       {
//                         batchNumber: batch.batchNumber,
//                         expiryDate: batch.expiryDate,
//                         manufacturer: batch.manufacturer,
//                         quantity: batch.batchQuantity,
//                         unitPrice: item.unitPrice,
//                       },
//                     ],
//                   },
//                 ],
//                 { session }
//               );
//             } else {
//               const existingBatch = inventoryDoc.batches.find(
//                 (b) => b.batchNumber === batch.batchNumber
//               );
//               if (existingBatch) {
//                 existingBatch.quantity += batch.batchQuantity;
//               } else {
//                 inventoryDoc.batches.push({
//                   batchNumber: batch.batchNumber,
//                   expiryDate: batch.expiryDate,
//                   manufacturer: batch.manufacturer,
//                   quantity: batch.batchQuantity,
//                   unitPrice: item.unitPrice,
//                 });
//               }
//               await inventoryDoc.save({ session });
//             }
//             // Log stock movement for the batch.
//             await StockMovement.create(
//               [
//                 {
//                   item: item.item,
//                   warehouse: item.warehouse,
//                   movementType: "IN",
//                   quantity: batch.batchQuantity,
//                   reference: invoice._id,
//                   remarks: `Stock updated via Purchase Invoice for batch ${batch.batchNumber}`,
//                 },
//               ],
//               { session }
//             );
//           }
//           // Adjust onOrder quantity for batch-managed items.
//           let inventoryDoc = await Inventory.findOne({
//             item: item.item,
//             warehouse: item.warehouse,
//           }).session(session);
//           if (inventoryDoc) {
//             inventoryDoc.onOrder = Math.max(
//               (inventoryDoc.onOrder || 0) - item.quantity,
//               0
//             );
//             await inventoryDoc.save({ session });
//           }
//         } else {
//           // Non-batch-managed items: update inventory and log stock movement.
//           await Inventory.updateOne(
//             { item: item.item, warehouse: item.warehouse },
//             { $inc: { quantity: Number(item.quantity), onOrder: -Number(item.quantity) } },
//             { upsert: true, session }
//           );
//           await StockMovement.create(
//             [
//               {
//                 item: item.item,
//                 warehouse: item.warehouse,
//                 movementType: "IN",
//                 quantity: item.quantity,
//                 reference: invoice._id,
//                 remarks: "Stock updated via Purchase Invoice",
//               },
//             ],
//             { session }
//           );
//         }
//         // Mark item as processed.
//         item.stockAdded = true;
//       }
//     }

//     // Process each invoice item.
//     for (const item of invoiceData.items) {
//       await processItem(item);
//     }

//     if (!purchaseOrderId) {
//       for (const item of invoiceData.items) {
//         await processItem(item);
//       }
//     }

//     // ----- Update Linked Purchase Order (if applicable) -----
//     if (purchaseOrderId) {
//       const po = await PurchaseOrder.findById(purchaseOrderId).session(session);
//       if (!po) {
//         console.warn(
//           `Purchase Order with id ${purchaseOrderId} not found. Skipping PO update.`
//         );
//       } else {
//         let allItemsInvoiced = true;
//         for (const poItem of po.items) {
//           poItem.receivedQuantity = poItem.receivedQuantity || 0;
//           const invoiceItem = invoiceData.items.find(
//             (i) => i.item.toString() === poItem.item.toString()
//           );
//           if (invoiceItem) {
//             poItem.receivedQuantity += Number(invoiceItem.quantity) || 0;
//           }
//           const originalQty = Number(poItem.orderedQuantity) || 0;
//           const remaining = Math.max(originalQty - poItem.receivedQuantity, 0);
//           poItem.quantity = remaining; // pending quantity
//           console.log(
//             `PO item ${poItem.item.toString()} - ordered: ${originalQty}, invoiced: ${poItem.receivedQuantity}, remaining: ${remaining}`
//           );
//           if (Math.abs(remaining) > 0.01) {
//             allItemsInvoiced = false;
//           }
//         }
//         po.orderStatus = allItemsInvoiced ? "Close" : "Open";
//         po.stockStatus = allItemsInvoiced ? "Updated" : "Adjusted";
//         console.log(
//           `Final PO status: orderStatus=${po.orderStatus}, stockStatus=${po.stockStatus}`
//         );
//         await po.save({ session });
//       }
//     }

//     await session.commitTransaction();
//     session.endSession();
//     return new Response(
//       JSON.stringify({
//         message: "Purchase Invoice processed and inventory updated",
//         invoiceId: invoice._id,
//       }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error processing Purchase Invoice:", error.stack || error);
//     return new Response(
//       JSON.stringify({
//         message: "Error processing Purchase Invoice",
//         error: error.message,
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }




// export async function GET(req) {
//   try {
//     await dbConnect();
//     const purchaseInvoices = await PurchaseInvoice.find({});
//     return new Response(JSON.stringify(purchaseInvoices), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Error fetching purchaseInvoices:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching purchaseInvoices", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }


// export async function GET(req) {
//   try {
//     await dbConnect();

//     const { searchParams } = new URL(req.url);
//     const supplierCode = searchParams.get("supplierCode");

//     if (!supplierCode) {
//       return new Response(
//         JSON.stringify({ message: "Missing supplierCode query parameter" }),
//         {
//           status: 400,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }

//     console.log("🔍 Querying for supplierCode:", supplierCode);

//     // Ensure case-insensitive match
//     const query = { supplierCode: { $regex: `^${supplierCode}$`, $options: "i" } };

//     console.log("📡 MongoDB Query:", JSON.stringify(query));

//     const purchaseInvoices = await PurchaseInvoice.find(query);

//     console.log("📦 Retrieved PurchaseInvoices:", purchaseInvoices);

//     if (purchaseInvoices.length === 0) {
//       return new Response(
//         JSON.stringify({ message: "No PurchaseInvoices found" }),
//         {
//           status: 404,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }

//     return new Response(
//       JSON.stringify({ success: true, data: purchaseInvoices }),
//       {
//         status: 200,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   } catch (error) {
//     console.error("❌ Error fetching PurchaseInvoices:", error);
//     return new Response(
//       JSON.stringify({
//         message: "Error fetching PurchaseInvoices",
//         error: error.message,
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }




export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const supplierCode = searchParams.get("supplierCode");

    let invoices;
    if (supplierCode) {
      console.log("🔍 Querying for supplierCode:", supplierCode);
      const query = { supplierCode: { $regex: `^${supplierCode}$`, $options: "i" } };
      console.log("📡 MongoDB Query:", JSON.stringify(query));
      invoices = await PurchaseInvoice.find(query);
    } else {
      // No supplierCode provided, return all purchase invoices.
      invoices = await PurchaseInvoice.find({});
    }

    // Ensure invoices is always an array.
    if (!Array.isArray(invoices)) {
      invoices = [];
    }

    return new Response(
      JSON.stringify({ success: true, data: invoices }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error fetching PurchaseInvoices:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

