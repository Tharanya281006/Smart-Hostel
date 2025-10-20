import React, { useState, useEffect } from 'react';

const RoomOccupancy = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, occupied, vacant

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/warden/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setRooms(data.rooms);
    } catch (error) {
      setError('Failed to fetch room data');
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => {
    if (filter === 'occupied') return room.occupants.length > 0;
    if (filter === 'vacant') return room.occupants.length === 0;
    return true;
  });

  const getOccupancyColor = (occupants, capacity) => {
    const ratio = occupants.length / capacity;
    if (ratio === 0) return 'bg-gray-100';
    if (ratio <= 0.33) return 'bg-green-100';
    if (ratio <= 0.66) return 'bg-yellow-100';
    return 'bg-red-100';
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
          <h2 className="text-2xl font-bold">Room Occupancy</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('occupied')}
              className={`px-4 py-2 rounded-md ${
                filter === 'occupied'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Occupied
            </button>
            <button
              onClick={() => setFilter('vacant')}
              className={`px-4 py-2 rounded-md ${
                filter === 'vacant'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Vacant
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <div
              key={room.number}
              className={`${getOccupancyColor(room.occupants, room.capacity)} p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200`}
              onClick={() => {
                setSelectedRoom(room);
                setShowModal(true);
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">Room {room.number}</h3>
                <span className="text-sm font-medium">
                  {room.occupants.length}/{room.capacity}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <p>Floor: {Math.floor(room.number / 100)}</p>
                <p>Type: {room.type}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Room Details Modal */}
        {showModal && selectedRoom && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900">Room {selectedRoom.number} Details</h3>
                  <div className="mt-4">
                    <div className="mb-4">
                      <h4 className="font-medium">Room Information</h4>
                      <p>Floor: {Math.floor(selectedRoom.number / 100)}</p>
                      <p>Type: {selectedRoom.type}</p>
                      <p>Capacity: {selectedRoom.capacity}</p>
                      <p>Status: {selectedRoom.occupants.length === selectedRoom.capacity ? 'Full' : 'Available'}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Current Occupants</h4>
                      {selectedRoom.occupants.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                          {selectedRoom.occupants.map((occupant) => (
                            <li key={occupant.id} className="py-2">
                              <div className="flex justify-between">
                                <div>
                                  <p className="font-medium">{occupant.name}</p>
                                  <p className="text-sm text-gray-500">ID: {occupant.studentId}</p>
                                </div>
                                <div className="text-sm text-gray-500">
                                  Since: {new Date(occupant.checkInDate).toLocaleDateString()}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500">No current occupants</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomOccupancy;