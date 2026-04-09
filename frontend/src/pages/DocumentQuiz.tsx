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
      <div className="page-header">
        <h1>Document-Based Quiz</h1>
        <p className="page-description">
          Quiz yourself on PDF content
        </p>
      </div>

      <div className="quiz-card">
        <div className="card-icon document-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
            <path d="M13 2v7h7" />
          </svg>
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
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                {uploading ? (
                  <div className="upload-status">
                    <div className="loader loader-small" aria-hidden="true"></div>
                    <p>{uploadProgress}</p>
                  </div>
                ) : (
                  <>
                    <p className="upload-text">Click to upload PDF</p>
                    <p className="upload-hint">or drag and drop</p>
                  </>
                )}
              </div>
            </label>
          </div>

          {documents.length > 0 && (
            <div className="form-group">
              <label htmlFor="document-select">Or select an existing document:</label>
              <select
                id="document-select"
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="form-select"
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

          <button
            type="submit"
            disabled={loading || !selectedDocId}
            className="submit-btn"
          >
            {loading ? (
              <>
                <span className="loader" aria-hidden="true"></span>
                Starting Quiz...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Start Quiz
              </>
            )}
          </button>
        </form>
      </div>

      <div className="info-section">
        <div className="info-card">
          <h3>Supported formats</h3>
          <ul className="info-list">
            <li>PDF documents (.pdf)</li>
            <li>Maximum file size: 10MB</li>
            <li>Processing typically takes 10-30 seconds</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DocumentQuiz;
