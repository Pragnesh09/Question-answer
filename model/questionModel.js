export const questionModel = async (client) => {
  try {
    const query = `
        CREATE TABLE IF NOT EXISTS questions (
            question_id SERIAL PRIMARY KEY,
            question_text TEXT,
            isDeleted BOOLEAN DEFAULT false
        )
      `;
    await client.query(query);
    console.log("Question table created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
  }
};
