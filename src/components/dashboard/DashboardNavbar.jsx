import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

const DashboardNavbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const mobileMenuRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle click outside for mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && menuOpen) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Only render if user is logged in
  if (!currentUser) return null;

  // Modal component
  const PopupModal = ({ open, message, onClose }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xs w-full flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-800 mb-4">{message}</span>
          <button
            onClick={onClose}
            className="mt-2 px-6 py-2 rounded-full bg-primary-600 text-white font-medium hover:bg-primary-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <nav className='bg-green-50 shadow-sm relative z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between h-16 items-center'>
            {/* Logo */}
            <div className='flex-shrink-0'>
              <Link to='/dashboard' className='flex items-center'>
                <div className='h-8 w-8 rounded-full bg-green-500 mr-2'></div>
                <span className='text-xl font-bold text-gray-800'>TruCare</span>
              </Link>
            </div>

            {/* Navigation Links (Desktop) */}
            <div className='hidden md:flex md:items-center md:space-x-6'>
              <Link 
                to='/dashboard' 
                className={`text-gray-600 hover:text-gray-800 text-sm font-medium ${location.pathname === '/dashboard' ? 'text-green-600' : ''}`}
              >
                Home
              </Link>
              <Link 
                to='/dashboard/tests' 
                className={`text-gray-600 hover:text-gray-800 text-sm font-medium ${location.pathname === '/dashboard/tests' ? 'text-green-600' : ''}`}
              >
                Tests
              </Link>
              <Link 
                to='/dashboard/ai-chat' 
                className={`text-gray-600 hover:text-gray-800 text-sm font-medium ${location.pathname === '/dashboard/ai-chat' ? 'text-green-600' : ''}`}
              >
                AI Chat
              </Link>
              
              <button
                className={`text-gray-600 hover:text-gray-800 text-sm font-medium bg-transparent border-none outline-none cursor-pointer ${location.pathname === '/dashboard/contact' ? 'text-green-600' : ''}`}
                onClick={() => { setModalMessage('This feature is under development.'); setModalOpen(true); }}
              >
                Contact
              </button>

              <button
                className={`text-gray-600 hover:text-gray-800 text-sm font-medium bg-transparent border-none outline-none cursor-pointer ${location.pathname === '/dashboard/profile' ? 'text-green-600' : ''}`}
                onClick={() => { setModalMessage('This feature is under development.'); setModalOpen(true); }}
              >
                Profile
              </button>
            </div>

            {/* Auth Buttons */}
            <div className='flex items-center space-x-4'>
              <div className='hidden md:flex md:items-center md:space-x-4'>
                <button
                  onClick={handleLogout}
                  className='inline-flex items-center px-4 py-2 border border-gray-300 rounded-3xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'
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
        <div
      id="mobile-menu"
      ref={mobileMenuRef}
      className={`
        md:hidden
        fixed inset-x-0 top-16
        bg-white shadow-lg
        px-4 pt-4 pb-6 space-y-3
        transition-all duration-300 ease-in-out
        h-[calc(100vh-4rem)] overflow-y-auto
        ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}
      `}
    >
      <Link
        to='/dashboard'
        className={`block px-4 py-2 rounded-lg text-base font-semibold transition duration-200 ${location.pathname === '/dashboard' ? 'text-green-600 bg-green-100' : 'text-gray-800 hover:bg-green-100'}`}
        onClick={() => setMenuOpen(false)}
      >
        Home
      </Link>
      <Link
        to='/dashboard/tests'
        className={`block px-4 py-2 rounded-lg text-base font-semibold transition duration-200 ${location.pathname === '/dashboard/tests' ? 'text-green-600 bg-green-100' : 'text-gray-800 hover:bg-green-100'}`}
        onClick={() => setMenuOpen(false)}
      >
        Tests
      </Link>
      <Link
        to='/dashboard/ai-chat'
        className={`block px-4 py-2 rounded-lg text-base font-semibold transition duration-200 ${location.pathname === '/dashboard/ai-chat' ? 'text-green-600 bg-green-100' : 'text-gray-800 hover:bg-green-100'}`}
        onClick={() => setMenuOpen(false)}
      >
        AI Chat
      </Link>
      <button
        className={`block w-full text-left px-4 py-2 rounded-lg text-base font-semibold transition duration-200 bg-transparent border-none outline-none cursor-pointer ${location.pathname === '/dashboard/profile' ? 'text-green-600 bg-green-100' : 'text-gray-800 hover:bg-green-100'}`}
        onClick={() => { setMenuOpen(false); setModalMessage('This feature is under development.'); setModalOpen(true); }}
      >
        Profile
      </button>
      <button
        className={`block w-full text-left px-4 py-2 rounded-lg text-base font-semibold transition duration-200 bg-transparent border-none outline-none cursor-pointer ${location.pathname === '/dashboard/contact' ? 'text-green-600 bg-green-100' : 'text-gray-800 hover:bg-green-100'}`}
        onClick={() => { setMenuOpen(false); setModalMessage('This feature is under development.'); setModalOpen(true); }}
      >
        Contact
      </button>
      <div className="space-y-2 flex flex-col">
        <button
          onClick={() => { handleLogout(); setMenuOpen(false); }}
          className='w-full text-left px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition duration-200 text-sm'
        >
          Logout
        </button>
      </div>
    </div>
      </nav>
      <PopupModal open={modalOpen} message={modalMessage} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default DashboardNavbar; 