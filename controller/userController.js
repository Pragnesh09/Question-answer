import { client } from "../database/database.js";

// Create a new user
const createUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const user = await client.query(
      `INSERT INTO users(username,email,password) VALUES($1,$2,$3) RETURNING * `,
      [username, email, password]
    );

    res
      .status(200)
      .json({ user: user.rows[0], message: "User Insert Successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const createQuestion = async (req, res) => {
  try {
    const question = req.body.question;

    const response = await client.query(
      `INSERT INTO questions(question_text) VALUES($1) RETURNING *`,
      [question]
    );

    res.status(200).json({
      question: response.rows[0],
      message: "Question Insert Successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong." });
  }
};

const createOption = async (req, res) => {
  try {
    const { question_id, optionText } = req.body;
    const response = await client.query(
      `INSERT INTO options(question_id , option_text) VALUES($1,$2) RETURNING *`,
      [question_id, optionText]
    );

    res.status(200).json({
      options: response.rows[0],
      message: "Options Insert Successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong." });
  }
};
const storeResponse = async (req, res) => {
  try {
    const { questionId, optionId, userId, priority } = req.body;

    const response = await client.query(
      `INSERT INTO user_responses(question_id, option_id, user_id, priority) VALUES ($1, $2, $3, $4) RETURNING *`,
      [questionId, optionId, userId, priority]
    );

    res.status(200).json({
      response: response.rows[0],
      message: "User response store Successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong." });
  }
};

const finalReport = async (req, res) => {
  try {
    const response = await client.query(`
      SELECT q.question_id, q.question_text, o.option_id, o.option_text, COUNT(ur.priority) AS priority_count
      FROM questions q
      JOIN options o ON q.question_id = o.question_id
      LEFT JOIN user_responses ur ON o.option_id = ur.option_id
      GROUP BY q.question_id, q.question_text, o.option_id, o.option_text
      ORDER BY q.question_id, o.option_id, priority_count DESC;
    `);
    console.log(response);
    res.status(200).json({
      response: response.rows,
      message: "Report listed..",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong." });
  }
};

export { createUser, createQuestion, createOption, storeResponse, finalReport };
