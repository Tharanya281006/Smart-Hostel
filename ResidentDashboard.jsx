import React, { useState, useEffect } from 'react';
import RoomBooking from './RoomBooking';
import ServiceRequests from './ServiceRequests';
import OutingRequests from './OutingRequests';

const ResidentDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Using mock data instead of fetching from API
    setTimeout(() => {
      setUserInfo({
        username: "John Doe",
        email: "resident@example.com",
        roomNumber: "101",
        activeServiceRequests: 1,
        activeOuting: false
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-800">Smart Hostel</h1>
              </div>
              <div className="ml-6 flex space-x-8 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('booking')}
                  className={`${
                    activeTab === 'booking'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Room Booking
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('services')}
                  className={`${
                    activeTab === 'services'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Services
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('outings')}
                  className={`${
                    activeTab === 'outings'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Outings
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500 mr-4">{userInfo?.username}</span>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('token');
                  window.location.href = '/login';
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Welcome, {userInfo?.username}!</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800">Room Status</h3>
                <p className="text-gray-600">Current Room: {userInfo?.roomNumber || 'Not Assigned'}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800">Service Requests</h3>
                <p className="text-gray-600">Active Requests: {userInfo?.activeServiceRequests || 0}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800">Outing Status</h3>
                <p className="text-gray-600">
                  {userInfo?.activeOuting ? 'Currently Out' : 'In Hostel'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'booking' && <RoomBooking />}
        {activeTab === 'services' && <ServiceRequests />}
        {activeTab === 'outings' && <OutingRequests />}
      </main>
    </div>
  );
};

export default ResidentDashboard;