import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserTestStatus, saveMentalHealthTestResult, getMentalHealthTestResultsForUser } from '../../services/firestore';
import { FaBrain, FaCheck, FaArrowRight, FaArrowLeft, FaRedo, FaCalendarAlt, FaClipboardList, FaFileAlt } from 'react-icons/fa';

const PHQ9_QUESTIONS = [
  { id: 1, question: "Little interest or pleasure in doing things", category: "PHQ-9" },
  { id: 2, question: "Feeling down, depressed, or hopeless", category: "PHQ-9" },
  { id: 3, question: "Trouble falling asleep, staying asleep, or sleeping too much", category: "PHQ-9" },
  { id: 4, question: "Feeling tired or having little energy", category: "PHQ-9" },
  { id: 5, question: "Poor appetite or overeating", category: "PHQ-9" },
  { id: 6, question: "Feeling bad about yourself - or that you're a failure or have let yourself or your family down", category: "PHQ-9" },
  { id: 7, question: "Trouble concentrating on things, such as reading the newspaper or watching television", category: "PHQ-9" },
  { id: 8, question: "Moving or speaking so slowly that other people could have noticed. Or, the opposite - being so fidgety or restless that you have been moving around a lot more than usual", category: "PHQ-9" },
  { id: 9, question: "Thoughts that you would be better off dead or of hurting yourself in some way", category: "PHQ-9" }
].map(q => ({
  ...q,
  options: [
    { value: 0, label: "Not at all" },
    { value: 1, label: "Several days" },
    { value: 2, label: "More than half the days" },
    { value: 3, label: "Nearly every day" }
  ]
}));

const GAD7_QUESTIONS = [
  ...[
    { id: 1, question: "Feeling nervous, anxious, or on edge", category: "GAD-7" },
    { id: 2, question: "Not being able to stop or control worrying", category: "GAD-7" },
    { id: 3, question: "Worrying too much about different things", category: "GAD-7" },
    { id: 4, question: "Trouble relaxing", category: "GAD-7" },
    { id: 5, question: "Being so restless that it is hard to sit still", category: "GAD-7" },
    { id: 6, question: "Becoming easily annoyed or irritable", category: "GAD-7" },
    { id: 7, question: "Feeling afraid, as if something awful might happen", category: "GAD-7" }
  ].map(q => ({
    ...q,
    options: [
      { value: 0, label: "Not at all" },
      { value: 1, label: "Several days" },
      { value: 2, label: "More than half the days" },
      { value: 3, label: "Nearly every day" }
    ]
  })),
  {
    id: 8,
    question: "If you checked any problems, how difficult have they made it for you to do your work, take care of things at home, or get along with other people?",
    category: "GAD-7 Impact",
    options: [
      { value: 0, label: "Not difficult at all" },
      { value: 1, label: "Somewhat difficult" },
      { value: 2, label: "Very difficult" },
      { value: 3, label: "Extremely difficult" }
    ]
  }
];

