import React, { useState, useEffect } from 'react';
import useSearch from '../hooks/useSearch';

const SupplierSearch = ({ onSelectSupplier, initialSupplier }) => {
  // Use initialSupplier if provided
  const [query, setQuery] = useState(initialSupplier?.supplierName || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(initialSupplier || null);

  // Fetch hook
  const supplierSearch = useSearch(async (searchQuery) => {
    if (!searchQuery) return [];
    const res = await fetch(`/api/suppliers?search=${encodeURIComponent(searchQuery)}`);
    return res.ok ? await res.json() : [];
  });

  // Update query and clear selection
  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    supplierSearch.handleSearch(val);
    setShowDropdown(true);
  };

  // Select supplier
  const handleSelect = (sup) => {
    setSelected(sup);
    setQuery(sup.supplierName);
    onSelectSupplier(sup);
    setShowDropdown(false);
  };

  // Hide dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest('.supplier-search-container')) setShowDropdown(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <div className="relative supplier-search-container">
      <input
        type="text"
        className="border px-4 py-2 w-full"
        placeholder="Search Supplier"
        value={query}
        onChange={handleChange}
        onFocus={() => setShowDropdown(true)}
      />

      {showDropdown && !selected && (
        <div className="absolute z-50 bg-white border w-full max-h-40 overflow-y-auto">
          {supplierSearch.loading && <p className="p-2">Loading...</p>}
          {!supplierSearch.loading && supplierSearch.results.length === 0 && (
            <p className="p-2 text-gray-500">No suppliers found.</p>
          )}
          {supplierSearch.results.map((sup) => (
            <div
              key={sup._id}
              onClick={() => handleSelect(sup)}
              className="p-2 cursor-pointer hover:bg-gray-200"
            >
              {sup.supplierName}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setQuery('');
            onSelectSupplier(null);
          }}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          title="Clear"
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default SupplierSearch;


// import React, { useState } from 'react';
// import useSearch from '../hooks/useSearch';

// const SupplierSearch = ({ onSelectSupplier }) => {
//   // Local state for the text input
//   const [query, setQuery] = useState('');
//   const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
//   const [selectedSupplier, setSelectedSupplier] = useState(null);

//   // useSearch hook to fetch supplier data based on query
//   const supplierSearch = useSearch(async (searchQuery) => {
//     if (!searchQuery) return [];
//     const res = await fetch(`/api/suppliers?search=${encodeURIComponent(searchQuery)}`);
//     return res.ok ? await res.json() : [];
//   });

//   // Update local query and trigger the search
//   const handleQueryChange = (e) => {
//     const newQuery = e.target.value;
//     setQuery(newQuery);
//     supplierSearch.handleSearch(newQuery);
//     setShowSupplierDropdown(true);
//     if (selectedSupplier) setSelectedSupplier(null);
//   };

//   const handleSupplierSelect = (supplier) => {
//     setSelectedSupplier(supplier);
//     onSelectSupplier(supplier);
//     setShowSupplierDropdown(false);
//     // Use supplier.supplierName consistently
//     setQuery(supplier.supplierName);
//   };

//   return (
//     <div className="relative mb-4">
//       <input
//         type="text"
//         placeholder="Search Supplier"
//         // Always use a fallback value so that value is never undefined
//         value={selectedSupplier ? selectedSupplier.supplierName : (query || "")}
//         onChange={handleQueryChange}
//         onFocus={() => setShowSupplierDropdown(true)}
//         className="border px-4 py-2 w-full"
//       />

//       {showSupplierDropdown && (
//         <div
//           className="absolute border bg-white w-full max-h-40 overflow-y-auto z-50"
//           style={{ top: '100%', left: 0 }}
//         >
//           {supplierSearch.loading && <p className="p-2">Loading...</p>}
//           {supplierSearch.results && supplierSearch.results.length > 0 ? (
//             supplierSearch.results.map((supplier) => (
//               <div
//                 key={supplier._id} // Ensure each element has a unique key
//                 onClick={() => handleSupplierSelect(supplier)}
//                 className={`p-2 cursor-pointer hover:bg-gray-200 ${
//                   selectedSupplier && selectedSupplier._id === supplier._id ? 'bg-blue-100' : ''
//                 }`}
//               >
//                 {supplier.supplierName}
//               </div>
//             ))
//           ) : (
//             !supplierSearch.loading && <p className="p-2 text-gray-500">No suppliers found.</p>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default SupplierSearch;
