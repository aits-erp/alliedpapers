'use client';

import { useState, useEffect } from 'react';

export default function StatePage() {
  const [states, setStates] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const fetchStates = async () => {
    const res = await fetch('/api/states');
    const data = await res.json();
    setStates(data);
  };

  const addState = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code }),
      });
      setName('');
      setCode('');
      fetchStates();
    } catch (error) {
      console.error('Error adding state:', error.message);
    }
  };

  const deleteState = async (id) => {
    try {
      await fetch(`/api/states?id=${id}`, { method: 'DELETE' });
      fetchStates();
    } catch (error) {
      console.error('Error deleting state:', error.message);
    }
  };

  useEffect(() => {
    fetchStates();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">State Master</h1>

      <form onSubmit={addState} className="mb-6">
        <input
          type="text"
          placeholder="State Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border px-4 py-2 mr-2"
          required
        />
        <input
          type="text"
          placeholder="State Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border px-4 py-2 mr-2"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2"
        >
          Add State
        </button>
      </form>

      <ul>
        {states.map((state) => (
          <li key={state._id} className="flex justify-between items-center border-b py-2">
            <span>
              {state.name} ({state.code})
            </span>
            <button
              onClick={() => deleteState(state._id)}
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
