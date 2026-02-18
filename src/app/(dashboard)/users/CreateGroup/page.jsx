

"use client";

import { useState, useEffect } from "react";
import axios from 'axios';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  // Fetch groups when the page loads
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get("/api/groupscreate");
        setGroups(response.data);
      } catch (err) {
        setError("Error fetching groups. Please try again.");
        console.error("Error fetching groups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // Handle group creation form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await axios.post("/api/groupscreate", {
        name,
        description,
       // masterId: "masterId123", // Replace with actual user ID if needed
      });

      if (response.status === 201) {
        setName(""); // Clear form fields
        setDescription("");
        // Add the newly created group to the list without re-fetching
        setGroups([...groups, response.data]);
        alert("Group created successfully!");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Error creating group");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading groups...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Create Group</h1>
      
      {/* Group Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Group Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full border rounded p-2"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded disabled:opacity-50"
          disabled={creating}
        >
          {creating ? "Creating..." : "Create Group"}
        </button>
      </form>

      <hr className="my-8" />

      {/* Group Listing */}
      <h2 className="text-2xl font-semibold mb-4">Group List</h2>
      {groups.length === 0 ? (
        <p>No groups available.</p>
      ) : (
        <ul className="space-y-4">
          {groups.map((group) => (
            <li
              key={group._id}
              className="border p-4 rounded-lg flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold">{group.name}</h3>
                <p>{group.description}</p>
              </div>
              <div>
                <p className="text-sm">Master: {group.masterId}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
