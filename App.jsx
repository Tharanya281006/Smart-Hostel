import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import ResidentDashboard from './components/resident/ResidentDashboard';
import WardenDashboard from './components/warden/WardenDashboard';

function App() {
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return !!token;
  };

  const getUserRole = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/resident/dashboard" 
          element={
            isAuthenticated() && getUserRole() === 'resident' ? (
              <ResidentDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route 
          path="/warden/dashboard" 
          element={
            isAuthenticated() && getUserRole() === 'warden' ? (
              <WardenDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;