const GENERAL_QUESTIONS = [
  {
    id: 1, category: 'Emotional & Physical Symptoms', question: "Over the last 2 weeks, how often have you felt little interest or pleasure in doing things?",
    options: [{ value: 0, label: "Not at all" }, { value: 1, label: "Several days" }, { value: 2, label: "More than half the days" }, { value: 3, label: "Nearly every day" }]
  },
  {
    id: 2, category: 'Emotional & Physical Symptoms', question: "Over the last 2 weeks, how often have you felt down, depressed, or hopeless?",
    options: [{ value: 0, label: "Not at all" }, { value: 1, label: "Several days" }, { value: 2, label: "More than half the days" }, { value: 3, label: "Nearly every day" }]
  },
  {
    id: 3, category: 'Emotional & Physical Symptoms', question: "Over the last 2 weeks, how often have you had trouble falling or staying asleep, or sleeping too much?",
    options: [{ value: 0, label: "Not at all" }, { value: 1, label: "Several days" }, { value: 2, label: "More than half the days" }, { value: 3, label: "Nearly every day" }]
  },
  {
    id: 4, category: 'Emotional & Physical Symptoms', question: "Over the last 2 weeks, how often have you felt tired or had little energy?",
    options: [{ value: 0, label: "Not at all" }, { value: 1, label: "Several days" }, { value: 2, label: "More than half the days" }, { value: 3, label: "Nearly every day" }]
  },
  {
    id: 5, category: 'Emotional & Physical Symptoms', question: "Over the last 2 weeks, how often have you had poor appetite or overeating?",
    options: [{ value: 0, label: "Not at all" }, { value: 1, label: "Several days" }, { value: 2, label: "More than half the days" }, { value: 3, label: "Nearly every day" }]
  },
  {
    id: 6, category: 'Emotional & Physical Symptoms', question: "Over the last 2 weeks, how often have you felt nervous, anxious, or on edge?",
    options: [{ value: 0, label: "Not at all" }, { value: 1, label: "Several days" }, { value: 2, label: "More than half the days" }, { value: 3, label: "Nearly every day" }]
  },
  {
    id: 7, category: 'Emotional & Physical Symptoms', question: "Over the last 2 weeks, how often have you not been able to stop or control worrying?",
    options: [{ value: 0, label: "Not at all" }, { value: 1, label: "Several days" }, { value: 2, label: "More than half the days" }, { value: 3, label: "Nearly every day" }]
  },
  {
    id: 8, category: 'Functional Impact', question: "Over the last 2 weeks, how often have you had trouble concentrating on things, such as reading the newspaper or watching television?",
    options: [{ value: 0, label: "Not at all" }, { value: 1, label: "Several days" }, { value: 2, label: "More than half the days" }, { value: 3, label: "Nearly every day" }]
  },
  {
    id: 9, category: 'Functional Impact', question: "Over the last 2 weeks, how often have you moved or spoken slowly enough that other people could have noticed?",
    options: [{ value: 0, label: "Not at all" }, { value: 1, label: "Several days" }, { value: 2, label: "More than half the days" }, { value: 3, label: "Nearly every day" }]
  },
  {
    id: 10, category: 'Functional Impact', question: "Over the last 2 weeks, how often have you been so restless that you have been moving around a lot more than usual?",
    options: [{ value: 0, label: "Not at all" }, { value: 1, label: "Several days" }, { value: 2, label: "More than half the days" }, { value: 3, label: "Nearly every day" }]
  },
  {
    id: 11, category: 'Functional Impact', question: "Over the last 2 weeks, how often have you had thoughts that you would be better off dead or of hurting yourself in some way?",
    options: [{ value: 0, label: "Not at all" }, { value: 1, label: "Several days" }, { value: 2, label: "More than half the days" }, { value: 3, label: "Nearly every day" }]
  },
  {
    id: 12, category: 'Self-Insight & Thought Patterns', question: "How often do you find yourself dwelling on negative thoughts or past mistakes?",
    options: [{ value: 0, label: "Rarely or never" }, { value: 1, label: "Sometimes" }, { value: 2, label: "Often" }, { value: 3, label: "Almost always" }]
  },
  {
    id: 13, category: 'Self-Insight & Thought Patterns', question: "How often do you feel disconnected from your emotions or like you're going through the motions?",
    options: [{ value: 0, label: "Rarely or never" }, { value: 1, label: "Sometimes" }, { value: 2, label: "Often" }, { value: 3, label: "Almost always" }]
  },
  {
    id: 14, category: 'Self-Insight & Thought Patterns', question: "How often do you feel like you're not good enough or that you've let yourself or others down?",
    options: [{ value: 0, label: "Rarely or never" }, { value: 1, label: "Sometimes" }, { value: 2, label: "Often" }, { value: 3, label: "Almost always" }]
  },
  {
    id: 15, category: 'Self-Insight & Thought Patterns', question: "How often do you have thoughts about harming yourself or ending your life?",
    options: [{ value: 0, label: "Never" }, { value: 1, label: "Rarely" }, { value: 2, label: "Sometimes" }, { value: 3, label: "Often" }]
  }
];

