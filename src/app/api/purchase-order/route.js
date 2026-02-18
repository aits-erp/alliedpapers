// import mongoose from 'mongoose';
// import dbConnect from '@/lib/db';
// import PurchaseOrder from '@/models/PurchaseOrder';
// import Inventory from '@/models/Inventory';
// import StockMovement from '@/models/StockMovement';

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const data = await req.json();

//     // Ensure each order item includes an orderedQuantity.
//     if (data.items && Array.isArray(data.items)) {
//       data.items = data.items.map(item => ({
//         ...item,
//         // If orderedQuantity is missing, default to the provided quantity (or 0 if missing).
//         orderedQuantity: item.orderedQuantity !== undefined ? item.orderedQuantity : (item.quantity || 0),
//       }));
//     }

//     // Create the Purchase Order document.
//     const [po] = await PurchaseOrder.create([data], { session });

//     // For each item, update Inventory to increase the onOrder field.
//     for (const item of data.items) {
//       await Inventory.updateOne(
//         { item: item.item, warehouse: item.warehouse },
//         { $inc: { onOrder: item.quantity } },
//         { upsert: true, session }
//       );
//       // Log the incoming stock in StockMovement with movementType "ON_ORDER"
//       await StockMovement.create(
//         [{
//           item: item.item,
//           warehouse: item.warehouse,
//           movementType: "ON_ORDER", // This type indicates incoming stock.
//           quantity: item.orderedQuantity,
//           reference: po._id,
//           remarks: "Stock on order via Purchase Order",
//         }],
//         { session }
//       );
//     }

//     await session.commitTransaction();
//     session.endSession();
//     return new Response(
//       JSON.stringify({ message: "Purchase order created", po }),
//       { status: 201, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error creating purchase order:", error);
//     return new Response(
//       JSON.stringify({ message: "Error creating purchase order", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }





import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import PurchaseOrder from '@/models/PurchaseOrder';
import Inventory from '@/models/Inventory';
import StockMovement from '@/models/StockMovement';

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let data = await req.json();

    // Remove existing _id to prevent duplicate key errors
    if (data._id) {
      delete data._id;
    }

    // Remove _id from nested items to ensure new ObjectIds are generated
    if (data.items && Array.isArray(data.items)) {
      data.items = data.items.map(item => {
        const newItem = {...item};
        if (newItem._id) delete newItem._id;
        return {
          ...newItem,
          orderedQuantity: newItem.orderedQuantity ?? (newItem.quantity || 0),
        };
      });
    }

    // Create the Purchase Order document
    const [po] = await PurchaseOrder.create([data], { session });

    // For each item, update Inventory to increase the onOrder field
    for (const item of po.items) {
      await Inventory.updateOne(
        { item: item.item, warehouse: item.warehouse },
        { $inc: { onOrder: item.quantity } },
        { upsert: true, session }
      );
      
      // Log the incoming stock
      await StockMovement.create(
        [{
          item: item.item,
          warehouse: item.warehouse,
          movementType: "ON_ORDER",
          quantity: item.orderedQuantity,
          reference: po._id,
          remarks: "Stock on order via Purchase Order",
        }],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();
    return new Response(
      JSON.stringify({ message: "Purchase order created", po }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating purchase order:", error);
    return new Response(
      JSON.stringify({ message: "Error creating purchase order", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}





export async function GET(req) {
  try {
    await dbConnect();
    const purchaseOrders = await PurchaseOrder.find({});
    return new Response(JSON.stringify(purchaseOrders), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching PurchaseOrders:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching PurchaseOrders", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}