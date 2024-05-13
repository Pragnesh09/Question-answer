import pkg from "pg";
const { Pool } = pkg;
import { userModel } from "../model/userModel.js";

const client = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "123",
  port: 5432,
});

const connectDatabase = async () => {
  try {
    await client.connect(); // Ensure client is connected before using it
    await userModel(client);
    console.log("Database connection established successfully");
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
};

export { client, connectDatabase };
