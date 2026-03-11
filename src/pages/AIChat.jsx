import React, { useState, useEffect } from 'react';
import AITherapistChat from '../components/dashboard/AITherapistChat';

const AIChat = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-32">
        {/* Page Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-semibold text-gray-900 mb-3 tracking-tight" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
            AI Therapist
          </h1>
          <p className="mt-2 text-base text-gray-500 font-light max-w-xl mx-auto">
            Chat with our AI therapist for immediate emotional support and guidance. Available 24/7 whenever you need someone to talk to.
          </p>
        </div>

        {/* AI Chat Component - Auto-opened */}
        <div className="max-w-3xl mx-auto">
          <AITherapistChat autoOpen={true} />
        </div>
      </div>
    </div>
  );
};

export default AIChat;
