import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizApi } from '../lib/api';
import '../styles/QuizPages.css';

const TopicQuiz: React.FC = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartQuiz = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim()) {
      return;
    }

    setLoading(true);

    try {
      const response = await quizApi.createSession({
        knowledge_mode: 'prompt',
        topic: topic,
      });

      navigate(`/quiz/${response.session.id}`);
    } catch (error: any) {
      alert('Failed to start quiz: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const exampleTopics = [
    'Photosynthesis',
    'World War II',
    'Machine Learning',
    'Quantum Physics',
    'Roman Empire',
    'Climate Change',
  ];

  return (
    <div className="quiz-page">
      <div className="page-stack">
        <section className="page-hero glass-panel">
          <div className="page-hero-content">
            <div className="page-header">
              <span className="page-kicker">Topic mode</span>
              <h1>Turn any subject into a high-energy quiz session.</h1>
              <p className="page-description">
                Enter a topic, launch adaptive questions instantly, and build mastery through tight,
                feedback-rich rounds that keep you engaged.
              </p>
            </div>

            <div className="hero-metrics">
              <div className="hero-metric">
                <strong>Instant</strong>
                <span>No setup beyond your topic prompt</span>
              </div>
              <div className="hero-metric">
                <strong>Adaptive</strong>
                <span>Questions evolve with each answer</span>
              </div>
            </div>
          </div>
        </section>

        <div className="quiz-grid">
          <section className="quiz-card glass-panel">
            <div className="quiz-card-inner">
              <div className="card-head">
                <div className="card-icon topic-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="card-copy">
                  <h2>Compose your next challenge</h2>
                  <p>Use a broad concept, a narrow chapter, or a very specific skill you want to sharpen.</p>
                </div>
              </div>

              <form onSubmit={handleStartQuiz} className="quiz-form">
                <div className="form-group">
                  <label htmlFor="topic">What would you like to learn about?</label>
                  <input
                    id="topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter a topic or subject..."
                    className="form-input"
                    autoFocus
                  />
                </div>

                <div className="example-topics">
                  <p className="example-label">Popular launch prompts</p>
                  <div className="topic-chips">
                    {exampleTopics.map((exampleTopic) => (
                      <button
                        key={exampleTopic}
                        type="button"
                        className="topic-chip"
                        onClick={() => setTopic(exampleTopic)}
                      >
                        {exampleTopic}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !topic.trim()}
                  className="submit-btn"
                >
                  {loading ? (
                    <>
                      <span className="loader loader-inline" aria-hidden="true"></span>
                      Building quiz...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                      Start learning
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>

          <aside className="info-column">
            <section className="info-card glass-panel">
              <div className="info-card-inner">
                <h3>How the session feels</h3>
                <ol className="info-list">
                  <li>Quizly opens with a focused first question built from your prompt.</li>
                  <li>You answer in natural language and get immediate scoring and rationale.</li>
                  <li>Each turn adjusts the depth and direction of the next question.</li>
                  <li>The transcript becomes a compact study trail you can revisit.</li>
                </ol>
              </div>
            </section>

            <section className="info-card glass-panel">
              <div className="info-card-inner feature-callout">
                <h3>Best for</h3>
                <div className="feature-chip-row">
                  <span className="feature-chip">Exam prep</span>
                  <span className="feature-chip">Interview study</span>
                  <span className="feature-chip">Rapid revision</span>
                  <span className="feature-chip">Concept drilling</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default TopicQuiz;
