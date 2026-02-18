// import dbConnect from '@/lib/db';
// import Inventory from '@/models/Inventory';
// import '@/models/warehouseModels';  // Register the Warehouse model
// import '@/models/ItemModels';       // Register the Item model

// export async function GET(req, { params }) {
//   await dbConnect();
//   const { id } = params;
//   try {
//     const inventory = await Inventory.findOne({ _id: id })
//       .populate('warehouse')
//       .populate('item')
//       .lean();

//     if (!inventory) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Inventory not found" }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     return new Response(
//       JSON.stringify({ success: true, data: inventory }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("Error fetching inventory record:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }




import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Inventory from "@/models/Inventory";

export async function GET(req, { params }) {
  await dbConnect();

  const { itemCode, warehouseId } = params;

  try {
    const inventory = await Inventory.findOne({
      item: itemCode,
      warehouse: warehouseId,
    });

    if (!inventory) {
      return NextResponse.json({ message: "Inventory not found" }, { status: 404 });
    }

    return NextResponse.json(inventory, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Server error", error }, { status: 500 });
  }
}

