'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ItemGroupPage() {
  const [itemGroups, setItemGroups] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  // Fetch item groups from the API
  const fetchItemGroups = async () => {
    try {
      const res = await axios.get('/api/itemGroups');
      setItemGroups(res.data);
    } catch (error) {
      console.error('Error fetching item groups:', error.message);
    }
  };

  // Add a new item group
  const addItemGroup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/itemGroups', { name, code });
      setName(''); // Clear the input fields
      setCode('');
      fetchItemGroups(); // Refresh the item group list
    } catch (error) {
      console.error('Error adding item group:', error.message);
    }
  };

  // Delete an item group
  const deleteItemGroup = async (id) => {
    try {
      await axios.delete(`/api/itemGroups`, { params: { id } });
      fetchItemGroups(); // Refresh the item group list
    } catch (error) {
      console.error('Error deleting item group:', error.message);
    }
  };

  // Fetch item groups when the component mounts
  useEffect(() => {
    fetchItemGroups();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Item Group Master</h1>

      {/* Form to add a new item group */}
      <form onSubmit={addItemGroup} className="mb-6">
        <input
          type="text"
          placeholder="Item Group Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border px-4 py-2 mr-2"
          required
        />
        <input
          type="text"
          placeholder="Item Group Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border px-4 py-2 mr-2"
          required
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2">
          Add Item Group
        </button>
      </form>

      {/* List of item groups */}
      <ul>
        {itemGroups.map((itemGroup) => (
          <li key={itemGroup._id} className="flex justify-between items-center border-b py-2">
            <span>
              {itemGroup.name} ({itemGroup.code})
            </span>
            <button
              onClick={() => deleteItemGroup(itemGroup._id)}
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




// 'use client';

// import { useState, useEffect } from 'react';

// export default function ItemGroupPage() {
//   const [itemGroups, setItemGroups] = useState([]);
//   const [name, setName] = useState('');
//   const [code, setCode] = useState('');

//   // Fetch item groups from the API
//   const fetchItemGroups = async () => {
//     const res = await fetch('/api/itemGroups');
//     const data = await res.json();
//     setItemGroups(data);
//   };

//   // Add a new item group
//   const addItemGroup = async (e) => {
//     e.preventDefault();
//     try {
//       await fetch('/api/itemGroups', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ name, code }),
//       });
//       setName(''); // Clear the input fields
//       setCode('');
//       fetchItemGroups(); // Refresh the item group list
//     } catch (error) {
//       console.error('Error adding item group:', error.message);
//     }
//   };

//   // Delete an item group
//   const deleteItemGroup = async (id) => {
//     try {
//       await fetch(`/api/itemGroups?id=${id}`, { method: 'DELETE' });
//       fetchItemGroups(); // Refresh the item group list
//     } catch (error) {
//       console.error('Error deleting item group:', error.message);
//     }
//   };

//   // Fetch item groups when the component mounts
//   useEffect(() => {
//     fetchItemGroups();
//   }, []);

//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">Item Group Master</h1>

//       {/* Form to add a new item group */}
//       <form onSubmit={addItemGroup} className="mb-6">
//         <input
//           type="text"
//           placeholder="Item Group Name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           className="border px-4 py-2 mr-2"
//           required
//         />
//         <input
//           type="text"
//           placeholder="Item Group Code"
//           value={code}
//           onChange={(e) => setCode(e.target.value)}
//           className="border px-4 py-2 mr-2"
//           required
//         />
//         <button
//           type="submit"
//           className="bg-blue-500 text-white px-4 py-2"
//         >
//           Add Item Group
//         </button>
//       </form>

//       {/* List of item groups */}
//       <ul>
//         {itemGroups.map((itemGroup) => (
//           <li key={itemGroup._id} className="flex justify-between items-center border-b py-2">
//             <span>
//               {itemGroup.name} ({itemGroup.code})
//             </span>
//             <button
//               onClick={() => deleteItemGroup(itemGroup._id)}
//               className="bg-red-500 text-white px-2 py-1"
//             >
//               Delete
//             </button>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }
