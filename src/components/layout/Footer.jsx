import React, { useState, useRef, useEffect } from 'react';
import { FiMail, FiPhone, FiMapPin, FiFacebook, FiTwitter, FiInstagram, FiLinkedin } from 'react-icons/fi';

const Footer = () => {
  const [quickLinksOpen, setQuickLinksOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const quickLinksRef = useRef(null);
  const contactRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside the Quick Links dropdown
      if (quickLinksRef.current && !quickLinksRef.current.contains(event.target) && quickLinksOpen) {
        setQuickLinksOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // Check if the click is outside the Contact dropdown
      if (contactRef.current && !contactRef.current.contains(event.target) && contactOpen) {
        setContactOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [quickLinksOpen, contactOpen]);

  return (
    <footer className="bg-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info Section */}
          <div className="space-y-4">
            <div className='flex items-center'>
              <div className='h-8 w-8 rounded-full bg-green-500 mr-2'></div>
              <h3 className="text-xl font-bold text-gray-900">TruCare</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Providing quality healthcare solutions for a better tomorrow.
            </p>
          </div>

          {/* Quick Links Section */}
          <div className="border-b border-gray-200 md:border-b-0 pb-4 md:pb-0" ref={quickLinksRef}>
            <button
              className="flex justify-between items-center w-full text-xl font-bold text-gray-900 md:cursor-default"
              onClick={() => setQuickLinksOpen(!quickLinksOpen)}
            >
              Quick Links
              <svg
                className={`md:hidden h-5 w-5 transform transition-transform duration-200 ${quickLinksOpen ? 'rotate-180' : 'rotate-0'}`}
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <ul className={`mt-4 space-y-2 text-gray-600 text-sm md:block ${quickLinksOpen ? 'block' : 'hidden'}`}>
              <li className="hover:text-gray-900 cursor-pointer transition-colors duration-200">About Us</li>
              <li className="hover:text-gray-900 cursor-pointer transition-colors duration-200">Services</li>
              <li className="hover:text-gray-900 cursor-pointer transition-colors duration-200">Contact</li>
            </ul>
          </div>

          {/* Contact Section */}
          <div className="border-b border-gray-200 md:border-b-0 pb-4 md:pb-0" ref={contactRef}>
            <button
              className="flex justify-between items-center w-full text-xl font-bold text-gray-900 md:cursor-default"
              onClick={() => setContactOpen(!contactOpen)}
            >
              Contact
              <svg
                className={`md:hidden h-5 w-5 transform transition-transform duration-200 ${contactOpen ? 'rotate-180' : 'rotate-0'}`}
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <ul className={`mt-4 space-y-2 text-gray-600 text-sm md:block ${contactOpen ? 'block' : 'hidden'}`}>
              <li className="text-gray-600 text-sm flex items-center gap-2"><FiMail className="text-lg" /> Email: info@trucare.com</li>
              <li className="text-gray-600 text-sm flex items-center gap-2"><FiPhone className="text-lg" /> Phone: +91 9839293729</li>
              <li className="text-gray-600 text-sm flex items-center gap-2"><FiMapPin className="text-lg" /> Address: IIIT Delhi, New Delhi</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} TruCare. All rights reserved.
          </p>
          <div className="flex space-x-4">
            <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors duration-200"><FiFacebook className="h-6 w-6" /></a>
            <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors duration-200"><FiTwitter className="h-6 w-6" /></a>
            <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors duration-200"><FiInstagram className="h-6 w-6" /></a>
            <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors duration-200"><FiLinkedin className="h-6 w-6" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
