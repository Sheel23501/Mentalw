import React, { useEffect, useState } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const TEST_TYPES = ['PHQ-9', 'GAD-7'];

const AssessmentProgress = () => {
  const { currentUser } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(TEST_TYPES[0]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const resultsRef = collection(db, `users/${currentUser.uid}/testResults`);
        const q = query(resultsRef, orderBy('timestamp', 'asc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setResults(data);
      } catch (err) {
        setResults([]);
      }
      setLoading(false);
    };
    fetchResults();
  }, [currentUser]);

  // Filtered results for selected test type
  const filteredResults = results.filter(r => r.testType === selectedTest);

  // Format date
  const formatDate = ts => {
    if (!ts) return '';
    const d = new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-8 w-full max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Self-Assessment Progress</h2>
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="testType" className="text-sm font-medium text-gray-700">Filter by Test:</label>
        <select
          id="testType"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          value={selectedTest}
          onChange={e => setSelectedTest(e.target.value)}
        >
          {TEST_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading your progress...</div>
      ) : results.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No self-assessment results yet.<br />
          <span className="text-green-600 font-medium">Take a test to start tracking your progress!</span>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto mb-8">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-400 py-4">No results for {selectedTest} yet.</td>
                  </tr>
                ) : (
                  filteredResults.map(r => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(r.timestamp)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{r.testType}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{r.score}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Line Chart */}
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredResults.map(r => ({
                date: formatDate(r.timestamp),
                score: r.score
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#16a34a" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default AssessmentProgress; 