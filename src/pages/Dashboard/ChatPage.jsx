import React from 'react';

function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Chat with the Bot or a Counsellor</h1>

        {/* Placeholder for the Chatbot UI */}
        <div className="bg-white shadow-lg rounded-lg p-6" style={{ minHeight: '400px' }}>
          <p className="text-gray-600 text-center">Your chatbot interface will go here.</p>
          {/* You will integrate your chatbot component here */}
        </div>

        {/* You can add options to switch between bot and counsellor chat here later */}

      </div>
    </div>
  );
}

export default ChatPage; 