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

    // ✅ Validate ObjectId
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

    // ✅ FIXED DATE FILTER: postingDate OR orderDate
    if (from || to) {
      const fromDate = from ? new Date(from + "T00:00:00.000Z") : null;
      const toDate = to ? new Date(to + "T23:59:59.999Z") : null;

      match.$or = [
        {
          postingDate: {
            ...(fromDate && { $gte: fromDate }),
            ...(toDate && { $lte: toDate }),
          },
        },
        {
          orderDate: {
            ...(fromDate && { $gte: fromDate }),
            ...(toDate && { $lte: toDate }),
          },
        },
      ];
    }

    const orders = await SalesOrder.find(match).lean();

    if (!orders.length) {
      return NextResponse.json({ data: emptyReport() });
    }

    let totalOrders = 0;
    let totalDispatchedOrders = 0;
    let totalPendingDispatchOrders = 0;

    let totalAmount = 0; 
    let totalQty = 0;

    const delayIntimation = [];
    const pendingForDispatch = [];
    const productMap = {};
    const stageMap = {}; // ✅ SALES STAGE REPORT

    const today = new Date().setHours(0, 0, 0, 0);

    for (const order of orders) {
      totalOrders++;

      const isDispatched = ["dispatched", "delivered", "closed"].includes(
        String(order.status || "").toLowerCase()
      );

      if (isDispatched) totalDispatchedOrders++;
      else totalPendingDispatchOrders++;

      totalAmount += Number(order.grandTotal || 0);

      /* ✅ SALES STAGE */
      const stage = order.statusStages || "Not Defined";
      if (!stageMap[stage]) {
        stageMap[stage] = {
          stage,
          totalOrders: 0,
          totalAmount: 0,
        };
      }
      stageMap[stage].totalOrders += 1;
      stageMap[stage].totalAmount += Number(order.grandTotal || 0);

      let orderQty = 0;

      for (const item of order.items || []) {
        const qty = Number(item.quantity || 0);
        const lineTotal = Number(item.totalAmount || 0);
        const gst = Number(item.gstAmount || 0);
        const tds = Number(item.tdsAmount || 0);

        const netAmount = lineTotal - gst - tds;

        orderQty += qty;
        totalQty += qty;

        const key = item.itemCode || item.itemName || "UNKNOWN";

        if (!productMap[key]) {
          productMap[key] = {
            itemName: item.itemName,
            totalQty: 0,
            totalNet: 0,
          };
        }

        productMap[key].totalQty += qty;
        productMap[key].totalNet += netAmount;
      }

      // ✅ Pending
      if (!isDispatched) {
        pendingForDispatch.push({
          salesNumber: order.salesNumber,
          customerName: order.customerName,
          status: order.status,
          quantity: orderQty,
          amount: order.grandTotal || 0,
        });
      }

      // ✅ Delay
      if (order.expectedDeliveryDate && !isDispatched) {
        const expected = new Date(order.expectedDeliveryDate).setHours(
          0,
          0,
          0,
          0
        );
        if (expected < today) {
          const daysDelayed = Math.floor(
            (today - expected) / (1000 * 60 * 60 * 24)
          );

          delayIntimation.push({
            salesNumber: order.salesNumber,
            customerName: order.customerName,
            expectedDeliveryDate: order.expectedDeliveryDate,
            daysDelayed,
          });
        }
      }
    }

    /* ✅ AVERAGE NSR */
    const overallNSR =
      totalQty > 0 ? Number((totalAmount / totalQty).toFixed(2)) : 0;

    const averageNSRByProduct = Object.values(productMap).map((p) => ({
      itemName: p.itemName,
      totalQty: p.totalQty,
      totalNetAmount: p.totalNet,
      nsrPerUnit:
        p.totalQty > 0
          ? Number((p.totalNet / p.totalQty).toFixed(2))
          : 0,
    }));

    return NextResponse.json({
      data: {
        // ✅ SUMMARY
        summaryOfOrders: {
          totalOrders,
          totalDispatchedOrders,
          totalPendingDispatchOrders,
          totalAmount,
          totalQty,
        },

        // ✅ SALES STAGE REPORT
        salesStageReport: Object.values(stageMap),

        // ✅ NSR
        averageNSR: {
          overall: overallNSR,
          byProduct: averageNSRByProduct,
        },

        pendingForDispatch,
        delayIntimation,
      },
    });
  } catch (error) {
    console.error("Sales Report Error:", error);
    return NextResponse.json({
      message: "Error generating sales report",
      error: error.message,
    });
  }
}

/* ✅ EMPTY REPORT STRUCTURE */
function emptyReport() {
  return {
    summaryOfOrders: {
      totalOrders: 0,
      totalDispatchedOrders: 0,
      totalPendingDispatchOrders: 0,
      totalAmount: 0,
      totalQty: 0,
    },
    salesStageReport: [],
    averageNSR: {
      overall: 0,
      byProduct: [],
    },
    pendingForDispatch: [],
    delayIntimation: [],
  };
}
