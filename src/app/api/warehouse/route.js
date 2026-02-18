import dbConnect from "@/lib/db";
import Warehouse from "@/models/warehouseModels";

// ✅ GET ALL WAREHOUSES
export async function GET() {
  try {
    await dbConnect();
    const warehouses = await Warehouse.find({});
    return new Response(JSON.stringify(warehouses), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching warehouses", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ✅ CREATE A NEW WAREHOUSE
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const newWarehouse = await Warehouse.create(body);
    return new Response(JSON.stringify(newWarehouse), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return new Response(
      JSON.stringify({ message: "Error creating warehouse", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
