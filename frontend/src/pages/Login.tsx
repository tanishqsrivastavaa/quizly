import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/topic-quiz');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-shell">
        <section className="auth-hero glass-panel">
          <div className="auth-hero-content">
            <div className="auth-brand">
              <div className="auth-brand-mark">Q</div>
              <div className="auth-brand-copy">
                <span>Adaptive learning</span>
                <h1>Quizly</h1>
              </div>
            </div>

            <div className="auth-story">
              <span className="auth-kicker">Premium Quiz Studio</span>
              <h2>Sharpen recall with a richer, faster, more immersive quiz flow.</h2>
              <p>
                Generate high-focus Socratic sessions from topics or source material, track every turn,
                and stay in a workspace built for deliberate practice.
              </p>
            </div>

            <div className="auth-highlights">
              <div className="auth-highlight">
                <strong>Live</strong>
                <span>Instant quiz sessions with structured feedback after every answer.</span>
              </div>
              <div className="auth-highlight">
                <strong>Adaptive</strong>
                <span>Questioning shifts with your performance and improves retention.</span>
              </div>
              <div className="auth-highlight">
                <strong>Focused</strong>
                <span>Minimal friction, premium readability, and strong visual hierarchy.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card glass-panel">
          <div className="auth-card-content">
            <div className="auth-card-header">
              <h3>Welcome back</h3>
              <p>Sign in to continue your study sessions and launch a new quiz.</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary auth-submit">
                {loading ? (
                  <>
                    <span className="loader loader-inline" aria-hidden="true"></span>
                    Logging in...
                  </>
                ) : (
                  'Enter Workspace'
                )}
              </button>
            </form>

            <p className="auth-link">
              Need an account? <Link to="/register">Create one</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
