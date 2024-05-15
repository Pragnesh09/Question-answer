export const userModel = async (client) => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `;
    await client.query(query);
    console.log("User table created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
  }
};
