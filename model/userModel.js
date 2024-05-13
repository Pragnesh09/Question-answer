export const userModel = async (client) => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(255),
        email VARCHAR(255),
        password VARCHAR(255)
      )
    `;
    await client.query(query);
    console.log("User table created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
  }
};
