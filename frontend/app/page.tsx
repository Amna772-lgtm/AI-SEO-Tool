"use client";

import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!url) return alert("Please enter a URL");

    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:8000/analyze/",
        { url: url }
      );
      setResult(response.data);
    } catch (error) {
      console.error(error);
      alert("Error analyzing site");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10">
      <h1 className="text-3xl font-bold mb-6">AI SEO Tool</h1>

      <div className="flex gap-1 w-full max-w-xl">
        <input
          type="text"
          placeholder="Enter website URL"
          className="flex-1 border rounded p-3"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <button
          onClick={handleAnalyze}
          className="bg-blue-600 text-white px-6 py-3 rounded"
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {result && (
        <div className="mt-6 p-4 border rounded bg-gray-100 w-full max-w-xl">
          <p><strong>Message:</strong> {result.message}</p>
          <p><strong>Site ID:</strong> {result.site_id}</p>
        </div>
      )}
    </div>
  );
}