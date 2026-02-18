import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Projection from "@/models/Projection";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// HELPER: Validate Auth
async function getAuthenticatedUser(req) {
  const token = getTokenFromHeader(req);
  const payload = await verifyJWT(token);
  if (!payload || !payload.companyId) {
    throw new Error("Unauthorized");
  }
  return payload;
}

// GET: Fetch a single projection
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { companyId } = await getAuthenticatedUser(req);
    const { id } = params;

    const projection = await Projection.findOne({ _id: id, companyId });

    if (!projection) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: projection });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT: Update a specific projection
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { companyId } = await getAuthenticatedUser(req);
    const { id } = params;
    const body = await req.json();

    // We only allow updating the 'rows', not the year/month/companyId to keep integrity
    // If you need to change year/month, it's better to delete and recreate
    const updatedProjection = await Projection.findOneAndUpdate(
      { _id: id, companyId },
      { $set: { rows: body.rows } }, // Only updating rows
      { new: true, runValidators: true }
    );

    if (!updatedProjection) {
      return NextResponse.json(
        { success: false, message: "Projection not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedProjection });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE: Remove a specific projection
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { companyId } = await getAuthenticatedUser(req);
    const { id } = params;

    const deleted = await Projection.findOneAndDelete({ _id: id, companyId });

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Projection not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Projection deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}