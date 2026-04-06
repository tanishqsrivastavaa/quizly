import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { documentApi, quizApi } from '../lib/api';
import type { Document } from '../types/api';
import '../styles/Home.css';

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedMode, setSelectedMode] = useState<'prompt' | 'document'>('prompt');
  const [topic, setTopic] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loading, setLoading] = useState(false);
  
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await documentApi.list();
      setDocuments(docs.filter(d => d.status === 'completed'));
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    // Clear any existing timeouts
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
    }
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }

    setUploading(true);
    setUploadProgress('Uploading...');

    try {
      const doc = await documentApi.upload(file);
      setUploadProgress('Processing document...');
      
      // Poll for completion with max attempts (5 minutes at 2-second intervals)
      const MAX_POLLING_ATTEMPTS = 150;
      let attemptCount = 0;

      const checkStatus = async () => {
        try {
          if (attemptCount >= MAX_POLLING_ATTEMPTS) {
            setUploadProgress('Processing timeout - please refresh the page');
            cleanupTimeoutRef.current = setTimeout(() => {
              setUploading(false);
              setUploadProgress('');
            }, 5000);
            return;
          }

          attemptCount++;
          const updatedDoc = await documentApi.get(doc.id);
          
          if (updatedDoc.status === 'completed') {
            setUploadProgress('Document ready!');
            await loadDocuments();
            cleanupTimeoutRef.current = setTimeout(() => {
              setUploading(false);
              setUploadProgress('');
            }, 1500);
          } else if (updatedDoc.status === 'failed') {
            setUploadProgress('Upload failed: ' + updatedDoc.failure_reason);
            cleanupTimeoutRef.current = setTimeout(() => {
              setUploading(false);
              setUploadProgress('');
            }, 3000);
          } else {
            // Still processing or pending
            pollTimeoutRef.current = setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          console.error('Status check failed:', error);
          setUploadProgress('Failed to check status - retrying...');
          pollTimeoutRef.current = setTimeout(checkStatus, 2000);
        }
      };
      
      checkStatus();
    } catch (error: any) {
      setUploadProgress('Upload failed');
      console.error('Upload error:', error);
      cleanupTimeoutRef.current = setTimeout(() => {
        setUploading(false);
        setUploadProgress('');
      }, 3000);
    }
  };

  const handleStartQuiz = async () => {
    if (selectedMode === 'prompt' && !topic.trim()) {
      alert('Please enter a topic');
      return;
    }

    if (selectedMode === 'document' && !selectedDocId) {
      alert('Please select a document');
      return;
    }

    setLoading(true);

    try {
      const response = await quizApi.createSession({
        knowledge_mode: selectedMode,
        topic: selectedMode === 'prompt' ? topic : undefined,
        document_id: selectedMode === 'document' ? selectedDocId : undefined,
      });

      navigate(`/quiz/${response.session.id}`);
    } catch (error: any) {
      alert('Failed to start quiz: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Quizly</h1>
        <div className="user-info">
          <span>{user?.email}</span>
          <button onClick={logout} className="btn-secondary">Logout</button>
        </div>
      </header>

      <main className="home-main">
        <div className="welcome-section">
          <h2>Welcome to Quizly</h2>
          <p>Create adaptive Socratic quizzes from your documents or any topic</p>
        </div>

        <div className="quiz-setup">
          <h3>Start a New Quiz</h3>
          
          <div className="mode-selector">
            <button
              className={`mode-btn ${selectedMode === 'prompt' ? 'active' : ''}`}
              onClick={() => setSelectedMode('prompt')}
            >
              Topic-Based Quiz
            </button>
            <button
              className={`mode-btn ${selectedMode === 'document' ? 'active' : ''}`}
              onClick={() => setSelectedMode('document')}
            >
              Document-Based Quiz
            </button>
          </div>

          {selectedMode === 'prompt' ? (
            <div className="quiz-config">
              <label htmlFor="topic">Enter a topic to learn about:</label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis, World War II, Machine Learning"
                className="topic-input"
              />
            </div>
          ) : (
            <div className="quiz-config">
              <div className="document-upload">
                <label className="upload-label">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                  <span className="btn-secondary">
                    {uploading ? uploadProgress : 'Upload PDF Document'}
                  </span>
                </label>
              </div>

              {documents.length > 0 && (
                <div className="document-list">
                  <label>Or select an existing document:</label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="document-select"
                  >
                    <option value="">-- Select a document --</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.filename}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleStartQuiz}
            disabled={loading || (selectedMode === 'prompt' && !topic.trim()) || (selectedMode === 'document' && !selectedDocId)}
            className="btn-primary btn-large"
          >
            {loading ? 'Starting Quiz...' : 'Start Quiz'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Home;
