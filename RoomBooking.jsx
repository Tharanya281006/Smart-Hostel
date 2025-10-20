import React, { useState, useEffect } from 'react';

const RoomBooking = () => {
  // Mock data for rooms and roommates since we're not connecting to real API yet
  const [rooms, setRooms] = useState([
    { id: 1, roomNumber: "1", availableBeds: 4 },
    { id: 2, roomNumber: "2", availableBeds: 4 },
    { id: 3, roomNumber: "3", availableBeds: 4 },
    { id: 4, roomNumber: "4", availableBeds: 4 }
  ]);
  
  const [potentialRoommates, setPotentialRoommates] = useState([
    { id: 1, username: "John Doe" },
    { id: 2, username: "Jane Smith" },
    { id: 3, username: "Alex Johnson" },
    { id: 4, username: "Sam Wilson" },
    { id: 5, username: "Taylor Green" }
  ]);
  
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedRoommates, setSelectedRoommates] = useState([]);
  const [loading, setLoading] = useState(false);  // Set to false for mock data
  const [error, setError] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    // We're using mock data, so no need for real fetch operations
    // Just simulate loading for a moment
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Mock fetch functions that would normally talk to the backend
  const fetchRooms = async () => {
    // Already using mock data
    setLoading(false);
  };

  const fetchPotentialRoommates = async () => {
    // Already using mock data
    setLoading(false);
  };

  const handleRoommateSelection = (userId) => {
    if (selectedRoommates.includes(userId)) {
      setSelectedRoommates(selectedRoommates.filter(id => id !== userId));
    } else if (selectedRoommates.length < 3) {
      setSelectedRoommates([...selectedRoommates, userId]);
    }
  };

  const handleBookingSubmit = async () => {
    if (!selectedRoom || selectedRoommates.length !== 3) {
      setError('Please select a room and exactly 3 roommates');
      return;
    }

    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        console.log('Booking submitted:', {
          roomId: selectedRoom,
          roommateIds: selectedRoommates
        });
        
        // Log the selected room and roommates for verification
        const selectedRoomData = rooms.find(r => r.id === selectedRoom);
        const selectedRoommateData = potentialRoommates.filter(rm => selectedRoommates.includes(rm.id));
        
        console.log('Selected Room:', selectedRoomData);
        console.log('Selected Roommates:', selectedRoommateData);
        
        setBookingStatus('pending');
        setBookingSuccess(true);
        startBookingTimer(new Date(Date.now() + 2 * 60 * 1000).toISOString()); // 2 minutes from now
        setLoading(false);
        
        // Add an alert to confirm the booking was recorded
        alert(`Booking recorded successfully!\n\nRoom: ${selectedRoomData.roomNumber}\nRoommates: ${selectedRoommateData.map(r => r.username).join(', ')}`);
      }, 1000);
    } catch (error) {
      setError('Failed to submit booking request');
      setLoading(false);
    }
  };

  const startBookingTimer = (expiryTime) => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiryTime).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft(null);
        setBookingStatus(null);
      } else {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  if (loading) {
    return <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Room Booking</h2>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {bookingSuccess && (
        <div className="bg-green-50 text-green-700 p-4 rounded-md mb-4">
          Booking request submitted successfully!
        </div>
      )}

      {bookingStatus === 'pending' && (
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md mb-4">
          Booking in progress. Time remaining: {timeLeft}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Rooms</h3>
          <div className="grid grid-cols-2 gap-4">
            {rooms.map(room => (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer ${
                  selectedRoom === room.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <h4 className="font-semibold">Room {room.roomNumber}</h4>
                <p className="text-sm text-gray-600">
                  {room.availableBeds} beds available
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Select Roommates (3)</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {potentialRoommates.map(user => (
              <div
                key={user.id}
                onClick={() => handleRoommateSelection(user.id)}
                className={`p-3 rounded-lg border cursor-pointer ${
                  selectedRoommates.includes(user.id)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedRoommates.includes(user.id)}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-3">{user.username}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleBookingSubmit}
          disabled={!selectedRoom || selectedRoommates.length !== 3 || bookingStatus === 'pending' || loading}
          className={`px-4 py-2 rounded-md text-white font-medium
            ${
              (!selectedRoom || selectedRoommates.length !== 3 || bookingStatus === 'pending' || loading)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
        >
          {loading ? 'Processing...' : bookingStatus === 'pending' ? 'Booking in Progress...' : 'Submit Booking Request'}
        </button>
      </div>
    </div>
  );
};

export default RoomBooking;