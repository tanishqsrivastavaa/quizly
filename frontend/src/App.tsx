import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import TopicQuiz from './pages/TopicQuiz';
import DocumentQuiz from './pages/DocumentQuiz';
import Todos from './pages/Todos';
import Quiz from './pages/Quiz';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TopicQuiz />} />
            <Route path="topic-quiz" element={<TopicQuiz />} />
            <Route path="document-quiz" element={<DocumentQuiz />} />
            <Route path="todos" element={<Todos />} />
          </Route>
          <Route
            path="/quiz/:sessionId"
            element={
              <ProtectedRoute>
                <Quiz />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
