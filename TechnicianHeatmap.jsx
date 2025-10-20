import React, { useState, useEffect } from 'react';

const TechnicianHeatmap = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year

  useEffect(() => {
    fetchHeatmapData();
  }, [timeRange]);

  const fetchHeatmapData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/warden/maintenance-heatmap?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setHeatmapData(data.heatmap);
    } catch (error) {
      setError('Failed to fetch heatmap data');
    } finally {
      setLoading(false);
    }
  };

  const getIntensityColor = (intensity) => {
    // Scale from light yellow to deep red based on intensity (0-100)
    if (intensity === 0) return 'bg-gray-100';
    if (intensity < 25) return 'bg-yellow-100';
    if (intensity < 50) return 'bg-yellow-300';
    if (intensity < 75) return 'bg-orange-400';
    return 'bg-red-500';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Maintenance Heatmap</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-4 py-2 rounded-md ${
                timeRange === 'week'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-4 py-2 rounded-md ${
                timeRange === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-4 py-2 rounded-md ${
                timeRange === 'year'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Year
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          {heatmapData.map((floor) => (
            <div key={floor.floorNumber} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Floor {floor.floorNumber}</h3>
              <div className="grid grid-cols-5 gap-2">
                {floor.rooms.map((room) => (
                  <div
                    key={room.roomNumber}
                    className={`${getIntensityColor(room.intensity)} h-12 rounded-md flex items-center justify-center cursor-pointer group relative`}
                    title={`Room ${room.roomNumber}: ${room.maintenanceCount} requests`}
                  >
                    <span className="text-xs font-medium">{room.roomNumber}</span>
                    <div className="absolute hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 -mt-16">
                      Requests: {room.maintenanceCount}<br />
                      Last: {new Date(room.lastMaintenance).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Intensity Scale:</span>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-100 rounded"></div>
              <span className="text-sm">None</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-yellow-100 rounded"></div>
              <span className="text-sm">Low</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-yellow-300 rounded"></div>
              <span className="text-sm">Medium</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-orange-400 rounded"></div>
              <span className="text-sm">High</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-red-500 rounded"></div>
              <span className="text-sm">Critical</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianHeatmap;