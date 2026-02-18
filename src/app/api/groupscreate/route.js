import Group from "@/models/groupModels";

import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

// Handle GET request to fetch all groups
export async function GET() {
  await dbConnect(); // Ensure connection is established

  try {
    const groups = await Group.find(); // Get all groups from the database
    return NextResponse.json(groups, { status: 200 });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ message: "Error fetching groups" }, { status: 500 });
  }
}

// Handle POST request to create a new group
export async function POST(req) {
  await dbConnect(); // Ensure connection is established

  try {
    const body = await req.json();
    const { name, description, masterId } = body;

    // Create a new group document
    const newGroup = new Group({
      name,
      description,
      //masterId,
      //members: [masterId], // Add the master as the first member
    });

    // Save the new group to the database
    await newGroup.save();

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ message: "Error creating group" }, { status: 500 });
  }
}
