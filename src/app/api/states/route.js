import { NextResponse } from 'next/server'; // Import for structured responses
import connectDb from '../../../lib/db'; // Ensure this points to your DB connection logic
import State from './schema';
import Country from '../countries/schema'; // Assuming a Country schema exists

// Handle GET Requests
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const countryCode = url.searchParams.get('country'); // Get the country code from the query string

    if (!countryCode) {
      return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
    }

    await connectDb();

    // Find the country by its code
    const country = await Country.findOne({ code: countryCode });
    if (!country) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    // Fetch states associated with the country
    const states = await State.find({ country: country._id });
    return NextResponse.json(states, { status: 200 });
  } catch (error) {
    console.error('Error fetching states:', error.message);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

// Handle POST Requests
export async function POST(req) {
  try {
    await connectDb();
    const { name, code, country } = await req.json(); // Parse incoming JSON body

    if (!name || !code || !country) {
      return NextResponse.json({ error: 'Name, code, and country are required' }, { status: 400 });
    }

    // Find the country by its code
    const countryDoc = await Country.findOne({ code: country });
    if (!countryDoc) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    // Create a new state
    const newState = new State({
      name,
      code,
      country: countryDoc._id,
    });
    await newState.save();

    return NextResponse.json(newState, { status: 201 });
  } catch (error) {
    console.error('Error adding state:', error.message);
    return NextResponse.json({ error: 'Failed to add state', details: error.message }, { status: 500 });
  }
}

// Handle DELETE Requests
export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const stateId = url.searchParams.get('id'); // Get the state ID from query params

    if (!stateId) {
      return NextResponse.json({ error: 'State ID is required' }, { status: 400 });
    }

    await connectDb();
    const deletedState = await State.findByIdAndDelete(stateId);
    if (!deletedState) {
      return NextResponse.json({ error: 'State not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'State deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting state:', error.message);
    return NextResponse.json({ error: 'Failed to delete state', details: error.message }, { status: 500 });
  }
}




// not working part ---------------------------------------------------
// src/app/api/states/route.js

// import { NextResponse } from 'next/server';
// import State from './schema';
// import Country from '../countries/schema';

// export async function GET(req) {
//   const { country } = req.query;
  
//   try {
//     const states = await State.find({ country: country });
//     return NextResponse.json(states);
//   } catch (error) {
//     console.error('Error fetching states:', error);
//     return NextResponse.json({ message: 'Failed to fetch states' }, { status: 500 });
//   }
// }

// export async function POST(req) {
//   const { name, code, country } = await req.json();

//   try {
//     const countryDoc = await Country.findById(country);
//     if (!countryDoc) {
//       return NextResponse.json({ message: 'Country not found' }, { status: 404 });
//     }

//     const newState = new State({ name, code, country: countryDoc._id });
//     await newState.save();

//     return NextResponse.json(newState, { status: 201 });
//   } catch (error) {
//     console.error('Error adding state:', error);
//     return NextResponse.json({ message: 'Failed to add state' }, { status: 500 });
//   }
// }
