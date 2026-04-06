import axios from 'axios';
import type {
  AuthResponse,
  User,
  Document,
  QuizSession,
  CreateSessionRequest,
  CreateSessionResponse,
  AnswerRequest,
  AnswerResponse,
  TranscriptEntry,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth APIs
export const authApi = {
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', { email, password });
    return response.data;
  },
  
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },
  
  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

// Document APIs
export const documentApi = {
  upload: async (file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<Document>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  get: async (id: string): Promise<Document> => {
    const response = await api.get<Document>(`/documents/${id}`);
    return response.data;
  },
  
  list: async (): Promise<Document[]> => {
    const response = await api.get<Document[]>('/documents');
    return response.data;
  },
};

// Quiz APIs
export const quizApi = {
  createSession: async (data: CreateSessionRequest): Promise<CreateSessionResponse> => {
    const response = await api.post<CreateSessionResponse>('/quiz/sessions', data);
    return response.data;
  },
  
  getSession: async (id: string): Promise<QuizSession> => {
    const response = await api.get<QuizSession>(`/quiz/sessions/${id}`);
    return response.data;
  },
  
  submitAnswer: async (sessionId: string, data: AnswerRequest): Promise<AnswerResponse> => {
    const response = await api.post<AnswerResponse>(`/quiz/sessions/${sessionId}/answer`, data);
    return response.data;
  },
  
  getTranscript: async (sessionId: string): Promise<TranscriptEntry[]> => {
    const response = await api.get<TranscriptEntry[]>(`/quiz/sessions/${sessionId}/transcript`);
    return response.data;
  },
};

export default api;
