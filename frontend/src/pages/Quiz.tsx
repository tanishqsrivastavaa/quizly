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

  const currentScore = lastResponse?.score ?? session?.last_score ?? 0;
  const scorePercent = Math.round(currentScore * 100);
  const progressPercent = Math.min(100, Math.max(8, transcript.length * 12 + (lastResponse ? 10 : 0)));
  const scoreBucket = Math.round(currentScore * 10);
  const feedbackTone =
    currentScore >= 0.75 ? 'is-success' : currentScore >= 0.45 ? 'is-warning' : 'is-danger';
  const progressAngle = `${Math.max(12, Math.min(100, scorePercent)) * 3.6}deg`;
  const feedbackTitle =
    currentScore >= 0.75 ? 'Strong answer' : currentScore >= 0.45 ? 'Good direction' : 'Needs refinement';
  const feedbackSummary =
    currentScore >= 0.75
      ? 'You are showing solid command of the material.'
      : currentScore >= 0.45
        ? 'You are on the right track, but there is room to sharpen precision.'
        : 'Use the rationale and hint to tighten the next response.';

  if (loading) {
    return (
      <div className="quiz-container">
        <div className="quiz-loading">
          <div className="loading-card-large glass-panel">
            <div className="app-loader" aria-hidden="true"></div>
            <h2>Preparing your quiz session</h2>
            <p>Loading the current question, transcript, and scoring context.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="quiz-container">
        <div className="error-container">
          <div className="error-card glass-panel">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <h2>Quiz session not found</h2>
            <p>The requested session could not be restored.</p>
            <button onClick={() => navigate('/')} className="btn-primary">
              Return to workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-shell">
        <header className="quiz-header glass-panel">
          <div className="quiz-header-inner">
            <div className="quiz-heading">
              <div className="quiz-heading-top">
                <span className="badge">{session.knowledge_mode}</span>
                <div className="session-details">
                  {session.topic && <span className="topic">Topic: {session.topic}</span>}
                  <span className="turns">{transcript.length} responses logged</span>
                </div>
              </div>
              <h1>Quizly Session</h1>
              <p className="quiz-subtitle">
                Stay in the flow: answer the live prompt, get immediate coaching, and build momentum turn by turn.
              </p>
            </div>

            <button onClick={handleEndSession} className="btn-secondary">
              End session
            </button>
          </div>
        </header>

        <div className="quiz-grid">
          <aside className="quiz-side">
            <section className="quiz-panel glass-panel">
              <div className="quiz-panel-inner">
                <div className="score-orb">
                  <div className="score-ring" style={{ ['--progress-angle' as string]: progressAngle }}>
                    <div className="score-ring-value">
                      <strong>{scorePercent}%</strong>
                      <span>Last score</span>
                    </div>
                  </div>
                  <p className="mastery-caption">
                    {lastResponse
                      ? 'Latest evaluation from the active round.'
                      : 'Submit an answer to activate detailed scoring feedback.'}
                  </p>
                </div>

                <div className="progress-card">
                  <div className="progress-label-row">
                    <span>Session momentum</span>
                    <span>{progressPercent}% engaged</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                <div className="quiz-stat-grid">
                  <div className="quiz-stat">
                    <strong>{session.turns_completed}</strong>
                    <span>Turns completed in this session</span>
                  </div>
                  <div className="quiz-stat">
                    <strong>{transcript.length}</strong>
                    <span>Transcript entries captured so far</span>
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <main className="quiz-main">
            {lastResponse && (
              <section className={`feedback-panel glass-panel ${feedbackTone}`}>
                <div className="feedback-panel-inner">
                  <div className="feedback-banner">
                    <div className="feedback-icon">
                      {currentScore >= 0.75 ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 8v4M12 16h.01" />
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      )}
                    </div>
                    <div className="feedback-copy">
                      <strong>{feedbackTitle}</strong>
                      <p>{feedbackSummary}</p>
                    </div>
                  </div>

                  <div className="feedback-score-row">
                    <div className={`score-pill score-${scoreBucket}`}>
                      Score {(lastResponse.score * 100).toFixed(0)}%
                    </div>
                    <span className="badge">Turn {session.turns_completed}</span>
                  </div>

                  <div className="rationale">
                    <strong>Rationale</strong>
                    <p>{lastResponse.rationale}</p>
                  </div>

                  {lastResponse.hint && (
                    <div className="hint">
                      <strong>Hint for the next turn</strong>
                      <p>{lastResponse.hint}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="question-panel glass-panel">
              <div className="question-panel-inner">
                <div className="question-header">
                  <h2>Current question</h2>
                  <span className="badge">Live prompt</span>
                </div>

                <div className="question-glow">
                  <div className="question-text">
                    {session.current_question || 'Loading next question...'}
                  </div>
                </div>
              </div>
            </section>

            <section className="answer-panel glass-panel">
              <div className="answer-panel-inner">
                <div className="answer-header">
                  <h2>Your answer</h2>
                  <span className="badge">Natural language</span>
                </div>

                <form onSubmit={handleSubmitAnswer} className="answer-form">
                  <label htmlFor="answer">Respond with as much precision as you can.</label>
                  <textarea
                    id="answer"
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Explain the concept, justify your answer, or work through the reasoning..."
                    disabled={submitting}
                  />

                  <div className="answer-meta">
                    <span className="answer-tip">Clear reasoning usually performs better than short fragments.</span>
                    <button
                      type="submit"
                      disabled={submitting || !currentAnswer.trim()}
                      className="btn-primary"
                    >
                      {submitting ? (
                        <>
                          <span className="loader loader-inline" aria-hidden="true"></span>
                          Evaluating...
                        </>
                      ) : (
                        'Submit answer'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {transcript.length > 0 && (
              <section className="transcript-panel glass-panel">
                <div className="transcript-panel-inner">
                  <div className="transcript-header-main">
                    <h3>Session transcript</h3>
                    <span className="badge">{transcript.length} rounds</span>
                  </div>

                  <div className="transcript-list">
                    {transcript.map((entry) => (
                      <article key={entry.id} className="transcript-entry">
                        <div className="transcript-entry-header">
                          <span className="turn-number">Turn {entry.turn_index}</span>
                          <span className={`score score-${Math.round(entry.score * 10)}`}>
                            {(entry.score * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className="transcript-copy">
                          <div className="transcript-block">
                            <strong>Question</strong>
                            <p>{entry.question}</p>
                          </div>

                          <div className="transcript-block">
                            <strong>Your answer</strong>
                            <p>{entry.answer}</p>
                          </div>

                          <div className="transcript-block">
                            <strong>Feedback</strong>
                            <p>{entry.rationale}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
