// import { NextResponse } from 'next/server';
// import connectDB from '@/lib/db';
// import PurchaseOrder from '@/models/PurchaseOrder';

// export async function GET(request, { params }) {
//   const { id } = params;
  
//   try {
//     await connectDB();

//     const order = await PurchaseOrder.findById(id)
//       .populate({
//         path: 'items.item',
//         select: 'itemName itemCode unitPrice managedBy',
//         strictPopulate: false
//       })
//       .populate({
//         path: 'items.warehouse',
//         select: 'warehouseName warehouseCode',
//         strictPopulate: false
//       });

//     if (!order) {
//       return NextResponse.json(
//         { error: 'Purchase order not found' }, 
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(order, { status: 200 });

//   } catch (err) {
//     console.error('Error fetching purchase order:', err);
//     return NextResponse.json(
//       { error: err.message || 'Failed to fetch purchase order' },
//       { status: 500 }
//     );
//   }
// }

// export async function PUT(request, { params }) {
//   const { id } = params;
  
//   try {
//     await connectDB();
//     const data = await request.json();

//     const updated = await PurchaseOrder.findByIdAndUpdate(id, data, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updated) {
//       return NextResponse.json(
//         { error: 'Purchase order not found' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(updated, { status: 200 });

//   } catch (err) {
//     console.error('Error updating purchase order:', err);
//     return NextResponse.json(
//       { error: err.message || 'Failed to update purchase order' },
//       { status: 400 }
//     );
//   }
// }
// export async function DELETE(req, { params }) {
//   try {
//     await dbConnect();
//     const { id } = await params;  // Ensure params are awaited here.
//     const deletedPurchaseOrder = await PurchaseOrder.findByIdAndDelete(id);
//     if (!deletedPurchaseOrder) {
//       return new Response(JSON.stringify({ message: "updateddeletedPurchaseOrder not found" }), {
//         status: 404,
//         headers: { "Content-Type": "application/json" },
//       });
//     }
//     return new Response(
//       JSON.stringify({ message: "updateddeletedPurchaseOrder deleted successfully" }),
//       {
//         status: 200,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   } catch (error) {
//     console.error("Error deleting updateddeletedPurchaseOrder:", error);
//     return new Response(
//       JSON.stringify({ message: "Error deleting updateddeletedPurchaseOrder", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }




// import mongoose from 'mongoose';
// import dbConnect from '@/lib/db';
// import PurchaseOrder from '@/models/PurchaseOrder';
// import Inventory from '@/models/Inventory';
// import StockMovement from '@/models/StockMovement';
// import { NextResponse } from "next/server";



// export async function GET(request, { params }) {
//   try {
//     await dbConnect();
//     const { id } = params;

//     const order = await PurchaseOrder.findById(id)
//       .populate('supplier', 'supplierCode supplierName contactPerson')
//       .populate('items.item', 'itemName itemCode unitPrice managedBy')
//       .populate('items.warehouse', 'warehouseName warehouseCode');

//     if (!order) {
//       return NextResponse.json(
//         { error: 'Purchase order not found' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(order, { status: 200 });
//   } catch (error) {
//     console.error('Error fetching purchase order:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to fetch purchase order' },
//       { status: 500 }
//     );
//   }
// }


// export async function PUT(request, { params }) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { id } = params;
//     const data = await request.json();

//     // 1. First check if the purchase order exists
//     const existingPO = await PurchaseOrder.findById(id).session(session);
//     if (!existingPO) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Purchase order not found" }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     // 2. Validate the update data
//     if (!data.items || data.items.length === 0) {
//       throw new Error("At least one item is required");
//     }

//     // 3. Process items and calculate totals
//     const validatedItems = data.items.map(item => ({
//       ...item,
//       orderedQuantity: item.quantity || 0,
//       priceAfterDiscount: (item.unitPrice || 0) - (item.discount || 0),
//       totalAmount: ((item.unitPrice || 0) - (item.discount || 0)) * (item.quantity || 0)
//     }));

//     const totals = validatedItems.reduce((acc, item) => {
//       acc.totalBeforeDiscount += item.totalAmount;
//       acc.gstTotal += item.gstAmount || 0;
//       return acc;
//     }, { totalBeforeDiscount: 0, gstTotal: 0 });

//     const grandTotal = totals.totalBeforeDiscount + totals.gstTotal + 
//                       (data.freight || 0) + (data.rounding || 0);

//     // 4. Prepare update data
//     const updateData = {
//       ...data,
//       items: validatedItems,
//       totalBeforeDiscount: totals.totalBeforeDiscount,
//       gstTotal: totals.gstTotal,
//       grandTotal,
//       openBalance: grandTotal - ((data.totalDownPayment || 0) + (data.appliedAmounts || 0))
//     };

//     // 5. Update the purchase order
//     const updatedPO = await PurchaseOrder.findByIdAndUpdate(
//       id,
//       updateData,
//       { new: true, runValidators: true, session }
//     );

//     // 6. Update inventory and stock movements
//     // First reverse previous inventory changes
//     for (const oldItem of existingPO.items) {
//       if (oldItem.warehouse) {
//         await Inventory.updateOne(
//           { item: oldItem.item, warehouse: oldItem.warehouse },
//           { $inc: { onOrder: -oldItem.quantity } },
//           { session }
//         );
//       }
//     }

//     // Then apply new inventory changes
//     for (const newItem of validatedItems) {
//       if (newItem.warehouse) {
//         await Inventory.updateOne(
//           { item: newItem.item, warehouse: newItem.warehouse },
//           { $inc: { onOrder: newItem.quantity } },
//           { upsert: true, session }
//         );

