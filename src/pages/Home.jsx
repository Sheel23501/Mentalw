import React, { useEffect, useState } from 'react';
import { FiPhone, FiHeart, FiShield, FiTrendingUp } from 'react-icons/fi';
import ChatBot from '../chatbot/ChatBot';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// import aboutimg from ''

const Home = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showCallMsg, setShowCallMsg] = useState(false);

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const features = [
    {
      icon: <FiHeart className="w-8 h-8 text-green-600" />,
      title: "Compassionate Listening",
      description: "A supportive space to express your feelings without judgment, with AI that truly understands.",
      bgColor: "bg-white",
      iconBg: "bg-green-100"
    },
    {
      icon: <FiShield className="w-8 h-8 text-green-600" />,
      title: "Emotional Support",
      description: "Personalized guidance to help you navigate challenging emotions and difficult situations.",
      bgColor: "bg-white",
      iconBg: "bg-green-100"
    },
    {
      icon: <FiTrendingUp className="w-8 h-8 text-green-400" />,
      title: "Personal Growth",
      description: "Evidence-based insights to foster self-awareness and sustainable emotional well-being.",
      bgColor: "bg-white",
      iconBg: "bg-green-100"
    }
  ];

  return (
    <div className="bg-green-50 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center relative overflow-x-hidden">
      {/* Decorative Gradient Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] h-40 sm:h-64 bg-gradient-to-b from-green-100/80 to-transparent rounded-b-3xl blur-2xl" />
      </div>
      <div className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8 relative z-10">
        {/* Hero Section */}
        <section className="w-full bg-green-50 flex flex-col items-center justify-center pt-12 sm:pt-20 pb-16 sm:pb-24 px-2">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center bg-white rounded-full shadow-lg px-6 py-3 gap-3 border border-green-100">
              <img src="/person-01.jpg" alt="Person 1" className="w-8 h-8 rounded-full object-cover border-2 border-green-200" />
              <img src="/person-02.jpg" alt="Person 2" className="w-8 h-8 rounded-full object-cover border-2 border-green-200" />
              <img src="/person-03.jpg" alt="Person 3" className="w-8 h-8 rounded-full object-cover border-2 border-green-200" />
              <span className="text-gray-700 text-base font-semibold ml-2">Tried & Tested</span>
            </div>
          </div>
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 text-center mb-6 max-w-4xl leading-tight">
            Unlocking Mental Well-being with the Power of AI
          </h1>
          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 text-center mb-12 max-w-2xl">
            You're Not Alone — We're Always Here to Listen, Support, and Walk With You.
          </p>
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <button
              className="rounded-full bg-green-600 px-10 py-4 text-lg font-bold text-white shadow-lg hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-all duration-200"
              onClick={() => navigate('/signup')}
            >
              GET STARTED
            </button>
            <button
              className="flex items-center justify-center gap-2 text-lg font-bold text-green-700 border-2 border-green-600 px-10 py-4 rounded-full hover:bg-green-100 transition-all shadow-lg"
              onClick={() => {
                setShowCallMsg(false);
                setTimeout(() => setShowCallMsg(true), 10);
              }}
            >
              <FiPhone className="text-xl" />
              CALL NOW
            </button>
          </div>
          <div className="w-full flex justify-center">
            <span
              className={`text-base text-gray-500 mt-2 text-center transition-opacity duration-700 ${showCallMsg ? 'animate-vibrate' : ''}`}
              onAnimationEnd={() => setShowCallMsg(false)}
            >
              AI-powered call feature is under development.
            </span>
          </div>
        </section>

        {/* Features Section */}
        <section id="why-choose" className="w-full py-12 sm:py-16 bg-green-50 flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-green-800 mb-10 sm:mb-14 text-center">Why Choose TruCare?</h2>
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 px-2 sm:px-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center text-center border border-green-100 transition-transform duration-200 hover:scale-105 hover:shadow-2xl"
              >
                <div className="bg-green-50 rounded-xl w-16 h-16 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section className="w-full flex justify-center items-center py-12 sm:py-16 bg-green-50">
          <div className="bg-white rounded-3xl shadow-lg p-8 sm:p-12 flex flex-col md:flex-row items-center max-w-4xl w-full gap-8 border border-green-100">
            {/* Text Content */}
            <div className="flex-1 w-full">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-green-700 mb-4">About TruCare</h2>
              <p className="text-gray-700 text-base sm:text-lg mb-4">
                TruCare is an AI-powered mental health platform designed to provide anonymous, accessible, and affordable psychological support.
              </p>
              <div>
                <h3 className="text-green-700 font-semibold mb-2 text-base">Our mission:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 text-base">
                  <li><span className="font-semibold text-green-700">Stigma-free support:</span> A mental health ecosystem where support is available anytime, anywhere.</li>
                  <li><span className="font-semibold text-green-700">Scalable & accessible:</span> AI-based approach, bilingual accessibility, and affordable therapy options.</li>
                  <li><span className="font-semibold text-green-700">Bridging the gap:</span> Connecting those in need with quality mental health care.</li>
                </ul>
              </div>
            </div>
            {/* Image */}
            <div className="flex-1 flex justify-center items-center w-full md:w-auto">
              <img
                src="https://images.pexels.com/photos/3184396/pexels-photo-3184396.jpeg?auto=compress&w=400&h=400&fit=crop"
                alt="About TruCare"
                className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 object-cover rounded-full border-4 border-green-100 bg-green-50 shadow-md"
              />
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-12 sm:py-16 bg-green-50 flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-green-700 mb-10 text-center">What People Are Saying</h2>
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 px-2 sm:px-4">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-3xl shadow-lg p-8 flex flex-col justify-between border border-green-100">
              <p className="text-gray-700 text-base mb-6">"TruCare helped me through a really dark phase. The AI felt human and comforting. I felt heard and supported."</p>
              <div className="flex items-center gap-3 mt-auto">
                <img src="/person-01.jpg" alt="Aarav" className="w-10 h-10 rounded-full object-cover border-2 border-green-200 shadow" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Aarav M.</h4>
                  <p className="text-xs text-gray-500">Delhi, India</p>
                </div>
              </div>
            </div>
            {/* Testimonial 2 */}
            <div className="bg-white rounded-3xl shadow-lg p-8 flex flex-col justify-between border border-green-100">
              <p className="text-gray-700 text-base mb-6">"The support felt so personal, even though it was AI. It's affordable, easy to use, and surprisingly effective!"</p>
              <div className="flex items-center gap-3 mt-auto">
                <img src="/person-02.jpg" alt="Ishita" className="w-10 h-10 rounded-full object-cover border-2 border-green-200 shadow" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Ishita R.</h4>
                  <p className="text-xs text-gray-500">Mumbai, India</p>
                </div>
              </div>
            </div>
            {/* Testimonial 3 */}
            <div className="bg-white rounded-3xl shadow-lg p-8 flex flex-col justify-between border border-green-100">
              <p className="text-gray-700 text-base mb-6">"As someone hesitant to seek help, TruCare broke that barrier. The chatbot felt like a friend I could always talk to."</p>
              <div className="flex items-center gap-3 mt-auto">
                <img src="/person-03.jpg" alt="Riya" className="w-10 h-10 rounded-full object-cover border-2 border-green-200 shadow" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Riya S.</h4>
                  <p className="text-xs text-gray-500">Bangalore, India</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Anchor for Smooth Scroll */}
      <div id="footer"></div>
      {/* Floating ChatBot Button (Mobile) */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 animate-fade-in-up">
        <ChatBot />
      </div>

      {/* Decorative Robot Illustration (optional, hidden for now) */}
      {/* <div className="absolute bottom-0 right-0 hidden md:block w-48 h-48 lg:w-64 lg:h-64 xl:w-80 xl:h-80 -mb-10 -mr-10">
        <img src="/robot.png" alt="AI Robot" className="w-full h-full object-contain" />
      </div> */}

      {/* Animations (TailwindCSS custom classes, add to your global CSS if not present) */}
      {/*
      .animate-fade-in { animation: fadeIn 0.8s ease both; }
      .animate-fade-in-up { animation: fadeInUp 0.8s ease both; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
      */}
    </div>
  );
};

export default Home;