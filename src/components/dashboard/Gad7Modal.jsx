import React, { useState, useEffect } from 'react';
import { FaClipboardList, FaArrowRight, FaCheckCircle } from 'react-icons/fa';

const GAD7_QUESTIONS = [
  "Feeling nervous, anxious, or on edge?",
  "Not being able to stop or control worrying?",
  "Worrying too much about different things?",
  "Trouble relaxing?",
  "Being so restless that it is hard to sit still?",
  "Becoming easily annoyed or irritable?",
  "Feeling afraid, as if something awful might happen?"
];

const OPTIONS = [
  { label: "Not at all", score: 0 },
  { label: "Several days", score: 1 },
  { label: "More than half the days", score: 2 },
  { label: "Nearly every day", score: 3 }
];

const Gad7Modal = ({ open, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState(Array(7).fill(null));
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setAnswers(Array(7).fill(null));
      setIsAnimating(false);
    }
  }, [open]);

  if (!open) return null;

  const handleOptionSelect = (score) => {
    if (isAnimating) return;
    
    const newAnswers = [...answers];
    newAnswers[currentStep] = score;
    setAnswers(newAnswers);

    setIsAnimating(true);
    
    setTimeout(() => {
      if (currentStep < 6) {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      } else {
        // Complete the test
        const totalScore = newAnswers.reduce((a, b) => a + b, 0);
        let severity = "Minimal";
        if (totalScore >= 15) severity = "Severe";
        else if (totalScore >= 10) severity = "Moderate";
        else if (totalScore >= 5) severity = "Mild";

        onComplete(totalScore, severity, newAnswers);
      }
    }, 400); // 400ms delay for smooth transition
  };

  const progressPercentage = ((currentStep) / 7) * 100;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'gad7FadeIn 0.3s ease',
    }}>
      {/* Backdrop */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(20, 40, 30, 0.8)',
        backdropFilter: 'blur(12px)',
      }} />

      {/* Modal Container */}
      <div style={{
        position: 'relative',
        background: 'white',
        borderRadius: '24px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        animation: 'gad7SlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4a7c65 0%, #2d4a3e 100%)',
          padding: '24px 28px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <FaClipboardList style={{ fontSize: '24px', color: '#a7f3d0' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>Quick Check-in</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                Over the last 2 weeks, how often have you been bothered by...
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
              <span>Question {currentStep + 1} of 7</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                background: '#34d399', 
                width: `${progressPercentage}%`,
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '32px 28px', minHeight: '300px', position: 'relative' }}>
          <div style={{
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating ? 'translateX(-20px)' : 'translateX(0)',
            transition: 'all 0.3s ease',
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 700, 
              color: '#1f2937', 
              marginBottom: '24px',
              fontFamily: "'Inter', sans-serif",
              lineHeight: '1.4'
            }}>
              "{GAD7_QUESTIONS[currentStep]}"
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {OPTIONS.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(option.score)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '16px 20px',
                    background: answers[currentStep] === option.score ? '#ecfdf5' : '#f9fafb',
                    border: answers[currentStep] === option.score ? '2px solid #34d399' : '1px solid #e5e7eb',
                    borderRadius: '16px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: answers[currentStep] === option.score ? '#065f46' : '#4b5563',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => {
                    if (answers[currentStep] !== option.score) {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                  onMouseLeave={e => {
                    if (answers[currentStep] !== option.score) {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }
                  }}
                >
                  {option.label}
                  {answers[currentStep] === option.score ? (
                    <FaCheckCircle style={{ color: '#34d399', fontSize: '18px' }} />
                  ) : (
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #d1d5db' }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes gad7FadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gad7SlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Gad7Modal;
