import React, { useState } from 'react';
import useSearch from '../hooks/useSearch';

const CountryStateSearch = ({ onSelectCountry, onSelectState }) => {
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);

  const countrySearch = useSearch(async (query) => {
    const res = await fetch(`/api/countries?search=${query}`);
    return res.ok ? await res.json() : [];
  });

  const stateSearch = useSearch(async (query) => {
    const res = await fetch(`/api/states?country=${selectedCountry?.code}&search=${query}`);
    return res.ok ? await res.json() : [];
  });

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setSelectedState(null); // Reset state if the country changes
    onSelectCountry(country); // Prop callback
    setShowCountryDropdown(false); // Hide dropdown
  };

  const handleStateSelect = (state) => {
    setSelectedState(state);
    onSelectState(state); // Prop callback
    setShowStateDropdown(false); // Hide dropdown
  };

  return (
    <div>
      {/* Country Search */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search Country"
          value={selectedCountry?.name || countrySearch.query}
          onChange={(e) => {
            countrySearch.handleSearch(e.target.value);
            setShowCountryDropdown(true);
          }}
          onFocus={() => setShowCountryDropdown(true)}
          className="border px-4 py-2 w-full"
        />
        {showCountryDropdown && (
          <div className="absolute border bg-white w-full max-h-40 overflow-y-auto z-10">
            {countrySearch.loading && <p className="p-2">Loading...</p>}
            {countrySearch.results.map((country) => (
              <div
                key={country.code}
                onClick={() => handleCountrySelect(country)}
                className={`p-2 cursor-pointer hover:bg-gray-200 ${
                  selectedCountry?.code === country.code ? 'bg-blue-100' : ''
                }`}
              >
                {country.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* State Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search State"
          value={selectedState?.name || stateSearch.query}
          onChange={(e) => {
            stateSearch.handleSearch(e.target.value);
            setShowStateDropdown(true);
          }}
          onFocus={() => setShowStateDropdown(true)}
          className="border px-4 py-2 w-full"
          disabled={!selectedCountry} // Disable state search if no country is selected
        />
        {showStateDropdown && selectedCountry && (
          <div className="absolute border bg-white w-full max-h-40 overflow-y-auto z-10">
            {stateSearch.loading && <p className="p-2">Loading...</p>}
            {stateSearch.results.map((state) => (
              <div
                key={state._id}
                onClick={() => handleStateSelect(state)}
                className={`p-2 cursor-pointer hover:bg-gray-200 ${
                  selectedState?._id === state._id ? 'bg-blue-100' : ''
                }`}
              >
                {state.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryStateSearch;
