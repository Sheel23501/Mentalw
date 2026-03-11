import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import Layout from './components/layout/Layout';
import { useAuth } from './contexts/AuthContext.jsx';

// Pages
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard.jsx';
import DoctorDashboard from './pages/Dashboard/DoctorDashboard.jsx';
import ChatPage from './pages/Dashboard/ChatPage.jsx';
import MentalHealthTest from './pages/Dashboard/MentalHealthTest.jsx';
import AIChat from './pages/AIChat.jsx';

// Basic placeholder components to avoid errors for now
const Login = () => <div>Login Page</div>;
const Signup = () => <div>Signup Page</div>;

// Updated ProtectedRoute component with role-based redirection
const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, userRole } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    // Redirect to appropriate dashboard based on role
    if (userRole === 'doctor') {
      return <Navigate to="/dashboard/doctor" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            
            {/* Patient Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="patient">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Doctor Dashboard */}
            <Route
              path="/dashboard/doctor"
              element={
                <ProtectedRoute requiredRole="doctor">
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Common Dashboard Routes */}
            <Route
              path="/dashboard/tests"
              element={
                <ProtectedRoute>
                  <MentalHealthTest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ai-chat"
              element={
                <ProtectedRoute>
                  <AIChat />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
