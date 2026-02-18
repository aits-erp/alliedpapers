import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import SalesInvoice from "@/models/SalesInvoice";   // Your Sales Invoice model
import Inventory from "@/models/Inventory";         // Inventory model (includes batches)
import StockMovement from "@/models/StockMovement"; // For logging stock movements
import SalesOrder from "@/models/SalesOrder";       // For updating Sales Order status if needed
import Delivery from "@/models/deliveryModels";     // For updating Delivery status if needed

const { Types } = mongoose;

// Helper: returns a batch's quantity (checks for batchQuantity or allocatedQuantity)
const getBatchQuantity = (batch) => {
  return Number(batch.batchQuantity || batch.allocatedQuantity) || 0;
};

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoiceData = await req.json();
    console.log("Received Invoice Data:", invoiceData);

    // ----- Data Cleaning -----
    delete invoiceData._id;
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

    // ----- Validation & Auto-Creation for Batch-managed Items -----
    for (const [i, item] of invoiceData.items.entries()) {
      if (item.managedBy && item.managedBy.toLowerCase() === "batch") {
        // If batches array is missing, empty, or totals to 0, auto-create a default batch.
        const currentBatchTotal = (item.batches || []).reduce(
          (sum, batch) => sum + getBatchQuantity(batch),
          0
        );
        if (!item.batches || item.batches.length === 0 || currentBatchTotal === 0) {
          console.log(`No valid batch details for item ${item.itemCode}; auto-creating default batch.`);
          item.batches = [
            {
              batchCode: "default",
              batchQuantity: Number(item.quantity)
            }
          ];
        }
        const totalBatchQty = item.batches.reduce(
          (sum, batch) => sum + getBatchQuantity(batch),
          0
        );
        if (totalBatchQty !== Number(item.quantity)) {
          throw new Error(
            `Batch quantity mismatch for item row ${i + 1} (${item.itemCode}): total batch quantity (${totalBatchQty}) does not equal invoice quantity (${item.quantity}).`
          );
        }
      }
    }

    // ----- Create Sales Invoice Document -----
    // Create as an array to retrieve the created document.
    const [invoice] = await SalesInvoice.create([invoiceData], { session });
    console.log("Sales Invoice created with _id:", invoice._id);

    // ----- Determine Inventory Update Type -----
    // If the invoice is copied, check the source.
    const isCopied = !!invoiceData.sourceId;
    const sourceModel = (invoiceData.sourceModel || "salesorder").toLowerCase();
    // "normal": normal invoice (update overall quantity)
    // "committedOnly": Sales Order copy (update committed stock only)
    // "none": Delivery copy (do not update inventory)
    let updateType;
    if (!isCopied) {
      updateType = "normal";
    } else if (isCopied && sourceModel === "salesorder") {
      updateType = "committedOnly";
    } else if (isCopied && sourceModel === "delivery") {
      updateType = "none";
    }
    console.log("isCopied:", isCopied, "sourceModel:", sourceModel, "updateType:", updateType);

    // ----- Process Each Invoice Item -----
    async function processItem(item) {
      if (item.stockAdded) {
        console.log("Item already processed:", item.itemCode);
        return;
      }
      console.log("Processing item:", item.itemCode, "Quantity:", Number(item.quantity));

      // If updateType is "none", skip inventory update.
      if (updateType === "none") {
        item.stockAdded = true;
        return;
      }

      // Find inventory record.
      const inventoryDoc = await Inventory.findOne({
        item: new Types.ObjectId(item.item),
        warehouse: new Types.ObjectId(item.warehouse),
      }).session(session);

      if (!inventoryDoc) {
        throw new Error(
          `No inventory record found for item ${item.item} in warehouse ${item.warehouse}`
        );
      }

      if (item.batches && item.batches.length > 0) {
        for (const batch of item.batches) {
          const batchQty = getBatchQuantity(batch);
          const batchIndex = inventoryDoc.batches.findIndex(
            (b) => b.batchNumber === batch.batchCode
          );
          if (batchIndex === -1) {
            throw new Error(
              `Batch ${batch.batchCode} not found in inventory for item ${item.item}`
            );
          }
          if (inventoryDoc.batches[batchIndex].quantity < batchQty) {
            throw new Error(
              `Insufficient stock in batch ${batch.batchCode} for item ${item.item}`
            );
          }
          inventoryDoc.batches[batchIndex].quantity -= batchQty;
          console.log(
            `Batch ${batch.batchCode} reduced by ${batchQty}. New batch qty: ${inventoryDoc.batches[batchIndex].quantity}`
          );
          await StockMovement.create(
            [
              {
                item: item.item,
                warehouse: item.warehouse,
                movementType: "OUT",
                quantity: batchQty,
                reference: invoice._id,
                remarks: `Stock updated via Sales Invoice for batch ${batch.batchCode}`,
              },
            ],
            { session }
          );
        }
        const totalQuantity = inventoryDoc.batches.reduce(
          (sum, batch) => sum + (Number(batch.quantity) || 0),
          0
        );
        if (updateType === "normal") {
          inventoryDoc.quantity = totalQuantity;
        }
        if (updateType === "committedOnly") {
          if ((inventoryDoc.committed || 0) < Number(item.quantity)) {
            throw new Error(
              `Insufficient committed stock for item ${item.item} in warehouse ${item.warehouse}`
            );
          }
          inventoryDoc.committed -= Number(item.quantity);
          console.log(
            `Committed stock reduced by ${item.quantity}. New committed: ${inventoryDoc.committed}`
          );
        }
        await inventoryDoc.save({ session });
      } else {
        // Non-batch-managed items.
        if (updateType === "normal") {
          await Inventory.updateOne(
            { item: item.item, warehouse: item.warehouse },
            { $inc: { quantity: -Number(item.quantity) } },
            { upsert: true, session }
          );
        } else if (updateType === "committedOnly") {
          await Inventory.updateOne(
            { item: item.item, warehouse: item.warehouse },
            { $inc: { committed: -Number(item.quantity) } },
            { upsert: true, session }
          );
        }
        await StockMovement.create(
          [
            {
              item: item.item,
              warehouse: item.warehouse,
              movementType: "OUT",
              quantity: Number(item.quantity),
              reference: invoice._id,
              remarks:
                updateType === "committedOnly"
                  ? "Invoice (SO copy) – committed stock reduction"
                  : "Invoice – overall stock reduction",
            },
          ],
          { session }
        );
      }
      item.stockAdded = true;
    }

    for (const item of invoiceData.items) {
      await processItem(item);
    }

    // ----- Update Source Document if Invoice Was Copied -----
    if (isCopied) {
      if (sourceModel === "salesorder") {
        await SalesOrder.findByIdAndUpdate(
          invoiceData.sourceId,
          { status: "Invoiced" },
          { session }
        );
        console.log(`Sales Order ${invoiceData.sourceId} updated to Invoiced`);
      } else if (sourceModel === "delivery") {
        await Delivery.findByIdAndUpdate(
          invoiceData.sourceId,
          { status: "Invoiced" },
          { session }
        );
        console.log(`Delivery ${invoiceData.sourceId} updated to Invoiced`);
      }
    }

    await session.commitTransaction();
    session.endSession();

    return new Response(
      JSON.stringify({
        message: "Sales Invoice processed successfully",
        invoiceId: invoice._id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error processing Sales Invoice:", error.stack || error);
    return new Response(
      JSON.stringify({
        message: "Error processing Sales Invoice",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}









// export async function GET(req) {
//   try {
//     await dbConnect();
//     const salesinvoice = await SalesInvoice.find({});
//     return new Response(JSON.stringify(salesinvoice), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Error fetching SalesDeliverys:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching SalesDeliverys", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }
// export async function GET(req) {
//   try {
//     await dbConnect();
    
//     const { searchParams } = new URL(req.url);
//     const customerCode = searchParams.get("customerCode");

//     if (!customerCode) {
//       return new Response(JSON.stringify({ message: "Missing customerCode query parameter" }), {
//         status: 400,
//         headers: { "Content-Type": "application/json" },
//       });
//     }

//     console.log("🔍 Querying for customerCode:", customerCode);

//     // Ensure case-insensitive match
//     const query = { customerCode: { $regex: `^${customerCode}$`, $options: "i" } };

//     console.log("📡 MongoDB Query:", JSON.stringify(query));

//     const salesInvoices = await SalesInvoice.find(query);

//     console.log("📦 Retrieved SalesInvoices:", salesInvoices);

//     if (salesInvoices.length === 0) {
//       return new Response(JSON.stringify({ message: "No SalesInvoices found" }), {
//         status: 404,
//         headers: { "Content-Type": "application/json" },
//       });
//     }

//     return new Response(JSON.stringify({ success: true, data: salesInvoices }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("❌ Error fetching SalesInvoices:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching SalesInvoices", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }




export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const customerCode = searchParams.get("customerCode");

    let salesInvoices;
    if (customerCode) {
      console.log("🔍 Querying for customerCode:", customerCode);
      // Ensure case-insensitive match
      const query = { customerCode: { $regex: `^${customerCode}$`, $options: "i" } };
      console.log("📡 MongoDB Query:", JSON.stringify(query));
      salesInvoices = await SalesInvoice.find(query);
      if (!salesInvoices || salesInvoices.length === 0) {
        return new Response(
          JSON.stringify({ message: "No SalesInvoices found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } else {
      // No customerCode provided, return all SalesInvoices
      salesInvoices = await SalesInvoice.find({});
    }

    return new Response(
      JSON.stringify({ success: true, data: salesInvoices }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error fetching SalesInvoices:", error);
    return new Response(
      JSON.stringify({
        message: "Error fetching SalesInvoices",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

