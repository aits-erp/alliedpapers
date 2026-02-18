import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ItemGroup from "@/models/ItemGroupModels";

// GET request: Fetch all item groups
export async function GET() {
  await dbConnect();

  try {
    const itemGroups = await ItemGroup.find();
    return NextResponse.json(itemGroups, { status: 200 });
  } catch (error) {
    console.error("Error fetching item groups:", error);
    return NextResponse.json({ message: "Error fetching item groups" }, { status: 500 });
  }
}

// POST request: Add a new item group
export async function POST(req) {
  await dbConnect();

  try {
    const { name, code } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ message: "Item group name and code are required" }, { status: 400 });
    }

    const newItemGroup = new ItemGroup({ name, code });
    await newItemGroup.save();

    return NextResponse.json(newItemGroup, { status: 201 });
  } catch (error) {
    console.error("Error adding item group:", error);
    return NextResponse.json({ message: "Error adding item group" }, { status: 500 });
  }
}

// DELETE request: Remove an item group
export async function DELETE(req) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Item group ID is required" }, { status: 400 });
    }

    await ItemGroup.findByIdAndDelete(id);
    return NextResponse.json({ message: "Item group deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting item group:", error);
    return NextResponse.json({ message: "Error deleting item group" }, { status: 500 });
  }
}
