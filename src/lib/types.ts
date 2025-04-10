export enum UserRole {
  STUDENT = 'STUDENT',
  STAFF = 'STAFF'
}

export type User = {
  id: string | number;
  name: string;
  email: string;
  roll_no: string;
  password: string;
  created_at: Date;
  updated_at: Date;
  role: UserRole;
}

export type UserCreateInput = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type UserUpdateInput = Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
export type UserResponse = Omit<User, 'password'>;


export interface Session {
  id: string;
  userId: number;
  expires: Date;
  user?: User;
}

export interface SessionPayload {
  id: number;
  name: string;
  email: string;
  roll_no: string;
  role: UserRole;
}


export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Question {
    id: number;
    quiz_id: string | number;
    question: string;
    score: number;
    difficulty: Difficulty;
    created_at: Date;
}

export interface QuestionCreateInput {
    quiz_id: string | number;
    question: string;
    score?: number;
    difficulty?: Difficulty;
    options: QuestionOptionCreateInput[];
}

export interface QuestionUpdateInput {
    question?: string;
    score?: number;
    difficulty?: Difficulty;
}

export interface QuestionOption {
    id: string | number;
    question_id: string | number;
    option_text: string;
    is_correct: boolean;
}

export interface QuestionOptionCreateInput {
    option_text: string;
    is_correct: boolean;
}

export interface QuestionWithOptions extends Question {
    options: QuestionOption[];
}

export interface QuestionTopic {
    id: string | number;
    question_id: string | number;
    topic_id: string | number;
}

export interface Course {
  id: string | number;
  name: string;
  code: string;
  description: string | null;
  created_at: Date;
}

export interface CourseCreateInput {
  name: string;
  code: string;
  description: string | null;
}

export interface CourseUpdateInput {
  name: string;
  code: string;
  description: string | null;
}

