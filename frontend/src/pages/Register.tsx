import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register. Please try again.');
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
                <span>Premium onboarding</span>
                <h1>Quizly</h1>
              </div>
            </div>

            <div className="auth-story">
              <span className="auth-kicker">Create your account</span>
              <h2>Build a study habit inside a workspace designed to feel rewarding.</h2>
              <p>
                Start generating quizzes from any topic or PDF, answer in flowing rounds, and keep
                momentum with crisp feedback after each turn.
              </p>
            </div>

            <div className="auth-highlights">
              <div className="auth-highlight">
                <strong>Topics</strong>
                <span>Spin up subject-based quiz sessions in seconds.</span>
              </div>
              <div className="auth-highlight">
                <strong>Documents</strong>
                <span>Upload PDFs and transform dense material into active recall.</span>
              </div>
              <div className="auth-highlight">
                <strong>Feedback</strong>
                <span>Track score shifts and improve every response cycle.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card glass-panel">
          <div className="auth-card-content">
            <div className="auth-card-header">
              <h3>Create your account</h3>
              <p>Set up access once and keep all of your quiz sessions in one place.</p>
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
                  placeholder="Create a secure password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat your password"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary auth-submit">
                {loading ? (
                  <>
                    <span className="loader loader-inline" aria-hidden="true"></span>
                    Creating account...
                  </>
                ) : (
                  'Launch Quizly'
                )}
              </button>
            </form>

            <p className="auth-link">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Register;
