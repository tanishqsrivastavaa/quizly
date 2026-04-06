export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  content_type: string;
  storage_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizSession {
  id: string;
  user_id: string;
  document_id?: string;
  knowledge_mode: 'prompt' | 'document';
  topic?: string;
  status: 'active' | 'completed' | 'abandoned';
  mastery_map: Record<string, any>;
  current_question?: string;
  seed_context?: string;
  turns_completed: number;
  last_score?: number;
  created_at: string;
  updated_at: string;
}

export interface TranscriptEntry {
  id: string;
  session_id: string;
  user_id: string;
  turn_index: number;
  question: string;
  answer: string;
  score: number;
  rationale: string;
  hint?: string;
  next_question: string;
  created_at: string;
}

export interface CreateSessionRequest {
  knowledge_mode: 'prompt' | 'document';
  topic?: string;
  document_id?: string;
}

export interface CreateSessionResponse {
  session: QuizSession;
  first_question: string;
}

export interface AnswerRequest {
  answer: string;
}

export interface AnswerResponse {
  score: number;
  rationale: string;
  hint?: string;
  next_question: string;
  session_updated: QuizSession;
}
