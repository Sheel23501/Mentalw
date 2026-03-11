import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const mobileMenuRef = useRef(null);
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect or show a message after logout if needed
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Smooth scroll to element by ID
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // For Contact, open mail app
  const handleContact = (e) => {
    e.preventDefault();
    window.location.href = 'mailto:your@email.com';
  };

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

  return (
    <nav className='bg-green-50 shadow-sm relative z-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16 items-center'>
          {/* Logo */}
          <div className='flex-shrink-0'>
            <Link to='/' className='flex items-center'>
              <div className='h-8 w-8 rounded-full bg-green-500 mr-2'></div>
              <span className='text-xl font-bold text-gray-800'>TruCare</span>
            </Link>
          </div>

          {/* Navigation Links (Desktop) */}
          <div className='hidden md:flex md:items-center md:space-x-6'>
            <Link to='/' className='text-gray-600 hover:text-gray-800 text-sm font-medium'>Home</Link>
            <button
              className='text-gray-600 hover:text-gray-800 text-sm font-medium bg-transparent border-none outline-none cursor-pointer'
              onClick={e => { e.preventDefault(); scrollToSection('footer'); }}
            >
              About
            </button>
            <button
              className='text-gray-600 hover:text-gray-800 text-sm font-medium bg-transparent border-none outline-none cursor-pointer'
              onClick={e => { e.preventDefault(); scrollToSection('why-choose'); }}
            >
              Services
            </button>
            <button
              className='text-gray-600 hover:text-gray-800 text-sm font-medium bg-transparent border-none outline-none cursor-pointer'
              onClick={handleContact}
            >
              Contact
            </button>
          </div>

          {/* Auth Buttons */}
          <div className='flex items-center space-x-4'>
            <div className='hidden md:flex md:items-center md:space-x-4'>
              {currentUser ? (
                <button
                  onClick={handleLogout}
                  className='inline-flex items-center px-4 py-2 border border-gray-300 rounded-3xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'
                >
                  Logout
                </button>
              ) : (
                <>
                  <Link to="/login" className='inline-flex items-center px-4 py-2 border border-gray-300 rounded-3xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'>
                    Login
                  </Link>
                  <Link to="/signup" className='inline-flex items-center px-4 py-2 border border-transparent rounded-3xl shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700'>
                    Sign Up
                  </Link>
                </>
              )}
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
      to="/"
      className="block text-gray-800 px-4 py-2 rounded-lg text-base font-semibold hover:bg-green-100 transition duration-200"
      onClick={() => setMenuOpen(false)}
    >
      Home
    </Link>
    <button
      className="block w-full text-left text-gray-800 px-4 py-2 rounded-lg text-base font-semibold hover:bg-green-100 transition duration-200 bg-transparent border-none outline-none cursor-pointer"
      onClick={e => { e.preventDefault(); scrollToSection('footer'); setMenuOpen(false); }}
    >
      About
    </button>
    <button
      className="block w-full text-left text-gray-800 px-4 py-2 rounded-lg text-base font-semibold hover:bg-green-100 transition duration-200 bg-transparent border-none outline-none cursor-pointer"
      onClick={e => { e.preventDefault(); scrollToSection('why-choose'); setMenuOpen(false); }}
    >
      Services
    </button>
    <button
      className="block w-full text-left text-gray-800 px-4 py-2 rounded-lg text-base font-semibold hover:bg-green-100 transition duration-200 bg-transparent border-none outline-none cursor-pointer"
      onClick={e => { handleContact(e); setMenuOpen(false); }}
    >
      Contact
    </button>
    <div className="space-y-2 flex flex-col">
      {currentUser ? (
         <button className="w-full text-left px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition duration-200 text-sm" onClick={() => { handleLogout(); setMenuOpen(false); }}>
           Logout
         </button>
      ) : (
        <>
          <Link to="/login" className="w-full text-left px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition duration-200 text-sm" onClick={() => setMenuOpen(false)}>
            Login
          </Link>
          <Link to="/signup" className="w-full text-left px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition duration-200 text-sm" onClick={() => setMenuOpen(false)}>
            Sign Up
          </Link>
        </>
      )}
    </div>
  </div>


    </nav>
  );
};

export default Navbar;
 