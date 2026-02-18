// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import DebitNote from "@/models/DebitNoteModel"; // Your Debit Note model
// import Inventory from "@/models/Inventory";   // Inventory model (includes batches)
// import StockMovement from "@/models/StockMovement"; // Model for logging stock movements

// const { Types } = mongoose;

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const debitNoteData = await req.json();
//     console.log("Received Debit Note Data:", debitNoteData);

//     // ----- Data Cleaning -----
//     delete debitNoteData._id;
//     if (Array.isArray(debitNoteData.items)) {
//       debitNoteData.items = debitNoteData.items.map((item) => {
//         delete item._id;
//         return item;
//       });
//     }

//     // ----- Create Debit Note Document -----
//     const [debitNote] = await DebitNote.create([debitNoteData], { session });
//     console.log("Debit Note created with _id:", debitNote._id);

//     // ----- Process Each Debit Note Item: Update Inventory & Log Stock Movement -----
//     async function processItem(item) {
//       // Find the inventory record for this item and warehouse.
//       const inventoryDoc = await Inventory.findOne({
//         item: new Types.ObjectId(item.item),
//         warehouse: new Types.ObjectId(item.warehouse),
//       }).session(session);

//       if (!inventoryDoc) {
//         throw new Error(
//           `No inventory record found for item ${item.item} in warehouse ${item.warehouse}`
//         );
//       }

//       // Process batch-managed items.
//       if (item.batches && item.batches.length > 0) {
//         for (const allocated of item.batches) {
//           // allocated.batchCode holds the batch number.
//           const batchIndex = inventoryDoc.batches.findIndex(
//             (b) => b.batchNumber === allocated.batchCode
//           );
//           if (batchIndex === -1) {
//             throw new Error(
//               `Batch ${allocated.batchCode} not found in inventory for item ${item.item}`
//             );
//           }
//           // Check if the batch has enough stock.
//           if (inventoryDoc.batches[batchIndex].quantity < allocated.allocatedQuantity) {
//             throw new Error(
//               `Insufficient stock in batch ${allocated.batchCode} for item ${item.item}`
//             );
//           }
//           // Deduct the allocated quantity from the batch's available quantity.
//           inventoryDoc.batches[batchIndex].quantity -= allocated.allocatedQuantity;
//           inventoryDoc.quantity -= item.quantity;
//         }
//       } else {
//         // For non-batch-managed items, deduct from overall inventory quantity.
//         if (inventoryDoc.quantity < item.quantity) {
//           throw new Error(
//             `Insufficient stock for item ${item.item} in warehouse ${item.warehouse}`
//           );
//         }
//         inventoryDoc.quantity -= item.quantity;
//       }

//       // Update the committed field (adjust as per your business logic).
//       // inventoryDoc.committed += item.quantity;

//       // Save the updated inventory document.
//       await inventoryDoc.save({ session });

//       // Log the stock movement.
//       await StockMovement.create(
//         [
//           {
//             item: item.item,
//             warehouse: item.warehouse,
//             movementType: "OUT",
//             quantity: item.quantity,
//             reference: debitNote._id,
//             remarks: "Debit Note - stock reduction",
//           },
//         ],
//         { session }
//       );
//     }

//     // Process each item in the Debit Note.
//     for (const item of debitNoteData.items) {
//       await processItem(item);
//     }

//     await session.commitTransaction();
//     session.endSession();
//     return new Response(
//       JSON.stringify({
//         message: "Debit Note processed and inventory updated",
//         debitNoteId: debitNote._id,
//       }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error processing Debit Note:", error.stack || error);
//     return new Response(
//       JSON.stringify({
//         message: "Error processing Debit Note",
//         error: error.message,
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }



/*  src/app/api/debit-note/route.js  */
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import DebitNote from "@/models/DebitNoteModel";  // Debit-Note schema
import Inventory from "@/models/Inventory";       // Inventory schema
import StockMovement from "@/models/StockMovement";