const MentalHealthTest = ({ setActiveTab }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedTest, setSelectedTest] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [previousResults, setPreviousResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);

  const getQuestions = () => {
    if (selectedTest === 'PHQ-9') return PHQ9_QUESTIONS;
    if (selectedTest === 'GAD-7') return GAD7_QUESTIONS;
    return GENERAL_QUESTIONS;
  };
  const questions = getQuestions();

  useEffect(() => {
    if (currentUser?.uid) {
      setLoadingResults(true);
      getMentalHealthTestResultsForUser(currentUser.uid)
        .then(results => {
          setPreviousResults(results);
        })
        .catch(err => {
          setErrorMsg('Could not fetch previous test results. Please try again later.');
        })
        .finally(() => setLoadingResults(false));
    }
  }, [currentUser]);

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
    let totalScore = Object.values(answers).reduce((sum, val) => sum + val, 0);
    let tags = [];
    let alert = null;

    if (selectedTest === 'PHQ-9') {
      let severity = '';
      let treatmentAction = '';
      if (totalScore >= 0 && totalScore <= 4) {
        tags.push('#noneMinimal');
        severity = "None-minimal";
        treatmentAction = "None";
      } else if (totalScore >= 5 && totalScore <= 9) {
        tags.push('#mildDepression');
        severity = "Mild";
        treatmentAction = "Watchful waiting; repeat PHQ-9 at follow-up";
      } else if (totalScore >= 10 && totalScore <= 14) {
        tags.push('#moderateDepression');
        severity = "Moderate";
        treatmentAction = "Treatment plan, considering counseling, follow-up and/or pharmacotherapy";
      } else if (totalScore >= 15 && totalScore <= 19) {
        tags.push('#moderatelySevere');
        severity = "Moderately Severe";
        treatmentAction = "Active treatment with pharmacotherapy and/or psychotherapy";
      } else {
        tags.push('#severeDepression');
        severity = "Severe";
        treatmentAction = "Immediate initiation of pharmacotherapy and, if severe impairment or poor response to therapy, expedited referral to a mental health specialist for psychotherapy and/or collaborative management";
      }
      
      alert = `Severity: ${severity}. ${totalScore >= 15 ? 'High priority.' : totalScore >= 10 ? 'Moderate priority.' : 'Low priority.'}`;
      
      if (answers[9] >= 1) { // PHQ-9 Question 9 is about self-harm
        tags.push('#selfHarmRisk');
        alert += " Self-harm risk detected. Immediate professional support is strongly recommended.";
      }
      return { totalScore, tags, alert, severity, treatmentAction, testName: 'PHQ-9', completedAt: new Date().toISOString() };
    }

    if (selectedTest === 'GAD-7') {
      let severity = '';
      totalScore = 0;
      for (let i = 1; i <= 7; i++) {
        totalScore += (answers[i] || 0); // Only sum the first 7 clinical questions
      }

      if (totalScore >= 0 && totalScore <= 4) {
        tags.push('#minimalAnxiety');
        severity = "Minimal anxiety";
      } else if (totalScore >= 5 && totalScore <= 9) {
        tags.push('#mildAnxiety');
        severity = "Mild anxiety";
      } else if (totalScore >= 10 && totalScore <= 14) {
        tags.push('#moderateAnxiety');
        severity = "Moderate anxiety";
      } else {
        tags.push('#severeAnxiety');
        severity = "Severe anxiety";
      }
      
      let impactText = '';
      if (answers[8] === 1) impactText = " | Somewhat difficult impact";
      if (answers[8] === 2) impactText = " | Very difficult impact";
      if (answers[8] === 3) impactText = " | Extremely difficult impact";

      alert = `Severity: ${severity}${impactText}. ${totalScore >= 15 ? 'High priority.' : totalScore >= 10 ? 'Moderate priority.' : 'Low priority.'}`;
      return { totalScore, tags, alert, severity, testName: 'GAD-7', completedAt: new Date().toISOString() };
    }

    // GENERAL_QUESTIONS
    const emotionalSymptomsQuestions = questions.filter(q => q.category === 'Emotional & Physical Symptoms');
    const emotionalSymptomsScore = emotionalSymptomsQuestions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);

    const functionalImpactQuestions = questions.filter(q => q.category === 'Functional Impact');
    const functionalImpactScore = functionalImpactQuestions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);

    const selfInsightQuestions = questions.filter(q => q.category === 'Self-Insight & Thought Patterns');
    const selfInsightScore = selfInsightQuestions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);

    const totalScoreGeneral = emotionalSymptomsScore + functionalImpactScore + selfInsightScore;

    if (emotionalSymptomsScore >= 7 && emotionalSymptomsScore <= 14) tags.push('#stableMood', '#lowSymptoms');
    else if (emotionalSymptomsScore >= 15 && emotionalSymptomsScore <= 24) tags.push('#mildDistress', '#possibleDepression');
    else if (emotionalSymptomsScore >= 25 && emotionalSymptomsScore <= 30) tags.push('#moderateDepression', '#emotionalFatigue');
    else if (emotionalSymptomsScore >= 31 && emotionalSymptomsScore <= 35) tags.push('#severeDistress', '#criticalSymptoms');

    if (functionalImpactScore >= 4 && functionalImpactScore <= 7) tags.push('#managingDailyLife', '#functioningNormal');
    else if (functionalImpactScore >= 8 && functionalImpactScore <= 11) tags.push('#socialWithdrawal', '#performanceDip');
    else if (functionalImpactScore >= 12 && functionalImpactScore <= 15) tags.push('#relationshipStrain', '#workImpairment');
    else if (functionalImpactScore >= 16 && functionalImpactScore <= 20) tags.push('#criticalImpact', '#dailyLifeDisruption');

    if (selfInsightScore >= 4 && selfInsightScore <= 7) tags.push('#resilientThinking', '#selfAware');
    else if (selfInsightScore >= 8 && selfInsightScore <= 11) tags.push('#rumination', '#emotionalDetachment');
    else if (selfInsightScore >= 12 && selfInsightScore <= 15) tags.push('#lowSelfWorth', '#selfBlame');
    else if (selfInsightScore >= 16 && selfInsightScore <= 20) tags.push('#highRiskThoughts', '#criticalMindState');

    if (answers[15] >= 3) tags.push('#selfHarmRisk');

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
      totalScore: totalScoreGeneral,
      tags,
      alert,
      testName: 'General Mental Health',
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
        testName: results.testName,
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
    setSelectedTest(null);
    setAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setTestResults(null);
    setErrorMsg("");
  };

  const handleContinueToDashboard = () => {
    if (setActiveTab) {
      setActiveTab('overview');
    } else {
      navigate('/dashboard');
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentQ = questions[currentQuestion] || {};

  // --- Result Screen ---
  if (showResults && testResults) {
    let riskColor = 'bg-green-100 text-green-800 border-green-300';
    let riskLabel = 'Low Risk';
    if (testResults.alert?.includes('High priority') || testResults.severity === 'Severe' || testResults.severity === 'Moderately Severe') {
      riskColor = 'bg-red-100 text-red-800 border-red-300';
      riskLabel = 'High Risk';
    } else if (testResults.alert?.includes('Moderate priority') || testResults.alert?.includes('Moderate-High priority') || testResults.severity === 'Moderate') {
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">{testResults.testName} Complete</h1>
              <p className="text-gray-600 text-center">Your personalized mental health summary is below.</p>
            </div>
            <div className={`rounded-xl border-2 px-6 py-4 mb-6 flex flex-col items-center flex-wrap ${riskColor}`}> 
              <span className="font-bold text-lg mb-1">{riskLabel}</span>
              <span className="text-base text-center">{testResults.alert}</span>
            </div>
            
            {(selectedTest === 'PHQ-9' || selectedTest === 'GAD-7') ? (
              <div className="mb-6 rounded-lg border p-6 flex flex-col items-center bg-gray-50 text-center">
                <span className="font-semibold text-gray-700 mb-2 text-lg">Total Score</span>
                <span className="text-5xl font-bold text-gray-900 mb-4">{testResults.totalScore}</span>
                {testResults.severity && (
                  <p className="text-gray-800 text-lg mb-1"><span className="font-semibold">Severity:</span> {testResults.severity}</p>
                )}
                {testResults.treatmentAction && (
                  <p className="text-gray-800 text-md mt-2 p-3 bg-white rounded border inline-block max-w-lg">
                    <span className="font-semibold text-blue-800 block mb-1">Proposed Treatment Action:</span>
                    {testResults.treatmentAction}
                  </p>
                )}
              </div>
            ) : (
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
            )}
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Summary & Recommendations</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {testResults.alert?.includes('High priority') && (
                  <li>Your results indicate a high level of distress. Immediate professional support is strongly recommended.</li>
                )}
                {testResults.alert?.includes('Moderate') && (
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
                <FaRedo className="mr-2" /> Take Another Test
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
        {/* Test UI Section (Moved Above Results) */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          {!selectedTest ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaFileAlt className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Select an Assessment</h1>
              <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                Choose the screening tool you want to complete today based on what you want to focus on.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <button 
                  onClick={() => setSelectedTest('PHQ-9')} 
                  className="flex flex-col items-start p-6 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all bg-white shadow-sm"
                >
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded inline-block mb-3">DEPRESSION</span>
                  <h3 className="font-bold text-xl text-gray-900 mb-2">PHQ-9</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Patient Health Questionnaire. A 9-question tool used worldwide to screen for depression severity.</p>
                </button>
                <button 
                  onClick={() => setSelectedTest('GAD-7')} 
                  className="flex flex-col items-start p-6 border-2 border-gray-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all bg-white shadow-sm"
                >
                  <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded inline-block mb-3">ANXIETY</span>
                  <h3 className="font-bold text-xl text-gray-900 mb-2">GAD-7</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">General Anxiety Disorder. A 7-question tool commonly used to screen for anxiety severity.</p>
                </button>
                <button 
                  onClick={() => setSelectedTest('General')} 
                  className="flex flex-col items-start p-6 border-2 border-gray-200 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all bg-white shadow-sm hover:shadow-md"
                >
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded inline-block mb-3">COMPREHENSIVE</span>
                  <h3 className="font-bold text-xl text-gray-900 mb-2">General Test</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">A comprehensive 15-question test covering emotional symptoms, functional impact, and self-insight.</p>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 flex justify-start">
                <button 
                  onClick={() => setSelectedTest(null)} 
                  className="text-gray-600 hover:text-green-700 flex items-center text-sm font-medium bg-gray-100 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <FaArrowLeft className="mr-1.5" /> Change Test
                </button>
              </div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaBrain className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {selectedTest === 'General' ? 'General Mental Health Test' : selectedTest + ' Assessment'}
                </h1>
                <p className="text-gray-600 font-medium">
                  {selectedTest === 'PHQ-9' || selectedTest === 'GAD-7' 
                    ? "Over the last 2 weeks, how often have you been bothered by the following problems?"
                    : "This assessment will help us understand your current mental health status and provide personalized care."}
                </p>
              </div>
              <div className="mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex justify-between text-sm text-gray-600 font-medium mb-3">
                  <span>Question {currentQuestion + 1} of {questions.length}</span>
                  <span className="text-green-700">{Math.round(progress)}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              <div className="mb-10">
                <div className="mb-4">
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm mb-2 shadow-sm border border-green-200">
                    {currentQ.category}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-relaxed">
                  {currentQ.question}
                </h2>
                <div className="space-y-3">
                  {currentQ.options?.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(currentQ.id, option.value)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                        answers[currentQ.id] === option.value
                          ? 'border-green-500 bg-green-50 text-green-800 shadow-md transform scale-[1.01]'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">{option.label}</span>
                        {answers[currentQ.id] === option.value && (
                          <div className="bg-green-500 rounded-full p-1 shadow-sm">
                            <FaCheck className="text-white w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-4 border-t border-gray-100">
                <button
                  onClick={prevQuestion}
                  disabled={currentQuestion === 0}
                  className="flex items-center px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <FaArrowLeft className="mr-2" /> Previous
                </button>
                {currentQuestion === questions.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || Object.keys(answers).length < questions.length}
                    className="flex items-center px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                  >
                    {loading ? 'Submitting...' : 'Submit Assessment'}
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    disabled={answers[currentQ.id] === undefined || answers[currentQ.id] === null}
                    className="flex items-center px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                  >
                    Next <FaArrowRight className="ml-2" />
                  </button>
                )}
              </div>
              {errorMsg && <div className="mt-6 text-red-600 text-center font-medium bg-red-50 p-3 rounded-lg border border-red-100">{errorMsg}</div>}
              <div className="mt-8 p-4 bg-blue-50 bg-opacity-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This assessment is for screening purposes only and should not replace professional medical advice. 
                  Your results will be shared with your care team to provide personalized support.
                </p>
              </div>
            </>
          )}
        </div>
        
        {/* Previous Results Section (Moved Below Test UI) */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 mt-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center"><FaClipboardList className="mr-2" /> My Previous Results</h2>
          {errorMsg && <div className="text-red-600 mb-2">{errorMsg}</div>}
          {loadingResults ? (
            <div className="text-center text-gray-400 py-4">Loading past results...</div>
          ) : previousResults.length === 0 ? (
            <div className="text-gray-500 py-4">No previous test results found.</div>
          ) : (
            <>
              <ul className="space-y-4">
                {(showAllHistory ? previousResults : previousResults.slice(0, 2)).map(result => (
                  <li key={result.id} className="border rounded-xl p-5 bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold flex items-center text-gray-800"><FaCalendarAlt className="mr-2 text-green-600" /> Date:</span>
                      <span className="text-gray-600 font-medium">{result.createdAt?.toDate ? result.createdAt.toDate().toLocaleString() : new Date(result.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mb-2 bg-white p-3 rounded border">
                      <span className="font-semibold text-gray-800">Test Taken:</span>
                      <span className="text-gray-700 font-medium ml-2">{result.testName || 'General Assessment'}</span>
                    </div>
                    <div className="mb-2 bg-white p-3 rounded border">
                      <span className="font-semibold text-gray-800">Result:</span>
                      <span className="text-gray-700 ml-2">{result.results?.alert || 'N/A'}</span>
                    </div>
                    <div className="mb-3 bg-white p-3 rounded border">
                      <span className="font-semibold text-gray-800">Scores:</span>
                      <span className="text-gray-700 ml-2">{result.results?.totalScore !== undefined ? `Total: ${result.results.totalScore}` : `Emotional: ${result.results?.emotional_symptoms_score}, Functional: ${result.results?.function_impact_score}, Self-Insight: ${result.results?.self_insight_score}`}</span>
                    </div>
                    <details className="mt-2 text-sm bg-white border rounded overflow-hidden">
                      <summary className="cursor-pointer text-blue-600 font-medium px-4 py-2 hover:bg-blue-50 transition-colors">View technical breakdown of answers...</summary>
                      <pre className="text-gray-700 p-4 border-t bg-gray-100 text-xs overflow-x-auto m-0">{JSON.stringify(result.answers, null, 2)}</pre>
                    </details>
                  </li>
                ))}
              </ul>
              {previousResults.length > 2 && (
                <div className="mt-6 text-center">
                  <button 
                    onClick={() => setShowAllHistory(!showAllHistory)} 
                    className="inline-flex items-center px-4 py-2 bg-white border-2 border-green-600 text-green-700 font-bold rounded-lg hover:bg-green-50 transition-colors"
                  >
                    {showAllHistory ? 'Show Less' : `Show All Past Results (${previousResults.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MentalHealthTest;
