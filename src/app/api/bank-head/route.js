import dbConnect from "@/lib/db";
import BankHead from "@/models/BankHead";

// GET /api/bank-head: Retrieve all Bank Head records
export async function GET(req) {
  try {
    await dbConnect();
    const bankHeads = await BankHead.find({});
    return new Response(JSON.stringify({ success: true, data: bankHeads }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching bank head details:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// POST /api/bank-head: Create a new Bank Head record
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { accountCode, accountName, accountHead, status, isActualBank } = body;
    // Validate required fields (isActualBank is optional because it defaults to false)
    if (!accountCode || !accountName || !accountHead || !status) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    const newBankHead = new BankHead({
      accountCode,
      accountName,
      accountHead,
      status,
      isActualBank: isActualBank ?? false, // Use provided value or default to false
    });
    await newBankHead.save();
    return new Response(
      JSON.stringify({ success: true, data: newBankHead }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating bank head:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}



// import dbConnect from "@/lib/db";
// import BankHead from "@/models/BankHead";

// // GET /api/bank-head: Retrieve all Bank Head records
// export async function GET(req) {
//   try {
//     await dbConnect();
//     const bankHeads = await BankHead.find({});
//     return new Response(JSON.stringify({ success: true, data: bankHeads }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Error fetching bank head details:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       {
//         status: 500,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   }
// }

// // POST /api/bank-head: Create a new Bank Head record
// export async function POST(req) {
//   try {
//     await dbConnect();
//     const body = await req.json();
//     const { accountCode, accountName, accountHead, status } = body;
//     if (!accountCode || !accountName || !accountHead || !status) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Missing required fields" }),
//         {
//           status: 400,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }
//     const newBankHead = new BankHead({
//       accountCode,
//       accountName,
//       accountHead,
//       status,
//     });
//     await newBankHead.save();
//     return new Response(
//       JSON.stringify({ success: true, data: newBankHead }),
//       {
//         status: 201,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   } catch (error) {
//     console.error("Error creating bank head:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       {
//         status: 500,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   }
// }
