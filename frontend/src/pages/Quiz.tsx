import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizApi } from '../lib/api';
import type { QuizSession, TranscriptEntry } from '../types/api';
import '../styles/Quiz.css';

const Quiz: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastResponse, setLastResponse] = useState<{
    score: number;
    rationale: string;
    hint?: string;
  } | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
      loadTranscript();
    }
  }, [sessionId]);

  const loadSession = async () => {
    if (!sessionId) return;
    
    try {
      const data = await quizApi.getSession(sessionId);
      setSession(data);
    } catch (error) {
      console.error('Failed to load session:', error);
      alert('Failed to load quiz session');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadTranscript = async () => {
    if (!sessionId) return;
    
    try {
      const data = await quizApi.getTranscript(sessionId);
      setTranscript(data);
    } catch (error) {
      console.error('Failed to load transcript:', error);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !currentAnswer.trim()) return;

    setSubmitting(true);

    try {
      const response = await quizApi.submitAnswer(sessionId, {
        answer: currentAnswer,
      });

      setLastResponse({
        score: response.score,
        rationale: response.rationale,
        hint: response.hint,
      });

      setSession(response.session_updated);
      setCurrentAnswer('');
      await loadTranscript();
    } catch (error: any) {
      alert('Failed to submit answer: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndSession = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="quiz-container">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading quiz session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="quiz-container">
        <div className="error-container">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <h2>Quiz session not found</h2>
          <button onClick={() => navigate('/')} className="btn-primary">
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <header className="quiz-header">
        <div className="quiz-info">
          <h1>Quizly Session</h1>
          <div className="session-details">
            <span className="badge">{session.knowledge_mode}</span>
            {session.topic && <span className="topic">Topic: {session.topic}</span>}
            <span className="turns">Turn {session.turns_completed}</span>
          </div>
        </div>
        <button onClick={handleEndSession} className="btn-secondary">
          End Session
        </button>
      </header>

      <main className="quiz-main">
        {lastResponse && (
          <div className="feedback-panel">
            <div className="score-display">
              <div className="score-label">Last Score:</div>
              <div className={`score-value score-${Math.round(lastResponse.score * 10)}`}>
                {(lastResponse.score * 100).toFixed(0)}%
              </div>
            </div>
            <div className="rationale">
              <strong>Feedback:</strong>
              <p>{lastResponse.rationale}</p>
            </div>
            {lastResponse.hint && (
              <div className="hint">
                <strong>Hint:</strong>
                <p>{lastResponse.hint}</p>
              </div>
            )}
          </div>
        )}

        <div className="question-panel">
          <h2>Current Question:</h2>
          <div className="question-text">
            {session.current_question || 'Loading next question...'}
          </div>
        </div>

        <form onSubmit={handleSubmitAnswer} className="answer-form">
          <label htmlFor="answer">Your Answer:</label>
          <textarea
            id="answer"
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={4}
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !currentAnswer.trim()}
            className="btn-primary"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </form>

        {transcript.length > 0 && (
          <div className="transcript-panel">
            <h3>Quiz History</h3>
            <div className="transcript-list">
              {transcript.map((entry) => (
                <div key={entry.id} className="transcript-entry">
                  <div className="transcript-header">
                    <span className="turn-number">Turn {entry.turn_index + 1}</span>
                    <span className={`score score-${Math.round(entry.score * 10)}`}>
                      {(entry.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="transcript-q">
                    <strong>Q:</strong> {entry.question}
                  </div>
                  <div className="transcript-a">
                    <strong>A:</strong> {entry.answer}
                  </div>
                  <div className="transcript-feedback">
                    <em>{entry.rationale}</em>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Quiz;