//         // Update existing stock movement or create new one
//         await StockMovement.findOneAndUpdate(
//           { 
//             reference: existingPO._id,
//             item: newItem.item,
//             warehouse: newItem.warehouse
//           },
//           {
//             quantity: newItem.quantity,
//             unitPrice: newItem.unitPrice,
//             totalValue: newItem.totalAmount,
//             remarks: `Updated via PO ${updatedPO.refNumber || updatedPO._id}`
//           },
//           { 
//             upsert: true,
//             session 
//           }
//         );
//       }
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return new Response(
//       JSON.stringify({ 
//         success: true,
//         message: "Purchase order updated successfully",
//         data: updatedPO 
//       }),
//       { 
//         status: 200, 
//         headers: { "Content-Type": "application/json" } 
//       }
//     );

//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
    
//     console.error("Error updating purchase order:", error);
//     return new Response(
//       JSON.stringify({ 
//         success: false,
//         message: error.message || "Failed to update purchase order"
//       }),
//       { 
//         status: 500, 
//         headers: { "Content-Type": "application/json" } 
//       }
//     );
//   }
// }




import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import PurchaseOrder from '@/models/PurchaseOrder';
import Inventory from '@/models/Inventory';
import StockMovement from '@/models/StockMovement';
import { NextResponse } from "next/server";

// import mongoose from 'mongoose';
// import dbConnect from '@/lib/db';
// import PurchaseOrder from '@/models/PurchaseOrder';
// import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  await dbConnect();
  const { id } = params;               // ← no await here!

  try {
    // Make sure id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID' },
        { status: 400 }
      );
    }

    const order = await PurchaseOrder.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: order },
      { status: 200 }
    );
  } catch (err) {
    console.error('API Error fetching PO:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}


export async function PUT(request, { params }) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = params;
    const data = await request.json();

    const existingPO = await PurchaseOrder.findById(id).session(session);
    if (!existingPO) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { success: false, message: "Purchase order not found" },
        { status: 404 }
      );
    }

    if (!data.items || data.items.length === 0) {
      throw new Error("At least one item is required");
    }

    const validatedItems = data.items.map((item) => {
      const computed = {
        priceAfterDiscount: (item.unitPrice || 0) - (item.discount || 0),
        totalAmount: ((item.unitPrice || 0) - (item.discount || 0)) * (item.quantity || 0) + (item.freight || 0),
      };
      if (item.taxOption === "GST") {
        const gstRate = parseFloat(item.gstRate) || 0;
        const cgstRate = item.cgstRate !== undefined ? parseFloat(item.cgstRate) : gstRate / 2;
        const sgstRate = item.sgstRate !== undefined ? parseFloat(item.sgstRate) : gstRate / 2;
        computed.cgstAmount = computed.totalAmount * (cgstRate / 100);
        computed.sgstAmount = computed.totalAmount * (sgstRate / 100);
        computed.gstAmount = computed.cgstAmount + computed.sgstAmount;
        computed.igstAmount = 0;
      } else if (item.taxOption === "IGST") {
        const igstRate = parseFloat(item.igstRate) || parseFloat(item.gstRate) || 0;
        computed.igstAmount = computed.totalAmount * (igstRate / 100);
        computed.gstAmount = 0;
        computed.cgstAmount = 0;
        computed.sgstAmount = 0;
      }
      return {
        ...item,
        orderedQuantity: item.quantity || item.orderedQuantity || 0,
        ...computed,
      };
    });

    const totals = validatedItems.reduce(
      (acc, item) => {
        acc.totalBeforeDiscount += item.totalAmount;
        acc.gstTotal += item.taxOption === "IGST" ? item.igstAmount : item.gstAmount;
        return acc;
      },
      { totalBeforeDiscount: 0, gstTotal: 0 }
    );

    const grandTotal = totals.totalBeforeDiscount + totals.gstTotal + (data.freight || 0) + (data.rounding || 0);

    const updateData = {
      ...data,
      items: validatedItems,
      totalBeforeDiscount: totals.totalBeforeDiscount,
      gstTotal: totals.gstTotal,
      grandTotal,
      openBalance: grandTotal - ((data.totalDownPayment || 0) + (data.appliedAmounts || 0)),
    };

    const updatedPO = await PurchaseOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true, session }
    );

    for (const oldItem of existingPO.items) {
      if (oldItem.warehouse && oldItem.quantity) {
        await Inventory.updateOne(
          { item: oldItem.item, warehouse: oldItem.warehouse },
          { $inc: { onOrder: -oldItem.quantity } },
          { session }
        );
      }
    }

    for (const newItem of validatedItems) {
      if (newItem.warehouse && newItem.quantity) {
        await Inventory.updateOne(
          { item: newItem.item, warehouse: newItem.warehouse },
          { $inc: { onOrder: newItem.quantity } },
          { upsert: true, session }
        );

        await StockMovement.findOneAndUpdate(
          {
            reference: existingPO._id,
            item: newItem.item,
            warehouse: newItem.warehouse,
          },
          {
            quantity: newItem.quantity,
            unitPrice: newItem.unitPrice,
            totalValue: newItem.totalAmount,
            remarks: `Updated via PO ${updatedPO.refNumber || updatedPO._id}`,
          },
          {
            upsert: true,
            session,
          }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json(
      {
        success: true,
        message: "Purchase order updated successfully",
        data: updatedPO,
      },
      { status: 200 }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating purchase order:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update purchase order",
      },
      { status: 500 }
    );
  }
}
