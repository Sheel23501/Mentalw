import React from 'react';

const Loader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-transparent backdrop-filter backdrop-blur-sm">
      <div className="w-12 h-12 border-4 border-t-4 border-green-500 border-solid rounded-full animate-spin"></div>
    </div>
  );
};

export default Loader; 