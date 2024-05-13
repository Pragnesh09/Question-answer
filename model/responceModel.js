export const responseModel = async (client) => {
  try {
    const query = `
        CREATE TABLE IF NOT EXISTS user_responses (
            response_id SERIAL PRIMARY KEY,
            question_id INT REFERENCES questions(question_id),
            option_id INT REFERENCES options(option_id),
            user_id INT,
            priority INT
      );
      `;
    await client.query(query);
    console.log("Response table created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
  }
};
