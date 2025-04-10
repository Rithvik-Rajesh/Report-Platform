import db from '@/lib/db';

// This is a file that's imported during app initialization
const initDb = async () => {
  try {
    // Just run a simple query to ensure connection is established
    await db.query('SELECT 1');
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
  }
};

// Execute initialization
initDb().catch(console.error);

export {};