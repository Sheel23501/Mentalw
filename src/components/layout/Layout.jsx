import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import DashboardNavbar from '../dashboard/DashboardNavbar';
import DoctorNavbar from '../dashboard/DoctorNavbar';
import Footer from './Footer';
import { useAuth } from '../../contexts/AuthContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const { userRole } = useAuth();

  const isDashboardRoute = location.pathname.startsWith('/dashboard');
  const isDoctorRoute = location.pathname.startsWith('/dashboard/doctor');

  const renderNavbar = () => {
    if (isDoctorRoute) {
      return <DoctorNavbar />;
    }
    if (isDashboardRoute) {
      return <DashboardNavbar />;
    }
    return <Navbar />;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header>
        {renderNavbar()}
      </header>
      <main className="flex-grow">
        {children}
      </main>
      {/* Add a basic footer here later if needed */}
      <Footer />
    </div>
  );
};

export default Layout; 