import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ItemGroup from "@/models/ItemGroupModels";

export async function DELETE(req) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Item group ID is required" }, { status: 400 });
    }

    const deletedItemGroup = await ItemGroup.findByIdAndDelete(id);

    if (!deletedItemGroup) {
      return NextResponse.json({ message: "Item group not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Item group deleted successfully", deletedItemGroup }, { status: 200 });
  } catch (error) {
    console.error("Error deleting item group:", error);
    return NextResponse.json({ message: "Error deleting item group", error: error.message }, { status: 500 });
  }
}
