'use client';

import { useState, useEffect } from 'react';

export default function CountryPage() {
  const [countries, setCountries] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const fetchCountries = async () => {
    const res = await fetch('/api/countries');
    const data = await res.json();
    setCountries(data);
  };

  const addCountry = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code }),
      });
      setName('');
      setCode('');
      fetchCountries();
    } catch (error) {
      console.error('Error adding country:', error.message);
    }
  };

  const deleteCountry = async (id) => {
    try {
      await fetch(`/api/countries?id=${id}`, { method: 'DELETE' });
      fetchCountries();
    } catch (error) {
      console.error('Error deleting country:', error.message);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Country Master</h1>
      
      <form onSubmit={addCountry} className="mb-6">
        <input
          type="text"
          placeholder="Country Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border px-4 py-2 mr-2"
          required
        />
        <input
          type="text"
          placeholder="Country Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border px-4 py-2 mr-2"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2"
        >
          Add Country
        </button>
      </form>

      <ul>
        {countries.map((country) => (
          <li key={country._id} className="flex justify-between items-center border-b py-2">
            <span>
              {country.name} ({country.code})
            </span>
            <button
              onClick={() => deleteCountry(country._id)}
              className="bg-red-500 text-white px-2 py-1"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
