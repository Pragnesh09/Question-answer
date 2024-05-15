import { client } from "../database/database.js";

// Create a new user
const createUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Validate email format
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Check if username and email are unique
    const existingUser = await client.query(
      `SELECT * FROM users WHERE username = $1 OR email = $2`,
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Username or email already exists." });
    }

    // Insert user into database
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
    const { question, options } = req.body;

    // Validate input
    if (
      !question ||
      !options ||
      !Array.isArray(options) ||
      options.length < 2
    ) {
      return res
        .status(400)
        .json({ message: "Question and at least two options are required." });
    }

    // Insert question
    const questionResponse = await client.query(
      `INSERT INTO questions(question_text) VALUES($1) RETURNING *`,
      [question]
    );
    const questionId = questionResponse.rows[0].question_id;

    // Insert options
    const optionResponses = await Promise.all(
      options.map((optionText) =>
        client.query(
          `INSERT INTO options(question_id, option_text) VALUES($1, $2) RETURNING *`,
          [questionId, optionText]
        )
      )
    );

    res.status(200).json({
      message: "Question Added Successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Something went wrong." });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { question_text, options } = req.body;

    // Check if question ID is provided and valid
    if (!req.params.id || isNaN(parseInt(req.params.id))) {
      return res.status(400).json({ message: "Invalid question ID." });
    }

    // Check if question exists
    const questionExists = await client.query(
      `SELECT * FROM questions WHERE question_id = $1`,
      [req.params.id]
    );
    if (questionExists.rows.length === 0) {
      return res.status(404).json({ message: "Question not found." });
    }

    // Update question text
    await client.query(
      `UPDATE questions SET question_text = $1 WHERE question_id = $2`,
      [question_text, req.params.id]
    );

    const existingOptions = await client.query(
      "SELECT option_id FROM options WHERE question_id = $1",
      [req.params.id]
    );
    const existingOptionIds = existingOptions.rows.map((row) => row.option_id);
    console.log("🚀 ~ updateQuestion ~ existingOptionIds:", existingOptionIds);

    for (const option of options) {
      if (option.option_id) {
        // Update existing option
        if (existingOptionIds.includes(option.option_id)) {
          await client.query(
            "UPDATE options SET option_text = $1 WHERE option_id = $2",
            [option.option_text, option.option_id]
          );
        }
      } else {
        // Store new option
        await client.query(
          "INSERT INTO options (option_text , question_id) VALUES ($1,$2)",
          [option.option_text, req.params.id]
        );
      }
    }

    res.send("Hello");
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong." });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    // Check if question ID is provided and valid
    if (!req.params.id || isNaN(parseInt(req.params.id))) {
      return res.status(400).json({ message: "Invalid question ID." });
    }

    // Check if question exists
    const questionExists = await client.query(
      `SELECT * FROM questions WHERE question_id = $1`,
      [req.params.id]
    );

    if (questionExists.rows.length === 0) {
      return res.status(404).json({ message: "Question not found." });
    }

    // Delete options
    await client.query(`DELETE FROM options WHERE question_id = $1`, [
      req.params.id,
    ]);

    // Then delete the question
    await client.query(`DELETE FROM questions WHERE question_id = $1`, [
      req.params.id,
    ]);

    res
      .status(200)
      .json({ message: "Question and options deleted successfully." });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong." });
  }
};

const listQuestion = async (req, res) => {
  try {
    const result = await client.query(`
      SELECT q.question_id, q.question_text, o.option_id , o.option_text
      FROM questions q
      LEFT JOIN options o ON q.question_id = o.question_id
    `);

    const questionGroup = [];
    let currentQuestion = null;

    result.rows.forEach((row) => {
      if (!currentQuestion || currentQuestion.question_id !== row.question_id) {
        // If the current question is different from the previous one,
        // create a new question object
        currentQuestion = {
          question_id: row.question_id,
          question_text: row.question_text,
          options: [],
        };
        // Add the question object to the questionGroup array
        questionGroup.push(currentQuestion);
      }
      // Add option to the current question's options array
      currentQuestion.options.push({
        option_id: row.option_id,
        option_text: row.option_text,
      });
    });

    res.status(200).json({
      message: "Question and options listed successfully.",
      questionGroup: questionGroup,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong." });
  }
};

const storeResponse = async (req, res) => {
  try {
    const { questionId, userId, priority } = req.body;

    // Check if question ID is provided and valid
    if (!questionId || isNaN(parseInt(questionId))) {
      return res.status(400).json({ message: "Invalid question ID." });
    }

    // Check if question exists
    const questionExists = await client.query(
      `SELECT * FROM questions WHERE question_id = $1`,
      [questionId]
    );

    if (questionExists.rows.length === 0) {
      return res.status(404).json({ message: "Question not found." });
    }

    for (let i = 0; i < priority.length; i++) {
      const optionId = priority[i];
      const priorityValue = i + 1;

      // Insert priority into the database
      await client.query(
        "INSERT INTO user_responses(question_id, option_id, user_id, priority) VALUES ($1, $2, $3, $4)",
        [questionId, optionId, userId, priorityValue]
      );
    }

    res.status(200).json({
      message: "User response store Successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong." });
  }
};

const finalReport = async (req, res) => {
  try {
    const questionId = req.params.id;
    const responses = await client.query(
      `
      SELECT *
      FROM user_responses
      WHERE question_id = $1
      AND priority = 1;
    `,
      [questionId]
    );

    const totalCount = responses.rows.length;
    const optionCounts = {};
    responses.rows.forEach((row) => {
      const optionId = row.option_id;
      optionCounts[optionId] = (optionCounts[optionId] || 0) + 1;
    });

    console.log("🚀 ~ finalReport ~ optionCounts:", optionCounts);

    const optionPercentages = Object.entries(optionCounts).map(
      ([optionId, count]) => ({
        option_id: optionId,
        percentage: (count / totalCount) * 100,
      })
    );
    console.log("🚀 ~ finalReport ~ optionPercentages:", optionPercentages);

    res.status(200).json({
      option_percentages: optionPercentages,
      message: "Report listed..",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong." });
  }
};

export {
  createUser,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listQuestion,
  storeResponse,
  finalReport,
};
