import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import CreditNote from "@/models/CreditMemo"; // Ensure your CreditMemo model is defined
import PurchaseOrder from "@/models/PurchaseOrder";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";

const { Types } = mongoose;

export async function GET(req, { params }) {
  await dbConnect();
  try {
    if (params && params.id) {
      const creditNote = await CreditNote.findById(params.id);
      if (!creditNote) {
        return new Response(
          JSON.stringify({ success: false, message: "Credit Note not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, creditNote }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      const creditNotes = await CreditNote.find({});
      return new Response(
        JSON.stringify({ success: true, creditNotes }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error fetching credit notes:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Error fetching credit notes", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const creditData = await req.json();
    console.log("Received Credit Note Data:", creditData);

    // ----- Data Cleaning -----
    if ("_id" in creditData) delete creditData._id;
    if (Array.isArray(creditData.items)) {
      creditData.items = creditData.items.map((item) => {
        if ("_id" in item) delete item._id;
        return item;
      });
    }

    // ----- Validation: Quantities & Required Fields -----
    for (const [i, item] of creditData.items.entries()) {
      const allowedQty = Number(item.allowedQuantity) || 0;
      if (allowedQty > 0 && Number(item.quantity) > allowedQty) {
        throw new Error(
          `For item ${item.itemCode}, Credit Note quantity (${item.quantity}) exceeds allowed quantity (${allowedQty}).`
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
    for (const [i, item] of creditData.items.entries()) {
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

    // ----- Create Credit Note Document -----
    const [creditMemo] = await CreditNote.create([creditData], { session });
    console.log("Credit Note created with _id:", creditMemo._id);

    // ----- Update Inventory & Log Stock Movements -----
    for (const item of creditData.items) {
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
            // Create a new inventory document with overall quantity equal to batchQty.
            inventoryDoc = await Inventory.create(
              [
                {
                  item: item.item,
                  warehouse: item.warehouse,
                  quantity: batchQty,
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
                reference: creditMemo._id,
                remarks: `Stock updated via Credit Note for batch ${batch.batchNumber}`,
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
        // if (inventoryDoc) {
        //   inventoryDoc.onOrder = Math.max((inventoryDoc.onOrder || 0) - itemQty, 0);
        //   await inventoryDoc.save({ session });
        // }
      } else {
        // For non-batch-managed items, update the overall quantity.
        await Inventory.updateOne(
          { item: item.item, warehouse: item.warehouse },
          { $inc: { quantity: itemQty,  } },
          { upsert: true, session }
        );
        await StockMovement.create(
          [
            {
              item: item.item,
              warehouse: item.warehouse,
              movementType: "IN",
              quantity: itemQty,
              reference: creditMemo._id,
              remarks: "Stock updated via Credit Note",
            },
          ],
          { session }
        );
      }
    }

    

    await session.commitTransaction();
    session.endSession();
    return new Response(
      JSON.stringify({
        message: "Credit Note processed and inventory updated",
        creditMemoId: creditMemo._id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error processing Credit Note:", error.stack || error);
    return new Response(
      JSON.stringify({ message: "Error processing Credit Note", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}






