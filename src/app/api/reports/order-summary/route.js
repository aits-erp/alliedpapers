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

    // ✅ Date filter (postingDate OR orderDate)
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

    const orders = await SalesOrder.find(match)
      .sort({ createdAt: -1 })
      .lean();

    if (!orders.length) {
      return NextResponse.json({
        data: emptyReport(),
        rawOrders: [],
      });
    }

    let totalOrders = 0;
    let totalDispatchedOrders = 0;
    let totalPendingDispatchOrders = 0;
    let totalAmount = 0;
    let totalQty = 0;

    for (const order of orders) {
      totalOrders++;

      const isDispatched =
        ["dispatched", "delivered", "closed"].includes(
          String(order.status || "").toLowerCase()
        ) ||
        String(order.statusStages || "")
          .toLowerCase()
          .includes("dispatch");

      if (isDispatched) {
        totalDispatchedOrders++;
      } else {
        totalPendingDispatchOrders++;
      }

      totalAmount += Number(order.grandTotal || 0);

      for (const item of order.items || []) {
        totalQty += Number(item.quantity || 0);
      }
    }

    const totalDispatchedPercentage =
      totalOrders > 0
        ? Number(((totalDispatchedOrders / totalOrders) * 100).toFixed(2))
        : 0;

    const totalPendingPercentage =
      totalOrders > 0
        ? Number(((totalPendingDispatchOrders / totalOrders) * 100).toFixed(2))
        : 0;

    return NextResponse.json({
      data: {
        summaryOfOrders: {
          totalOrders,
          totalReceivedOrders: totalOrders,
          totalDispatchedOrders,
          totalPendingDispatchOrders,
          totalDispatchedPercentage,
          totalPendingPercentage,
          totalAmount,
          totalQty,
        },
      },

      // ✅ TABLE DATA
      rawOrders: orders,
    });
  } catch (error) {
    console.error("Order Summary Error:", error);

    return NextResponse.json(
      {
        message: "Error generating order summary",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/* ✅ EMPTY STRUCTURE */
function emptyReport() {
  return {
    summaryOfOrders: {
      totalOrders: 0,
      totalReceivedOrders: 0,
      totalDispatchedOrders: 0,
      totalPendingDispatchOrders: 0,
      totalDispatchedPercentage: 0,
      totalPendingPercentage: 0,
      totalAmount: 0,
      totalQty: 0,
    },
  };
}
