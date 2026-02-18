import { useState } from "react";

export default function useSearch(fetchFn) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query) => {
    if (!query) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchFn(query);
      setResults(res);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, handleSearch };
}
