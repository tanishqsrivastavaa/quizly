import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentApi, quizApi } from '../lib/api';
import type { Document } from '../types/api';
import '../styles/QuizPages.css';

const DocumentQuiz: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loading, setLoading] = useState(false);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

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
      setDocuments(docs.filter((d) => d.status === 'completed'));
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
            setSelectedDocId(updatedDoc.id);
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

  const handleStartQuiz = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDocId) {
      return;
    }

    setLoading(true);

    try {
      const response = await quizApi.createSession({
        knowledge_mode: 'document',
        document_id: selectedDocId,
      });

      navigate(`/quiz/${response.session.id}`);
    } catch (error: any) {
      alert('Failed to start quiz: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-page">
      <div className="page-stack">
        <section className="page-hero glass-panel">
          <div className="page-hero-content">
            <div className="page-header">
              <span className="page-kicker">Document mode</span>
              <h1>Convert dense PDFs into an elegant quiz experience.</h1>
              <p className="page-description">
                Upload a source file or choose one you already processed. Quizly extracts the knowledge,
                then turns it into structured rounds with immediate scoring.
              </p>
            </div>

            <div className="hero-metrics">
              <div className="hero-metric">
                <strong>PDF-ready</strong>
                <span>Optimized for active recall from source material</span>
              </div>
              <div className="hero-metric">
                <strong>Guided</strong>
                <span>Ideal for course packs, notes, and long reads</span>
              </div>
            </div>
          </div>
        </section>

        <div className="quiz-grid">
          <section className="quiz-card glass-panel">
            <div className="quiz-card-inner">
              <div className="card-head">
                <div className="card-icon document-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                    <path d="M13 2v7h7" />
                  </svg>
                </div>
                <div className="card-copy">
                  <h2>Upload your learning source</h2>
                  <p>Choose a PDF, wait for processing to complete, then launch a quiz from that document.</p>
                </div>
              </div>

              <form onSubmit={handleStartQuiz} className="quiz-form">
                <div className="upload-section">
                  <label htmlFor="file-upload" className="upload-area">
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                    <div className="upload-content">
                      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                      {uploading ? (
                        <div className="upload-status">
                          <div className="loader loader-small" aria-hidden="true"></div>
                          <p>{uploadProgress}</p>
                        </div>
                      ) : (
                        <>
                          <p className="upload-text">Drop in a PDF or click to browse</p>
                          <p className="upload-hint">The processed document will become selectable automatically.</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {documents.length > 0 && (
                  <div className="form-group">
                    <label htmlFor="document-select">Or select an existing processed document</label>
                    <select
                      id="document-select"
                      value={selectedDocId}
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      className="form-select"
                    >
                      <option value="">Choose a document</option>
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="document-status">
                  <span className="status-pill">{documents.length} ready document{documents.length === 1 ? '' : 's'}</span>
                  <span className="status-pill">PDF only</span>
                  <span className="status-pill">Adaptive questioning</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedDocId}
                  className="submit-btn"
                >
                  {loading ? (
                    <>
                      <span className="loader loader-inline" aria-hidden="true"></span>
                      Preparing quiz...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                      Start document quiz
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>

          <aside className="info-column">
            <section className="info-card glass-panel">
              <div className="info-card-inner">
                <h3>Processing notes</h3>
                <ul className="info-list">
                  <li>Upload PDF documents only.</li>
                  <li>Processing typically completes in 10 to 30 seconds.</li>
                  <li>Finished files remain available in your document selector.</li>
                </ul>
              </div>
            </section>

            <section className="info-card glass-panel">
              <div className="info-card-inner feature-callout">
                <h3>Great use cases</h3>
                <div className="feature-chip-row">
                  <span className="feature-chip">Lecture notes</span>
                  <span className="feature-chip">Research papers</span>
                  <span className="feature-chip">Study guides</span>
                  <span className="feature-chip">Course packets</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default DocumentQuiz;
