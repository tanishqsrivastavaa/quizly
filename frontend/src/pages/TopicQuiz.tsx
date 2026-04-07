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
    'Climate Change'
  ];

  return (
    <div className="quiz-page">
      <div className="page-header">
        <h1>Topic-Specific Quiz</h1>
        <p className="page-description">
          Learn any subject through interactive Socratic questioning
        </p>
      </div>

      <div className="quiz-card">
        <div className="card-icon topic-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
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
            <p className="example-label">Popular topics:</p>
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
                <span className="spinner"></span>
                Starting Quiz...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Start Learning
              </>
            )}
          </button>
        </form>
      </div>

      <div className="info-section">
        <div className="info-card">
          <h3>How it works</h3>
          <ol className="info-list">
            <li>Enter any topic you want to learn about</li>
            <li>Our AI generates adaptive Socratic questions</li>
            <li>Answer questions and receive immediate feedback</li>
            <li>Questions adapt based on your understanding</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TopicQuiz;
