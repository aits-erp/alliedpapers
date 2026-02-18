
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db"; // Your DB connection helper
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

// GET: List all projections for the company
export async function GET(req) {
  try {
    await dbConnect();
    const { companyId } = await getAuthenticatedUser(req);

    const projections = await Projection.find({ companyId })
      .sort({ year: -1, month: 1 }) // Sort by latest year
      .lean();

    return NextResponse.json({ success: true, data: projections });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Server Error" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

// POST: Create a new projection
export async function POST(req) {
  try {
    await dbConnect();
    const { companyId } = await getAuthenticatedUser(req);
    const body = await req.json();

    const { year, month, rows } = body;

    // Check if projection already exists for this month/year
    const existing = await Projection.findOne({ companyId, year, month });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Projection for ${month} ${year} already exists.` },
        { status: 400 }
      );
    }

    const newProjection = await Projection.create({
      companyId,
      year,
      month,
      rows,
    });

    return NextResponse.json({ success: true, data: newProjection }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Server Error" },
      { status: 500 }
    );
  }
}