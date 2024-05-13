export const optionModel = async (client) => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS options (
        option_id SERIAL PRIMARY KEY,
        question_id INT REFERENCES questions(question_id),
        option_text TEXT
    );
    `;
    await client.query(query);
    console.log("Option table created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
  }
};
