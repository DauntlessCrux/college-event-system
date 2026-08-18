import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="bg-primary text-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-display font-semibold text-lg tracking-tight flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent" />
          Gate
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="hover:text-accent transition-colors">Events</Link>

          {user?.role === 'STUDENT' && (
            <Link to="/my-tickets" className="hover:text-accent transition-colors">My tickets</Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="hover:text-accent transition-colors">Admin</Link>
          )}
          {(user?.role === 'SCANNER' || user?.role === 'ADMIN') && (
            <Link to="/scanner" className="hover:text-accent transition-colors">Scanner</Link>
          )}

          {user ? (
            <button onClick={handleLogout} className="text-white/70 hover:text-white transition-colors">
              Log out
            </button>
          ) : (
            <>
              <Link to="/login" className="hover:text-accent transition-colors">Log in</Link>
              <Link
                to="/signup"
                className="bg-accent text-primary-dark font-medium px-3 py-1.5 rounded-full hover:bg-accent-dark transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