const { Types } = mongoose;

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    /* ------------------------------------------------------------------ */
    /* 1️⃣  Read + log raw payload                                         */
    /* ------------------------------------------------------------------ */
    const debitNoteData = await req.json();
    console.log("Received Debit Note Data:", debitNoteData);

    /* ------------------------------------------------------------------ */
    /* 2️⃣  Clean & normalise the payload                                  */
    /* ------------------------------------------------------------------ */
    delete debitNoteData._id;

    if (Array.isArray(debitNoteData.items)) {
      debitNoteData.items = debitNoteData.items.map((item) => {
        delete item._id;

        /* ---- batch normalisation ---- */
        if (Array.isArray(item.batches) && item.batches.length > 0) {
          item.batches = item.batches
            .map((b) => ({
              ...b,

              /*  Map ANY of these → batchCode  */
              batchCode:
                b.batchCode ??
                b.batchNumber ??
                b.batchNo ??
                null, // will be filtered below

              /*  Fall back to total qty if allocated missing  */
              allocatedQuantity:
                b.allocatedQuantity ??
                b.quantity ??
                0,

              /*  available = total − allocated (if both known)  */
              availableQuantity:
                b.availableQuantity ??
                (b.quantity !== undefined && b.allocatedQuantity !== undefined
                  ? b.quantity - b.allocatedQuantity
                  : 0),
            }))
            /*  remove lines that still have no code  */
            .filter((b) => b.batchCode);
        }

        return item;
      });
    }

    /* ------------------------------------------------------------------ */
    /* 3️⃣  Create the Debit-Note document                                 */
    /* ------------------------------------------------------------------ */
    const [debitNote] = await DebitNote.create([debitNoteData], { session });
    console.log("Debit Note created with _id:", debitNote._id);

    /* ------------------------------------------------------------------ */
    /* 4️⃣  Helper to process each line item                               */
    /* ------------------------------------------------------------------ */
    async function processItem(item) {
      const inventoryDoc = await Inventory.findOne({
        item: new Types.ObjectId(item.item),
        warehouse: new Types.ObjectId(item.warehouse),
      }).session(session);

      if (!inventoryDoc) {
        throw new Error(
          `No inventory record found for item ${item.item} in warehouse ${item.warehouse}`
        );
      }

      /* ---------- batch-managed ---------- */
      if (item.batches && item.batches.length > 0) {
        for (const allocated of item.batches) {
          /*  Guard: make sure we really have a batchCode  */
          if (!allocated.batchCode) {
            throw new Error(
              `Missing batchCode in item ${item.itemCode || item.item}`
            );
          }

          const batchIndex = inventoryDoc.batches.findIndex(
            (b) => b.batchNumber === allocated.batchCode
          );
          if (batchIndex === -1) {
            throw new Error(
              `Batch ${allocated.batchCode} not found in inventory for item ${item.item}`
            );
          }

          /*  Stock check  */
          if (
            inventoryDoc.batches[batchIndex].quantity <
            allocated.allocatedQuantity
          ) {
            throw new Error(
              `Insufficient stock in batch ${allocated.batchCode} for item ${item.item}`
            );
          }

          /*  Deduct batch + global qty  */
          inventoryDoc.batches[batchIndex].quantity -=
            allocated.allocatedQuantity;
          inventoryDoc.quantity -= allocated.allocatedQuantity;
        }
      } else {
        /* ---------- non-batch-managed ---------- */
        if (inventoryDoc.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for item ${item.item} in warehouse ${item.warehouse}`
          );
        }
        inventoryDoc.quantity -= item.quantity;
      }

      /* Save updated inventory */
      await inventoryDoc.save({ session });

      /* Stock-movement log */
      await StockMovement.create(
        [
          {
            item: item.item,
            warehouse: item.warehouse,
            movementType: "OUT",
            quantity: item.quantity,
            reference: debitNote._id,
            remarks: "Debit Note - stock reduction",
          },
        ],
        { session }
      );
    }

    /* ------------------------------------------------------------------ */
    /* 5️⃣  Process every item in parallel (await sequentially for safety) */
    /* ------------------------------------------------------------------ */
    for (const item of debitNoteData.items) {
      await processItem(item);
    }

    /* ------------------------------------------------------------------ */
    /* 6️⃣  Commit + respond                                               */
    /* ------------------------------------------------------------------ */
    await session.commitTransaction();
    session.endSession();

    return new Response(
      JSON.stringify({
        message: "Debit Note processed and inventory updated",
        debitNoteId: debitNote._id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error processing Debit Note:", error.stack || error);

    return new Response(
      JSON.stringify({
        message: "Error processing Debit Note",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}




export async function GET(req) {
  try {
    await dbConnect();
    const debitNotes = await DebitNote.find({});
    return new Response(JSON.stringify(debitNotes), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching debitNotes:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching debitNotes", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}