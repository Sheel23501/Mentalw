import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserTestStatus, saveMentalHealthTestResult, getMentalHealthTestResultsForUser } from '../../services/firestore';
import { FaBrain, FaCheck, FaArrowRight, FaArrowLeft, FaRedo, FaCalendarAlt, FaClipboardList } from 'react-icons/fa';

const MentalHealthTest = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [previousResults, setPreviousResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (currentUser?.uid) {
      setLoadingResults(true);
      getMentalHealthTestResultsForUser(currentUser.uid)
        .then(results => {
          console.log('Fetched previous results:', results);
          setPreviousResults(results);
        })
        .catch(err => {
          setErrorMsg('Could not fetch previous test results. Please try again later.');
          console.error('Error fetching previous results:', err);
        })
        .finally(() => setLoadingResults(false));
    }
  }, [currentUser]);

  const questions = [
    {
      id: 1,
      category: 'Emotional & Physical Symptoms',
      question: "Over the last 2 weeks, how often have you felt little interest or pleasure in doing things?",
      options: [
        { value: 0, label: "Not at all" },
        { value: 1, label: "Several days" },
        { value: 2, label: "More than half the days" },
        { value: 3, label: "Nearly every day" }
      ]
    },
    {
      id: 2,
      category: 'Emotional & Physical Symptoms',
      question: "Over the last 2 weeks, how often have you felt down, depressed, or hopeless?",
      options: [
        { value: 0, label: "Not at all" },
        { value: 1, label: "Several days" },
        { value: 2, label: "More than half the days" },
        { value: 3, label: "Nearly every day" }
      ]
    },
    {
      id: 3,
      category: 'Emotional & Physical Symptoms',
      question: "Over the last 2 weeks, how often have you had trouble falling or staying asleep, or sleeping too much?",
      options: [
        { value: 0, label: "Not at all" },
        { value: 1, label: "Several days" },
        { value: 2, label: "More than half the days" },
        { value: 3, label: "Nearly every day" }
      ]
    },
    {
      id: 4,
      category: 'Emotional & Physical Symptoms',
      question: "Over the last 2 weeks, how often have you felt tired or had little energy?",
      options: [
        { value: 0, label: "Not at all" },
        { value: 1, label: "Several days" },
        { value: 2, label: "More than half the days" },
        { value: 3, label: "Nearly every day" }
      ]
    },
    {
      id: 5,
      category: 'Emotional & Physical Symptoms',
      question: "Over the last 2 weeks, how often have you had poor appetite or overeating?",
      options: [
        { value: 0, label: "Not at all" },
        { value: 1, label: "Several days" },
        { value: 2, label: "More than half the days" },
        { value: 3, label: "Nearly every day" }
      ]
    },
    {
      id: 6,
      category: 'Emotional & Physical Symptoms',
      question: "Over the last 2 weeks, how often have you felt nervous, anxious, or on edge?",
      options: [
        { value: 0, label: "Not at all" },
        { value: 1, label: "Several days" },
        { value: 2, label: "More than half the days" },
        { value: 3, label: "Nearly every day" }
      ]
    },
    {
      id: 7,
      category: 'Emotional & Physical Symptoms',
      question: "Over the last 2 weeks, how often have you not been able to stop or control worrying?",
      options: [
        { value: 0, label: "Not at all" },
        { value: 1, label: "Several days" },
        { value: 2, label: "More than half the days" },
        { value: 3, label: "Nearly every day" }
      ]
    },
    {
      id: 8,
      category: 'Functional Impact',
      question: "Over the last 2 weeks, how often have you had trouble concentrating on things, such as reading the newspaper or watching television?",
      options: [
        { value: 0, label: "Not at all" },
        { value: 1, label: "Several days" },
        { value: 2, label: "More than half the days" },
        { value: 3, label: "Nearly every day" }
      ]
    },
    {
      id: 9,
      category: 'Functional Impact',
      question: "Over the last 2 weeks, how often have you moved or spoken slowly enough that other people could have noticed?",
      options: [
        { value: 0, label: "Not at all" },
        { value: 1, label: "Several days" },
        { value: 2, label: "More than half the days" },
        { value: 3, label: "Nearly every day" }
      ]
    },
    {
      id: 10,
      category: 'Functional Impact',
      question: "Over the last 2 weeks, how often have you been so restless that you have been moving around a lot more than usual?",
      options: [
        { value: 0, label: "Not at all" },
        { value: 1, label: "Several days" },
        { value: 2, label: "More than half the days" },
        { value: 3, label: "Nearly every day" }
      ]
    },
    {
      id: 11,
      category: 'Functional Impact',
      question: "Over the last 2 weeks, how often have you had thoughts that you would be better off dead or of hurting yourself in some way?",
      options: [
        { value: 0, label: "Not at all" },
        { value: 1, label: "Several days" },
        { value: 2, label: "More than half the days" },
        { value: 3, label: "Nearly every day" }
      ]
    },
    {
      id: 12,
      category: 'Self-Insight & Thought Patterns',
      question: "How often do you find yourself dwelling on negative thoughts or past mistakes?",
      options: [
        { value: 0, label: "Rarely or never" },
        { value: 1, label: "Sometimes" },
        { value: 2, label: "Often" },
        { value: 3, label: "Almost always" }
      ]
    },
    {
      id: 13,
      category: 'Self-Insight & Thought Patterns',
      question: "How often do you feel disconnected from your emotions or like you're going through the motions?",
      options: [
        { value: 0, label: "Rarely or never" },
        { value: 1, label: "Sometimes" },
        { value: 2, label: "Often" },
        { value: 3, label: "Almost always" }
      ]
    },
    {
      id: 14,
      category: 'Self-Insight & Thought Patterns',
      question: "How often do you feel like you're not good enough or that you've let yourself or others down?",
      options: [
        { value: 0, label: "Rarely or never" },
        { value: 1, label: "Sometimes" },
        { value: 2, label: "Often" },
        { value: 3, label: "Almost always" }
      ]
    },
    {
      id: 15,
      category: 'Self-Insight & Thought Patterns',
      question: "How often do you have thoughts about harming yourself or ending your life?",
      options: [
        { value: 0, label: "Never" },
        { value: 1, label: "Rarely" },
        { value: 2, label: "Sometimes" },
        { value: 3, label: "Often" }
      ]
    }
  ];

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateResults = () => {
    const emotionalSymptomsQuestions = questions.filter(q => q.category === 'Emotional & Physical Symptoms');
    const emotionalSymptomsScore = emotionalSymptomsQuestions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);

    const functionalImpactQuestions = questions.filter(q => q.category === 'Functional Impact');
    const functionalImpactScore = functionalImpactQuestions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);

    const selfInsightQuestions = questions.filter(q => q.category === 'Self-Insight & Thought Patterns');
    const selfInsightScore = selfInsightQuestions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);

    const totalScore = emotionalSymptomsScore + functionalImpactScore + selfInsightScore;

    const tags = [];

    if (emotionalSymptomsScore >= 7 && emotionalSymptomsScore <= 14) {
      tags.push('#stableMood', '#lowSymptoms');
    } else if (emotionalSymptomsScore >= 15 && emotionalSymptomsScore <= 24) {
      tags.push('#mildDistress', '#possibleDepression');
    } else if (emotionalSymptomsScore >= 25 && emotionalSymptomsScore <= 30) {
      tags.push('#moderateDepression', '#emotionalFatigue');
    } else if (emotionalSymptomsScore >= 31 && emotionalSymptomsScore <= 35) {
      tags.push('#severeDistress', '#criticalSymptoms');
    }

    if (functionalImpactScore >= 4 && functionalImpactScore <= 7) {
      tags.push('#managingDailyLife', '#functioningNormal');
    } else if (functionalImpactScore >= 8 && functionalImpactScore <= 11) {
      tags.push('#socialWithdrawal', '#performanceDip');
    } else if (functionalImpactScore >= 12 && functionalImpactScore <= 15) {
      tags.push('#relationshipStrain', '#workImpairment');
    } else if (functionalImpactScore >= 16 && functionalImpactScore <= 20) {
      tags.push('#criticalImpact', '#dailyLifeDisruption');
    }

    if (selfInsightScore >= 4 && selfInsightScore <= 7) {
      tags.push('#resilientThinking', '#selfAware');
    } else if (selfInsightScore >= 8 && selfInsightScore <= 11) {
      tags.push('#rumination', '#emotionalDetachment');
    } else if (selfInsightScore >= 12 && selfInsightScore <= 15) {
      tags.push('#lowSelfWorth', '#selfBlame');
    } else if (selfInsightScore >= 16 && selfInsightScore <= 20) {
      tags.push('#highRiskThoughts', '#criticalMindState');
    }

    if (answers[15] >= 3) {
      tags.push('#selfHarmRisk');
    }

    let alert = null;
    if (emotionalSymptomsScore >= 31 || functionalImpactScore >= 16 || selfInsightScore >= 16 || answers[15] >= 3) {
      alert = "High priority. Consider scheduling urgent session.";
    } else if (emotionalSymptomsScore >= 25 || functionalImpactScore >= 12 || selfInsightScore >= 12) {
      alert = "Moderate priority. Schedule session within 1-2 weeks.";
    } else if (emotionalSymptomsScore >= 15 || functionalImpactScore >= 8 || selfInsightScore >= 8) {
      alert = "Low priority. Regular check-in recommended.";
    }

    return {
      emotional_symptoms_score: emotionalSymptomsScore,
      function_impact_score: functionalImpactScore,
      self_insight_score: selfInsightScore,
      totalScore,
      tags,
      alert,
      completedAt: new Date().toISOString()
    };
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const results = calculateResults();
      setTestResults(results);
      const testData = {
        answers,
        results,
        questions: questions.map(q => ({ id: q.id, category: q.category, question: q.question }))
      };
      // Try both saves, but don't block result screen if one fails
      let saveError = false;
      try {
        await saveMentalHealthTestResult(currentUser.uid, testData);
      } catch (e) { saveError = true; }
      try {
        await updateUserTestStatus(currentUser.uid, true);
      } catch (e) { /* not critical */ }
      setShowResults(true);
      getMentalHealthTestResultsForUser(currentUser.uid)
        .then(results => setPreviousResults(results));
      if (saveError) setErrorMsg("Your results were submitted, but there was a problem saving them for future reference. Please contact support if this happens again.");
    } catch (error) {
      setErrorMsg('There was an error saving your test results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setTestResults(null);
    setErrorMsg("");
  };

  const handleContinueToDashboard = () => {
    navigate('/dashboard');
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentQ = questions[currentQuestion];

  // --- Result Screen ---
  if (showResults && testResults) {
    // Color and label for risk
    let riskColor = 'bg-green-100 text-green-800 border-green-300';
    let riskLabel = 'Low Risk';
    if (testResults.alert?.includes('High priority')) {
      riskColor = 'bg-red-100 text-red-800 border-red-300';
      riskLabel = 'High Risk';
    } else if (testResults.alert?.includes('Moderate priority')) {
      riskColor = 'bg-yellow-100 text-yellow-800 border-yellow-300';
      riskLabel = 'Moderate Risk';
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 border-4 border-green-200">
                <FaBrain className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Assessment Complete</h1>
              <p className="text-gray-600 text-center">Your personalized mental health summary is below.</p>
            </div>
            <div className={`rounded-xl border-2 px-6 py-4 mb-6 flex flex-col items-center ${riskColor}`}> 
              <span className="font-bold text-lg mb-1">{riskLabel}</span>
              <span className="text-base text-center">{testResults.alert}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border p-4 flex flex-col items-center">
                <span className="font-semibold text-gray-700 mb-1">Emotional & Physical</span>
                <span className="text-2xl font-bold">{testResults.emotional_symptoms_score} <span className="text-base font-normal">/ 35</span></span>
              </div>
              <div className="rounded-lg border p-4 flex flex-col items-center">
                <span className="font-semibold text-gray-700 mb-1">Functional Impact</span>
                <span className="text-2xl font-bold">{testResults.function_impact_score} <span className="text-base font-normal">/ 20</span></span>
              </div>
              <div className="rounded-lg border p-4 flex flex-col items-center">
                <span className="font-semibold text-gray-700 mb-1">Self-Insight & Thoughts</span>
                <span className="text-2xl font-bold">{testResults.self_insight_score} <span className="text-base font-normal">/ 20</span></span>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Summary & Recommendations</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {testResults.alert?.includes('High priority') && (
                  <li>Your results indicate a high level of distress. Immediate professional support is strongly recommended.</li>
                )}
                {testResults.alert?.includes('Moderate priority') && (
                  <li>Your results suggest moderate symptoms. Please consider scheduling a session with a mental health professional soon.</li>
                )}
                {testResults.alert?.includes('Low priority') && (
                  <li>Your results are within a manageable range. Continue self-care and regular check-ins.</li>
                )}
                <li>Review your detailed scores above for more insight into your current state.</li>
                <li>For urgent help, contact a crisis helpline or your care team.</li>
              </ul>
            </div>
            {testResults.tags && testResults.tags.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">Assessment Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {testResults.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
              <button
                onClick={handleRetake}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center"
              >
                <FaRedo className="mr-2" /> Retake Test
              </button>
              <button
                onClick={handleContinueToDashboard}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center"
              >
                <FaArrowRight className="mr-2" /> Continue to Dashboard
              </button>
            </div>
            {errorMsg && <div className="mt-6 text-red-600 text-center">{errorMsg}</div>}
          </div>
        </div>
      </div>
    );
  }

  // --- Main Test UI with Previous Results ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Previous Results Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center"><FaClipboardList className="mr-2" /> My Previous Test Results</h2>
          {errorMsg && <div className="text-red-600 mb-2">{errorMsg}</div>}
          {loadingResults ? (
            <div>Loading...</div>
          ) : previousResults.length === 0 ? (
            <div>No previous test results found.</div>
          ) : (
            <ul className="space-y-4">
              {previousResults.map(result => (
                <li key={result.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold flex items-center"><FaCalendarAlt className="mr-1" /> Date:</span>
                    <span>{result.createdAt?.toDate ? result.createdAt.toDate().toLocaleString() : new Date(result.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Result:</span>
                    <span> {result.results?.alert || 'N/A'}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Scores:</span>
                    <span> Emotional: {result.results?.emotional_symptoms_score}, Functional: {result.results?.function_impact_score}, Self-Insight: {result.results?.self_insight_score}</span>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-blue-600">Show all answers</summary>
                    <pre className="bg-gray-100 rounded p-2 mt-2 text-xs overflow-x-auto">{JSON.stringify(result.answers, null, 2)}</pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Test UI Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBrain className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mental Health Assessment</h1>
            <p className="text-gray-600">
              This assessment will help us understand your current mental health status and provide personalized care.
            </p>
          </div>
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          <div className="mb-8">
            <div className="mb-4">
              <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full mb-3">
                {currentQ.category}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {currentQ.question}
            </h2>
            <div className="space-y-3">
              {currentQ.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(currentQ.id, option.value)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    answers[currentQ.id] === option.value
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option.label}</span>
                    {answers[currentQ.id] === option.value && (
                      <FaCheck className="text-green-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <button
              onClick={prevQuestion}
              disabled={currentQuestion === 0}
              className="flex items-center px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Previous
            </button>
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={loading || Object.keys(answers).length < questions.length}
                className="flex items-center px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Assessment'}
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                disabled={answers[currentQ.id] === undefined || answers[currentQ.id] === null}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <FaArrowRight className="ml-2" />
              </button>
            )}
          </div>
          {errorMsg && <div className="mt-6 text-red-600 text-center">{errorMsg}</div>}
          <div className="mt-8 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This assessment is for screening purposes only and should not replace professional medical advice. 
              Your results will be shared with your care team to provide personalized support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentalHealthTest; 