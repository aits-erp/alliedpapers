import connectDb from '../../../lib/db';
import Country from './schema';


export async function GET(request) {
  try {
    await connectDb();
    const countries = await Country.find();
    return new Response(JSON.stringify(countries), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDb();
    const body = await request.json();
    const { name, code } = body;

    const newCountry = new Country({ name, code });
    await newCountry.save();
    return new Response(JSON.stringify(newCountry), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    await connectDb();
    const deletedCountry = await Country.findByIdAndDelete(id);
    if (!deletedCountry) throw new Error('Country not found');
    return new Response(JSON.stringify({ message: 'Country deleted' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
