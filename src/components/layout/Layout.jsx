import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import DashboardNavbar from '../dashboard/DashboardNavbar';
import Footer from './Footer';
import { useAuth } from '../../contexts/AuthContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const { userRole } = useAuth();

  const isDashboardRoute = location.pathname.startsWith('/dashboard');
  const isDoctorRoute = location.pathname.startsWith('/dashboard/doctor');

  const renderNavbar = () => {
    // Doctor dashboard has its own left sidebar — no top navbar needed
    if (isDoctorRoute) {
      return null;
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
      {/* Footer is hidden on doctor dashboard since it has its own full-screen layout */}
      {!isDoctorRoute && <Footer />}
    </div>
  );
};

export default Layout;