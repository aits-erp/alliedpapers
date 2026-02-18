import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";
import Customer from "@/models/CustomerModel";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const companyId = searchParams.get("companyId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!companyId) {
      return NextResponse.json({ message: "companyId is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return NextResponse.json({ message: "Invalid companyId" }, { status: 400 });
    }

    await dbConnect();

    const match = {
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    // Date filter: supports orderDate OR postingDate
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

    // populate customer to get zone (assumes SalesOrder.customer is ObjectId ref to Customer)
    const orders = await SalesOrder.find(match)
      .populate({ path: "customer", select: "zone name customerName" })
      .lean();

    if (!orders || !orders.length) {
      return NextResponse.json({ data: emptyReport() });
    }

    // Aggregation holders
    let totalOrders = 0;
    let totalDispatchedOrders = 0;
    let totalPendingDispatchOrders = 0;
    let totalAmount = 0;
    let totalQty = 0;

    const pendingForDispatch = [];
    const delayIntimation = [];
    const productMap = {}; // for NSR by product
    const stageMap = {}; // sales stage summary
    const salesRows = []; // detailed rows (zone, customer, product, qty, net, stage, date)

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const order of orders) {
      totalOrders++;

      const status = String(order.status || "").toLowerCase();
      const isDispatched = ["dispatched", "delivered", "closed"].includes(status);

      if (isDispatched) totalDispatchedOrders++;
      else totalPendingDispatchOrders++;

      const orderGrand = Number(order.grandTotal || 0);
      totalAmount += orderGrand;

      // Sales stage
      const stage = order.statusStages || order.status || "Not Defined";
      if (!stageMap[stage]) stageMap[stage] = { stage, totalOrders: 0, totalAmount: 0 };
      stageMap[stage].totalOrders += 1;
      stageMap[stage].totalAmount += orderGrand;

      // Get zone from populated customer (safe fallback)
      const customer = order.customer || {};
      const customerName = order.customerName || customer.name || customer.customerName || "Unknown Customer";
      const zone = customer.zone || (order.zone ? order.zone : "Unknown Zone");

      // calculate item-level rows
      let orderQty = 0;
      for (const item of order.items || []) {
        const qty = Number(item.quantity || 0);
        const lineTotal = Number(item.totalAmount || 0);
        const gst = Number(item.gstAmount || 0);
        const tds = Number(item.tdsAmount || 0);
        const netAmount = lineTotal - gst - tds;

        orderQty += qty;
        totalQty += qty;

        // push a salesRow for this item (customer-level + zone)
        salesRows.push({
          salesNumber: order.salesNumber || order._id,
          zone,
          customerId: order.customer || order.customerId || null,
          customerName,
          itemCode: item.itemCode || null,
          itemName: item.itemName || "Unknown Item",
          qty,
          netAmount,
          stage: stage,
          orderDate: order.orderDate || order.postingDate || null,
        });

        // product map for NSR
        const key = item.itemCode || item.itemName || "UNKNOWN";
        if (!productMap[key]) {
          productMap[key] = { itemName: item.itemName || key, totalQty: 0, totalNet: 0 };
        }
        productMap[key].totalQty += qty;
        productMap[key].totalNet += netAmount;
      }

      // pending list
      if (!isDispatched) {
        pendingForDispatch.push({
          salesNumber: order.salesNumber || order._id,
          customerName,
          status: order.status,
          quantity: orderQty,
          amount: orderGrand,
        });
      }

      // delay intimation (based on expectedDeliveryDate)
      if (order.expectedDeliveryDate && !isDispatched) {
        const expected = new Date(order.expectedDeliveryDate);
        expected.setHours(0, 0, 0, 0);
        if (expected < today) {
          const daysDelayed = Math.floor((today - expected) / (1000 * 60 * 60 * 24));
          delayIntimation.push({
            salesNumber: order.salesNumber || order._id,
            customerName,
            expectedDeliveryDate: order.expectedDeliveryDate,
            daysDelayed,
          });
        }
      }
    }

    // Average NSR overall & by product
    const overallNSR = totalQty > 0 ? Number((totalAmount / totalQty).toFixed(2)) : 0;
    const averageNSRByProduct = Object.values(productMap).map(p => ({
      itemName: p.itemName,
      totalQty: p.totalQty,
      totalNetAmount: Number(p.totalNet.toFixed ? p.totalNet.toFixed(2) : p.totalNet),
      nsrPerUnit: p.totalQty > 0 ? Number((p.totalNet / p.totalQty).toFixed(2)) : 0,
    }));

    // Build final response shape
    const response = {
      summaryOfOrders: {
        totalOrders,
        totalDispatchedOrders,
        totalPendingDispatchOrders,
        totalAmount: Number(totalAmount.toFixed(2)),
        totalQty,
      },
      salesStageReport: Object.values(stageMap),
      averageNSR: {
        overall: overallNSR,
        byProduct: averageNSRByProduct,
      },
      pendingForDispatch,
      delayIntimation,
      // detailed item-level rows including zone & customer
      salesRows,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("Sales Report Error:", error);
    return NextResponse.json({ message: "Error generating sales report", error: error.message }, { status: 500 });
  }
}

/* empty report */
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
    salesRows: [],
  };
}
