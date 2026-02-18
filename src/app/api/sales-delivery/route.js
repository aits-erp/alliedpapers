import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Delivery from "@/models/deliveryModels"; // Your Delivery model
import Inventory from "@/models/Inventory";       // Inventory model (includes batches)
import StockMovement from "@/models/StockMovement"; // For logging stock movements
import SalesOrder from "@/models/SalesOrder";       // To update Sales Order status if needed
import SalesInvoice from "@/models/SalesInvoice";   // To update Sales Invoice status if needed

const { Types } = mongoose;

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const deliveryData = await req.json();
    console.log("Received Delivery Data:", deliveryData);

    // ----- Data Cleaning -----
    delete deliveryData._id;
    if (Array.isArray(deliveryData.items)) {
      deliveryData.items = deliveryData.items.map((item) => {
        delete item._id;
        return item;
      });
    }

    // ----- Create Delivery Document -----
    const [delivery] = await Delivery.create([deliveryData], { session });
    console.log("Delivery created with _id:", delivery._id);

    // ----- Determine if this is a Sales Order copy -----
    // If sourceId exists and sourceModel (normalized) equals "salesorder", we consider it an SO copy.
    const isCopied = !!deliveryData.sourceId;
    const sourceModel = (deliveryData.sourceModel || "salesorder").toLowerCase();
    const isSODelivery = isCopied && sourceModel === "salesorder";
    console.log("isCopied:", isCopied, "sourceModel:", sourceModel, "isSODelivery:", isSODelivery);

    // ----- Process Each Delivery Item: Reduce Inventory and Committed Stock -----
    async function processItem(item) {
      // Fetch the inventory record for this item in the specified warehouse.
      const inventoryDoc = await Inventory.findOne({
        item: new Types.ObjectId(item.item),
        warehouse: new Types.ObjectId(item.warehouse),
      }).session(session);

      if (!inventoryDoc) {
        throw new Error(
          `No inventory record found for item ${item.item} in warehouse ${item.warehouse}`
        );
      }

      // For batch-managed items: iterate allocated batches.
      if (item.batches && item.batches.length > 0) {
        let totalAllocated = 0;
        for (const allocated of item.batches) {
          // Find the matching batch using batchNumber.
          const batchIndex = inventoryDoc.batches.findIndex(
            (b) => b.batchNumber === allocated.batchCode
          );
          if (batchIndex === -1) {
            throw new Error(
              `Batch ${allocated.batchCode} not found in inventory for item ${item.item}`
            );
          }
          const allocatedQty = Number(allocated.allocatedQuantity) || 0;
          if (inventoryDoc.batches[batchIndex].quantity < allocatedQty) {
            throw new Error(
              `Insufficient stock in batch ${allocated.batchCode} for item ${item.item}`
            );
          }
          // Reduce the batch quantity.
          inventoryDoc.batches[batchIndex].quantity -= allocatedQty;
          totalAllocated += allocatedQty;
          console.log(
            `Batch ${allocated.batchCode} reduced by ${allocatedQty}. New qty: ${inventoryDoc.batches[batchIndex].quantity}`
          );
        }
        // (Optional) You can check if totalAllocated matches item.quantity.
        if (totalAllocated !== item.quantity) {
          console.log(
            `Warning: Total allocated (${totalAllocated}) does not equal item.quantity (${item.quantity}).`
          );
        }
      }

      // For both batch and non-batch items: reduce overall available quantity.
      if (inventoryDoc.quantity < item.quantity) {
        throw new Error(
          `Insufficient overall stock for item ${item.item} in warehouse ${item.warehouse}`
        );
      }
      inventoryDoc.quantity -= item.quantity;
      console.log(`Overall quantity reduced by ${item.quantity}. New qty: ${inventoryDoc.quantity}`);

      // For a Sales Order copy to Delivery, reduce the committed stock as well.
      if (isSODelivery) {
        if ((inventoryDoc.committed || 0) < item.quantity) {
          throw new Error(
            `Insufficient committed stock for item ${item.item} in warehouse ${item.warehouse}`
          );
        }
        inventoryDoc.committed -= item.quantity;
        console.log(`Committed stock reduced by ${item.quantity}. New committed: ${inventoryDoc.committed}`);
      } else {
        // For a normal delivery, if needed, you might also reduce committed stock.
        // Here we reduce committed stock by item.quantity for consistency.
        inventoryDoc.committed = (inventoryDoc.committed || 0) - item.quantity;
        console.log(`Committed stock (normal) reduced by ${item.quantity}. New committed: ${inventoryDoc.committed}`);
      }

      // Log the stock movement.
      await StockMovement.create(
        [
          {
            item: item.item,
            warehouse: item.warehouse,
            movementType: "OUT",
            quantity: item.quantity,
            reference: delivery._id,
            remarks: isSODelivery
              ? "Sales Order Delivery (SO copy) – committed, batch & overall reduced"
              : "Delivery – stock reduction",
          },
        ],
        { session }
      );

      // Save the updated inventory document.
      await inventoryDoc.save({ session });
    }

    // Process each item.
    for (const item of deliveryData.items) {
      await processItem(item);
    }

    // ----- Update Source Document if This Delivery Was Copied -----
    if (isCopied) {
      if (sourceModel === "salesorder") {
        await SalesOrder.findByIdAndUpdate(
          deliveryData.sourceId,
          { status: "Delivered" },
          { session }
        );
        console.log(`Sales Order ${deliveryData.sourceId} updated to Delivered`);
      } else if (sourceModel === "salesinvoice") {
        await SalesInvoice.findByIdAndUpdate(
          deliveryData.sourceId,
          { status: "Delivered" },
          { session }
        );
        console.log(`Sales Invoice ${deliveryData.sourceId} updated to Delivered`);
      }
    }

    await session.commitTransaction();
    session.endSession();

    return new Response(
      JSON.stringify({
        message: "Delivery processed and inventory updated",
        deliveryId: delivery._id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error processing Delivery:", error.stack || error);
    return new Response(
      JSON.stringify({
        message: "Error processing Delivery",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}




export async function GET(req) {
  try {
    await dbConnect();
    const SalesDeliverys = await Delivery.find({});
    return new Response(JSON.stringify(SalesDeliverys), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching SalesDeliverys:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching SalesDeliverys", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}