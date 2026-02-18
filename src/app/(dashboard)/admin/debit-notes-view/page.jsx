"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FaEdit, FaTrash, FaEye, FaEnvelope, FaWhatsapp } from "react-icons/fa";

export default function DebitNoteView() {
  const [notes, setNotes] = useState([]);
  const router = useRouter();

  const fetchDebitNotes = async () => {
    try {
      const res = await axios.get("/api/debit-note");
      // Assuming your API returns { success: true, data: [...] }
      if (res.data.success) {
        setNotes(res.data.data);
      } else {
        setNotes(res.data);
      }
    } catch (error) {
      console.error("Error fetching Debit Notes:", error);
    }
  };

  useEffect(() => {
    fetchDebitNotes();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this Debit Note?")) return;
    try {
      const res = await axios.delete(`/api/debit-note/${id}`);
      if (res.data.success) {
        alert("Deleted successfully");
        fetchDebitNotes();
      }
    } catch (error) {
      console.error("Error deleting Debit Note:", error);
      alert("Failed to delete Debit Note");
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6 text-center">Debit Note List</h1>
      <div className="flex justify-end mb-4">
        <Link href="/admin/debit-notes-view/new">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
            <FaEdit className="mr-2" />
            Create New Debit Note
          </button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 border-b">document No.</th>
              <th className="py-3 px-4 border-b">Supplier Name</th>
              <th className="py-3 px-4 border-b">Reference Number</th>
              <th className="py-3 px-4 border-b">Status</th>
              <th className="py-3 px-4 border-b">Grand Total</th>
              <th className="py-3 px-4 border-b">Created At</th>
              <th className="py-3 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note) => (
              <tr key={note._id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 border-b text-center">{note.documentNumber}</td>
                <td className="py-3 px-4 border-b text-center">{note.supplierName}</td>
                <td className="py-3 px-4 border-b text-center">{note.refNumber}</td>
                <td className="py-3 px-4 border-b text-center">{note.status}</td>
                <td className="py-3 px-4 border-b text-center">
                  {parseFloat(note.grandTotal).toFixed(2)}
                </td>
                <td className="py-3 px-4 border-b text-center">
                  {new Date(note.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 border-b">
                  <div className="flex justify-center space-x-2">
                    <Link href={`/admin/debit-notes-view/${note._id}`}>
                      <button
                        className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                    </Link>
                    <Link href={`/admin/debit-notes-view/${note._id}/edit`}>
                      <button
                        className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(note._id)}
                      className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-200"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                    <Link href={`/admin/debit-note/${note._id}/send-email`}>
                      <button
                        className="flex items-center px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition duration-200"
                        title="Send Email"
                      >
                        <FaEnvelope />
                      </button>
                    </Link>
                    <Link href={`/admin/debit-note/${note._id}/send-whatsapp`}>
                      <button
                        className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200"
                        title="Send WhatsApp"
                      >
                        <FaWhatsapp />
                      </button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {notes.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  No Debit Notes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

