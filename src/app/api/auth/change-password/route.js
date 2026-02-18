import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();

  try {
    const token = getTokenFromHeader(req);
    const session = await verifyJWT(token);

    if (!session)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { message: "Old & New password required" },
        { status: 400 }
      );
    }

    // 🔥 find logged-in company user
    const user = await CompanyUser.findById(session.id || session._id);

    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    // verify old password
    const match = await bcrypt.compare(oldPassword, user.password);

    if (!match)
      return NextResponse.json(
        { message: "Old password incorrect" },
        { status: 400 }
      );

    // hash new password
    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { message: err.message },
      { status: 500 }
    );
  }
}
