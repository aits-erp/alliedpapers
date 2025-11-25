import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const companyId = searchParams.get("companyId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!companyId) {
      return NextResponse.json(
        { message: "companyId is required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return NextResponse.json(
        { message: "Invalid companyId" },
        { status: 400 }
      );
    }

    await dbConnect();

    const match = {
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    // ✅ Date filter
    if (from || to) {
      const fromDate = from ? new Date(from + "T00:00:00.000Z") : null;
      const toDate = to ? new Date(to + "T23:59:59.999Z") : null;

      match.$or = [
        {
          orderDate: {
            ...(fromDate && { $gte: fromDate }),
            ...(toDate && { $lte: toDate }),
          },
        },
        {
          postingDate: {
            ...(fromDate && { $gte: fromDate }),
            ...(toDate && { $lte: toDate }),
          },
        },
      ];
    }

    const orders = await SalesOrder.find(match).lean();

    /* ✅ ONLY PENDING BASED ON YOUR GIVEN STAGES */
    const pendingOrders = orders.filter((order) => {
      const stage = String(order.statusStages || "").trim().toLowerCase();

      // THESE 2 ARE FINAL – NOT PENDING
      const isDispatched =
        stage === "dispatch with qty" ||
        stage === "delivered to customer";

      return !isDispatched;
    });

    let totalPendingOrders = 0;
    let totalQty = 0;
    let totalAmount = 0;

    for (const order of pendingOrders) {
      totalPendingOrders++;
      totalAmount += Number(order.grandTotal || 0);

      for (const item of order.items || []) {
        totalQty += Number(item.quantity || 0);
      }
    }

    return NextResponse.json({
      data: {
        totalPendingOrders,
        totalQty,
        totalAmount,
      },

      // 🟢 Only pending orders list
      rawOrders: pendingOrders,
    });
  } catch (error) {
    console.error("Pending Dispatch Error:", error);

    return NextResponse.json(
      {
        message: "Error generating pending dispatch report",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
