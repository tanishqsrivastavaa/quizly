import React from 'react';
import '../styles/QuizPages.css';

const Todos: React.FC = () => {
  const futureFeatures = [
    {
      category: 'Quiz Features',
      items: [
        'Multiple choice questions mode',
        'Timed quiz sessions',
        'Difficulty level selection',
        'Custom question count',
        'Review mode for past quizzes'
      ]
    },
    {
      category: 'Document Processing',
      items: [
        'Support for Word documents (.docx)',
        'Support for PowerPoint presentations (.pptx)',
        'Support for text files (.txt)',
        'OCR for scanned PDFs',
        'Batch document upload'
      ]
    },
    {
      category: 'User Experience',
      items: [
        'Dark mode toggle',
        'Quiz history and analytics',
        'Performance tracking over time',
        'Spaced repetition reminders',
        'Share quiz sessions with others'
      ]
    },
    {
      category: 'Social & Collaboration',
      items: [
        'Create study groups',
        'Leaderboards',
        'Share documents with team',
        'Collaborative quizzes',
        'Discussion forums for topics'
      ]
    },
    {
      category: 'Export & Integration',
      items: [
        'Export quiz results as PDF',
        'Flashcard generation from documents',
        'Integration with note-taking apps',
        'API access for developers',
        'Mobile app (iOS & Android)'
      ]
    }
  ];

  return (
    <div className="quiz-page todos-page">
      <div className="page-header">
        <h1>Future Features</h1>
        <p className="page-description">
          Exciting features planned for Quizly
        </p>
      </div>

      <div className="todos-grid">
        {futureFeatures.map((section) => (
          <div key={section.category} className="todo-card">
            <div className="todo-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              <h3>{section.category}</h3>
            </div>
            <ul className="todo-list">
              {section.items.map((item) => (
                <li key={item} className="todo-item">
                  <span className="todo-bullet"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="feedback-section">
        <div className="feedback-card">
          <h3>Have a feature request?</h3>
          <p>We'd love to hear your ideas! Help us build the best learning platform.</p>
          <button className="feedback-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            Send Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default Todos;
