import dbConnect from "@/lib/db";
import AccountHead from "@/models/AccountHead";

// GET /api/account-head
// Returns all account head documents.
export async function GET(req) {
  try {
    await dbConnect();
    const accountHeads = await AccountHead.find({});
    return new Response(
      JSON.stringify({ success: true, data: accountHeads }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching Account Heads:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// POST /api/account-head
// Creates a new Account Head document.
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { accountHeadCode, accountHeadDescription, status } = body;

    if (!accountHeadCode || !accountHeadDescription || !status) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const newAccountHead = new AccountHead({
      accountHeadCode,
      accountHeadDescription,
      status,
    });

    await newAccountHead.save();
    return new Response(
      JSON.stringify({ success: true, data: newAccountHead }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating Account Head:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
