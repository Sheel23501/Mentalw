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

  const renderNavbar = () => {
    // All dashboard routes (patient & doctor) have their own sidebar nav
    if (isDashboardRoute) {
      return null;
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
      {/* Footer is hidden on all dashboard routes since they have full-screen layouts */}
      {!isDashboardRoute && <Footer />}
    </div>
  );
};

export default Layout;