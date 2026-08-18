import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import EventDetails from './pages/EventDetails';
import MyTicket from './pages/MyTicket';
import Scanner from './pages/Scanner';
import AdminDashboard from './pages/AdminDashboard';
import AdminEventForm from './pages/AdminEventForm';
import AdminRegistrations from './pages/AdminRegistrations';

export default function App() {
  return (
    <div className="min-h-screen bg-bg font-body">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/events/:id" element={<EventDetails />} />

        <Route
          path="/my-tickets"
          element={
            <ProtectedRoute roles={['STUDENT']}>
              <MyTicket />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scanner"
          element={
            <ProtectedRoute roles={['SCANNER', 'ADMIN']}>
              <Scanner />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/new"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminEventForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/:id"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminRegistrations />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<div className="text-center py-16 text-muted">Page not found.</div>} />
      </Routes>
    </div>
  );
}
