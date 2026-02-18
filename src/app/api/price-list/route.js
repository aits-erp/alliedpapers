export async function GET(req, res) {
    const priceLists = [
      { _id: 'pl1', name: 'Retail Price' },
      { _id: 'pl2', name: 'Wholesale Price' },
      { _id: 'pl3', name: 'Special Price' },
    ];
  
    return new Response(JSON.stringify(priceLists), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  