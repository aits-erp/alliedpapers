import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Item from "@/models/ItemModels";

/* ================= CREATE ITEM ================= */
export async function POST(req) {
  try {
    // 🔐 Build-time safety
    if (!process.env.MONGO_URI) {
      return NextResponse.json({ success: false, msg: "DB not available" });
    }

    await dbConnect();

    const data = await req.json();
    console.log("Received data:", data);

    // ✅ Validation
    if (
      !data.itemCode ||
      !data.itemName ||
      !data.category ||
      !data.unitPrice ||
      !data.quantity
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const item = await Item.create(data);

    return NextResponse.json(
      { success: true, item },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create item error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/* ================= GET ITEMS ================= */
export async function GET() {
  try {
    // 🔐 Build-time safety
    if (!process.env.MONGO_URI) {
      return NextResponse.json([], { status: 200 });
    }

    await dbConnect();

    const items = await Item.find({});
    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error("Fetch items error:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}


// // import dbConnect from "@/lib/db";
// // import Item from "@/models/ItemModels";

// export async function getStaticProps() {
//   await dbConnect();
//   const items = await Item.find().lean();

//   return {
//     props: { items: JSON.parse(JSON.stringify(items)) },
//   };
// }




