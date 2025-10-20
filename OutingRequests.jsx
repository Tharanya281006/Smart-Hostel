import React, { useState, useEffect } from 'react';

const OutingRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    reason: ''
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchOutingRequests();
  }, []);

  const fetchOutingRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/resident/outing-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch outing requests');
      }
      
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to fetch outing requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitSuccess(false);
    
    // Validate that end time is after start time
    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);
    
    if (endDate <= startDate) {
      setError('End time must be after start time');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/resident/submit-outing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit outing request');
      }
      
      setSubmitSuccess(true);
      setFormData({
        startTime: '',
        endTime: '',
        reason: ''
      });
      fetchOutingRequests(); // Refresh the list
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to submit outing request');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Format date for datetime-local input
  const formatDateTimeForInput = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  if (loading) {
    return <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Outing Requests</h2>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {submitSuccess && (
        <div className="bg-green-50 text-green-700 p-4 rounded-md mb-4">
          Outing request submitted successfully!
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">New Outing Request</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startTime">
                Start Time
              </label>
              <input
                type="datetime-local"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endTime">
                End Time
              </label>
              <input
                type="datetime-local"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="reason">
                Reason
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="3"
                required
              ></textarea>
            </div>
            
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Submit Request
            </button>
          </form>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Outing Requests</h3>
          {requests.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {requests.map(request => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">
                        {new Date(request.startTime).toLocaleString()} - {new Date(request.endTime).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">{request.reason}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  {request.wardenComment && (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-semibold">Warden Comment:</span> {request.wardenComment}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Submitted on: {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No outing requests found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutingRequests;