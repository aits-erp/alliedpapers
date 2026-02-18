// // File: /app/api/item/[id]/route.js

// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Item from "@/models/ItemModels";

// export async function GET(request, { params }) {
//   try {
//     await dbConnect();

//     const id = params?._id;
//     if (!id) {
//       return NextResponse.json({ message: "Missing ID" }, { status: 400 });
//     }

//     const item = await Item.findById(id);
//     if (!item) {
//       return NextResponse.json({ message: "Item not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, data: item }, { status: 200 });
//   } catch (error) {
//     console.error("Error fetching item:", error);
//     return NextResponse.json(
//       { message: "Error fetching item", error: error.message },
//       { status: 500 }
//     );
//   }
// }




// // Update an item
// export async function PUT(req, { params }) {
//   try {
//      await dbConnect();
//     const data = await req.json();
//     const updatedItem = await Item.findByIdAndUpdate(params.id, data, { new: true });
//     if (!updatedItem) {
//       return NextResponse.json({ error: "Item not found" }, { status: 404 });
//     }
//     return NextResponse.json(updatedItem, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
//   }
// }

// // Delete an item
// export async function DELETE(req, { params }) {
//   try {
//      await dbConnect();
//     const deletedItem = await Item.findByIdAndDelete(params.id);
//     if (!deletedItem) {
//       return NextResponse.json({ error: "Item not found" }, { status: 404 });
//     }
//     return NextResponse.json({ message: "Item deleted successfully" }, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
//   }
// }
