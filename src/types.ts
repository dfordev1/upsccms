export interface Question {
  id: string;
  user_id: string;
  exam_year: number;
  paper_number: string;
  question_number: number;
  stem: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  educational_objective: string;
  subject: string;
  system: string;
  topic: string;
  subtopic: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  choice_5?: string;
  correct_answer: number;
  choice_1_explanation: string;
  choice_2_explanation: string;
  choice_3_explanation: string;
  choice_4_explanation: string;
  choice_5_explanation?: string;
  created_at?: string;
}

export type QuestionInsert = Omit<Question, 'id' | 'created_at' | 'user_id'>;

export interface TestSession {
  id: string;
  user_id: string;
  mode: 'tutor' | 'timed' | 'auto';
  status: 'in-progress' | 'completed';
  questions: Question[];
  answers: Record<string, number>;
  marked: string[];
  crossed_out: Record<string, number[]>;
  time_spent: Record<string, number>;
  created_at: string;
  completed_at?: string;
  score?: number;
  total_time?: number;
  auto_question_time?: number;
  auto_answer_time?: number;
  bookmarked?: string[]; // question IDs
  notes?: Record<string, string>; // question id -> note text
  highlights?: Record<string, string[]>; // question id -> array of highlighted text snippets
}
