import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { FaUserMd, FaUser, FaGoogle, FaPhone } from 'react-icons/fa';
import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { storage } from '../config/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { saveUserProfile, isEmailRoleConflict } from '../services/firestore';

function AuthPage() {
  const [method, setMethod] = useState('phone');
  const [userType, setUserType] = useState('patient');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  const [error, setError] = useState(null);
  const [confirmationResultObj, setConfirmationResultObj] = useState(null); 

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const handleScrollOnMobile = () => {
      if (window.innerWidth < 768) { // Assuming 768px is the breakpoint for mobile
        window.scrollTo({ top: 80, behavior: 'smooth' }); // Scroll down by 50px
      }
    };
    
    // Scroll on mount
    handleScrollOnMobile();

    // Optional: Re-evaluate on window resize if needed, though usually not necessary for initial scroll
    // window.addEventListener('resize', handleScrollOnMobile);
    // return () => {
    //   window.removeEventListener('resize', handleScrollOnMobile);
    // };
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    if (method === 'phone' && !recaptchaVerifier) {
      try {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
        verifier.render();
        setRecaptchaVerifier(verifier);
      } catch (err) {
        console.error("Recaptcha error: ", err);
        setError("Failed to load ReCAPTCHA. Please try again.");
      }
    }
    // Cleanup function if needed
    return () => {
      // if (recaptchaVerifier) {
      //   recaptchaVerifier.clear();
      // }
    };
  }, [method, recaptchaVerifier, auth]); // Added auth to dependency array


  const handlePhoneAuth = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (!recaptchaVerifier) {
        setError("ReCAPTCHA not loaded. Please try again.");
        return;
      }
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      setConfirmationResultObj(confirmationResult); // Store the confirmationResult object
      setVerificationId(confirmationResult.verificationId); // Keep verificationId for UI logic
      console.log('OTP sent!');
      // Prompt user for OTP
    } catch (error) {
      setError(error.message);
      console.error('Phone auth error:', error);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (confirmationResultObj) {
        const result = await confirmationResultObj.confirm(otp);
        // Check for email-role conflict
        const conflict = await isEmailRoleConflict(result.user.email, userType);
        if (conflict) {
          setError('This email is already registered with a different role. Please use the correct role or a different email.');
          return;
        }
        await saveUserProfile(result.user, userType);
        // Force reload to ensure AuthContext picks up new userRole
        window.location.reload();
        // Redirect based on user type (handled after reload)
        // if (userType === 'doctor') {
        //   navigate('/dashboard/doctor');
        // } else {
        //   navigate('/dashboard');
        // }
      } else {
        setError("Please send OTP first.");
      }
    } catch (error) {
      setError(error.message);
      console.error('OTP verification error:', error);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Check for email-role conflict
      const conflict = await isEmailRoleConflict(result.user.email, userType);
      if (conflict) {
        setError('This email is already registered with a different role. Please use the correct role or a different email.');
        return;
      }
      await saveUserProfile(result.user, userType);
      // Force reload to ensure AuthContext picks up new userRole
      window.location.reload();
      // Redirect based on user type (handled after reload)
      // if (userType === 'doctor') {
      //   navigate('/dashboard/doctor');
      // } else {
      //   navigate('/dashboard');
      // }
    } catch (error) {
      setError(error.message);
      console.error('Google auth error:', error);
    }
  };

  // Update user type selection handler
  const handleUserTypeChange = (type) => {
    setUserType(type);
  };

  // If currentUser exists, don't render the auth page to prevent flickering before redirect
  if (currentUser) {
      return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-4 sm:p-8 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome to TruCare
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose how you'd like to continue
          </p>
        </div>

        {/* User Type Selector */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleUserTypeChange('patient')}
            className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
              userType === 'patient' 
                ? 'bg-green-50 text-green-700 border-2 border-green-500' 
                : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            <FaUser className="text-lg" />
            <span>Patient</span>
          </button>
          <button
            onClick={() => handleUserTypeChange('doctor')}
            className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
              userType === 'doctor' 
                ? 'bg-green-50 text-green-700 border-2 border-green-500' 
                : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            <FaUserMd className="text-lg" />
            <span>Doctor</span>
          </button>
        </div>

        {/* Role Description */}
        <p className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          {userType === 'doctor' 
            ? 'Sign in as a healthcare professional to provide care and support'
            : 'Sign in as a patient to access mental health support and resources'}
        </p>

        {/* Auth Methods */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl text-sm font-medium bg-white border-2 border-gray-200 hover:bg-gray-50 transition-all duration-200"
          >
            <FaGoogle className="text-lg text-red-500" />
            <span>Continue with Google</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {method === 'phone' && (
            <>
              <p className="text-sm text-gray-500 text-center italic">Phone signup is currently under development. Please use Google sign-in.</p>
              <form onSubmit={verificationId ? handleVerifyOtp : handlePhoneAuth} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaPhone className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    className="block w-full pl-4 sm:pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    placeholder="Phone Number (e.g., +91 934567890)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={!!verificationId}
                  />
                </div>
                
                {verificationId && (
                  <div className="relative">
                    <input
                      type="text"
                      required
                      className="block w-full pl-3 pr-3 py-3 border-2 border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                >
                  {verificationId ? 'Verify OTP' : 'Send OTP'}
                </button>
              </form>
            </>
          )}
        </div>

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

export default AuthPage; 