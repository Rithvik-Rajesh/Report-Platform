import { Pool } from 'pg';

// Create a singleton database connection
class Database {
  private static instance: Database;
  private pool: Pool;
  private initialized: boolean = false;

  private constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("No database connection string found. Please set DATABASE_URL in your .env file");
    }

    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Initialize database on instantiation
    this.initializeDatabase();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private async initializeDatabase() {
    try {
      await this.init();
      this.initialized = true;
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      // Not throwing here allows the server to continue running even if DB init fails
    }
  }

  public async query<T = any>(text: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.pool.query(text, params);
      return result.rows;
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  }

  // Database initialization script
  private async init() {
    // Create enums with proper error handling
    try {
      // For creating enums, we need to check if they exist first
      const roleEnum = `
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
              CREATE TYPE user_role AS ENUM ('STUDENT', 'STAFF');
          END IF;
      END $$;
      `;
      await this.query(roleEnum);

      const difficultyEnum = `
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty') THEN
              CREATE TYPE difficulty AS ENUM ('EASY', 'MEDIUM', 'HARD');
          END IF;
      END $$;
      `;
      await this.query(difficultyEnum);
    } catch (error) {
      console.error("Error creating enum types:", error);
      throw error;
    }

    try {
      // Create sessions table
      const sessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      `;
      await this.query(sessionsTable);

      const user_table = `
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          roll_no VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          role user_role DEFAULT 'STUDENT'
      );
      `;
      await this.query(user_table);

      const student_table = `
      CREATE TABLE IF NOT EXISTS students (
          id INTEGER REFERENCES users(id) PRIMARY KEY
      );
      `;
      await this.query(student_table);

      const staff_table = `
      CREATE TABLE IF NOT EXISTS staff (
          id INTEGER REFERENCES users(id) PRIMARY KEY
      );
      `;
      await this.query(staff_table);

      const course_table = `
      CREATE TABLE IF NOT EXISTS courses (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          code VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `;
      await this.query(course_table);

      const staff_course_table = `
      CREATE TABLE IF NOT EXISTS course_staff (
          id SERIAL PRIMARY KEY,
          staff_id INTEGER REFERENCES staff(id),
          course_id INTEGER REFERENCES courses(id),
          role VARCHAR(100) NOT NULL
      );
      `;
      await this.query(staff_course_table);

      const student_course_table = `
      CREATE TABLE IF NOT EXISTS course_student (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id),
          course_id INTEGER REFERENCES courses(id),
          enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `;
      await this.query(student_course_table);

      const course_topic_table = `
      CREATE TABLE IF NOT EXISTS course_topics (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id),
          topic VARCHAR(100) NOT NULL
      );
      `;
      await this.query(course_topic_table);

      const course_type_table = `
      CREATE TABLE IF NOT EXISTS course_types (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id),
          type VARCHAR(100) NOT NULL
      );
      `;
      await this.query(course_type_table);

      const quiz_table = `
      CREATE TABLE IF NOT EXISTS quizzes (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id),
          title VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          duration INTEGER
      );
      `;
      await this.query(quiz_table);

      const question_table = `
      CREATE TABLE IF NOT EXISTS questions (
          id SERIAL PRIMARY KEY,
          quiz_id INTEGER REFERENCES quizzes(id),
          question TEXT NOT NULL,
          score INTEGER DEFAULT 1,
          difficulty difficulty DEFAULT 'EASY',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `;
      await this.query(question_table);

      const option_question = `
      CREATE TABLE IF NOT EXISTS question_option (
          id SERIAL PRIMARY KEY,
          question_id INTEGER REFERENCES questions(id),
          option_text TEXT NOT NULL,
          is_correct BOOLEAN DEFAULT FALSE
      );
      `;
      await this.query(option_question);

      const question_topic_table = `
      CREATE TABLE IF NOT EXISTS question_topic (
          id SERIAL PRIMARY KEY,
          question_id INTEGER REFERENCES questions(id),
          topic_id INTEGER REFERENCES course_topics(id)
      );
      `;
      await this.query(question_topic_table);

      const question_type_table = `
      CREATE TABLE IF NOT EXISTS question_type (
          id SERIAL PRIMARY KEY,
          question_id INTEGER REFERENCES questions(id),
          type_id INTEGER REFERENCES course_types(id)
      );
      `;
      await this.query(question_type_table);

      const quiz_attempt_table = `
      CREATE TABLE IF NOT EXISTS quiz_attempts (
          id SERIAL PRIMARY KEY,
          marks_awarded INTEGER DEFAULT 0,
          quiz_id INTEGER REFERENCES quizzes(id),
          student_id INTEGER REFERENCES students(id),
          question_id INTEGER REFERENCES questions(id),
          selected_option INTEGER REFERENCES question_option(id)
      );
      `;
      await this.query(quiz_attempt_table);

      const quiz_result_table = `
      CREATE TABLE IF NOT EXISTS quiz_results (
          id SERIAL PRIMARY KEY,
          score INTEGER DEFAULT 0,
          quiz_id INTEGER REFERENCES quizzes(id),
          student_id INTEGER REFERENCES students(id)
      );
      `;
      await this.query(quiz_result_table);

      const student_topic_performance = `
      CREATE TABLE IF NOT EXISTS student_topic_performance (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id),
          course_id INTEGER REFERENCES courses(id),
          topic_id INTEGER REFERENCES course_topics(id),
          quiz_id INTEGER REFERENCES quizzes(id),
          total_questions INTEGER,
          correct_answers INTEGER,
          score INTEGER,
          evaluated_at TIMESTAMP
      );
      `;
      await this.query(student_topic_performance);

      const student_type_performance = `
      CREATE TABLE IF NOT EXISTS student_type_performance (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id),
          course_id INTEGER REFERENCES courses(id),
          type_id INTEGER REFERENCES course_types(id),
          quiz_id INTEGER REFERENCES quizzes(id),
          total_questions INTEGER,
          correct_answers INTEGER,
          score INTEGER,
          evaluated_at TIMESTAMP
      );
      `;
      await this.query(student_type_performance);

      const class_topic_performance = `
      CREATE TABLE IF NOT EXISTS class_topic_performance (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id),
          topic_id INTEGER REFERENCES course_topics(id),
          quiz_id INTEGER REFERENCES quizzes(id),
          avg_score FLOAT,
          avg_accuracy FLOAT,
          evaluated_at TIMESTAMP
      );
      `;
      await this.query(class_topic_performance);

      const class_type_performance = `
      CREATE TABLE IF NOT EXISTS class_type_performance (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id),
          type_id INTEGER REFERENCES course_types(id),
          quiz_id INTEGER REFERENCES quizzes(id),
          avg_score FLOAT,
          avg_accuracy FLOAT,
          evaluated_at TIMESTAMP
      );
      `;
      await this.query(class_type_performance);

    } catch (error) {
      console.error("Error creating tables:", error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export the singleton instance
const db = Database.getInstance();

export default {
  query: <T = any>(text: string, params: any[] = []): Promise<T[]> => db.query<T>(text, params),
};