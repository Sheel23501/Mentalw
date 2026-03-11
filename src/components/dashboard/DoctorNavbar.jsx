import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

const DoctorNavbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className='bg-white shadow-sm'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16 items-center'>
          {/* Logo */}
          <div className='flex-shrink-0'>
            <Link to='/dashboard/doctor' className='flex items-center'>
              <div className='h-8 w-8 rounded-full bg-green-500 mr-2'></div>
              <span className='text-xl font-bold text-gray-800'>TruCare Doctor</span>
            </Link>
          </div>

          {/* Navigation Links (Desktop) */}
          <div className='hidden md:flex md:items-center md:space-x-6'>
            <Link 
              to='/dashboard/doctor' 
              className={`text-sm font-medium ${
                location.pathname === '/dashboard/doctor' 
                  ? 'text-green-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              to='/dashboard/doctor/patients' 
              className={`text-sm font-medium ${
                location.pathname === '/dashboard/doctor/patients' 
                  ? 'text-green-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Patients
            </Link>
            <Link 
              to='/dashboard/doctor/appointments' 
              className={`text-sm font-medium ${
                location.pathname === '/dashboard/doctor/appointments' 
                  ? 'text-green-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Appointments
            </Link>
            <Link 
              to='/dashboard/doctor/messages' 
              className={`text-sm font-medium ${
                location.pathname === '/dashboard/doctor/messages' 
                  ? 'text-green-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Messages
            </Link>
            <Link 
              to='/dashboard/doctor/profile' 
              className={`text-sm font-medium ${
                location.pathname === '/dashboard/doctor/profile' 
                  ? 'text-green-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Profile
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className='flex items-center space-x-4'>
            <div className='hidden md:flex md:items-center md:space-x-4'>
              <button
                onClick={handleLogout}
                className='inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'
              >
                Logout
              </button>
            </div>

            {/* Hamburger Menu (Mobile) */}
            <div className='-mr-2 flex md:hidden'>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                type='button'
                className='inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none'
                aria-controls='mobile-menu'
                aria-expanded={menuOpen}
              >
                <span className='sr-only'>Open main menu</span>
                {menuOpen ? (
                  <svg className='h-6 w-6' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
                  </svg>
                ) : (
                  <svg className='h-6 w-6' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 6h16M4 12h16M4 18h16' />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className='md:hidden'>
          <div className='px-2 pt-2 pb-3 space-y-1 sm:px-3'>
            <Link
              to='/dashboard/doctor'
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/dashboard/doctor'
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to='/dashboard/doctor/patients'
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/dashboard/doctor/patients'
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Patients
            </Link>
            <Link
              to='/dashboard/doctor/appointments'
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/dashboard/doctor/appointments'
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Appointments
            </Link>
            <Link
              to='/dashboard/doctor/messages'
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/dashboard/doctor/messages'
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Messages
            </Link>
            <Link
              to='/dashboard/doctor/profile'
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/dashboard/doctor/profile'
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className='w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default DoctorNavbar; 