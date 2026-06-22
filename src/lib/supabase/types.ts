export type DocumentStatus = "processing" | "ready" | "error";
export type FileType = "pdf" | "docx" | "pptx" | "txt" | "png" | "jpg" | "jpeg";

export interface Document {
  id: string;
  name: string;
  file_url: string | null;
  file_type: FileType;
  page_count: number | null;
  status: DocumentStatus;
  chunk_count: number;
  created_at: string;
}

export interface Summary {
  id: string;
  document_id: string;
  content: string;
  created_at: string;
}

export interface Flashcard {
  id: string;
  document_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  document_id: string;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizResult {
  id: string;
  quiz_id: string;
  score: number;
  total: number;
  answers: number[];
  taken_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: string;
}

export interface ChatSession {
  id: string;
  document_id: string;
  messages: ChatMessage[];
  updated_at: string;
}
