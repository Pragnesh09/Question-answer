import pkg from "pg";
const { Pool } = pkg;
import { userModel } from "../model/userModel.js";
import { questionModel } from "../model/questionModel.js";
import { optionModel } from "../model/optionModel.js";
import { responseModel } from "../model/responceModel.js";

const client = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "123",
  port: 5432,
});

const connectDatabase = async () => {
  try {
    await client.connect();
    await userModel(client);
    await questionModel(client);
    await optionModel(client);
    await responseModel(client);
    console.log("Database connection established successfully");
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
};

export { client, connectDatabase };
