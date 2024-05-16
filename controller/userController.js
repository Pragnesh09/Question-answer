import { client } from "../database/database.js";
import { validationResult } from "express-validator";

// Create a new user
const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array() });
    }

    const { userName, email, password } = req.body;

    // Check if userName and email are unique
    const existingUser = await client.query(
      `SELECT * FROM users WHERE username = $1 OR email = $2`,
      [userName, email]
    );

    if (existingUser.rows.length > 0) {
      if (existingUser.rows[0].username === userName) {
        return res
          .status(400)
          .json({ success: false, message: "userName already exists." });
      } else if (existingUser.rows[0].email === email) {
        return res
          .status(400)
          .json({ success: false, message: "Email already exists." });
      }
    }

    // Insert user into database
    const user = await client.query(
      `INSERT INTO users(username,email,password) VALUES($1,$2,$3) RETURNING * `,
      [userName, email, password]
    );

    res.status(200).json({
      success: true,
      message: "User Created.",
      Data: user.rows[0],
    });
  } catch (error) {
    console.error("Error >>", error);
    res.status(400).json({
      success: false,
      message: "Something went wrong.",
      data: error,
    });
  }
};

const createQuestion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array() });
    }

    const { question, options } = req.body;

    const existingQuestion = await client.query(
      `SELECT * FROM questions WHERE question_text = $1 `,
      [question]
    );

    if (existingQuestion.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Question already exist." });
    }

    // Insert question
    const questionResponse = await client.query(
      `INSERT INTO questions(question_text) VALUES($1) RETURNING *`,
      [question]
    );
    const questionId = questionResponse.rows[0].question_id;

    // Insert options
    options.map((optionText) =>
      client.query(
        `INSERT INTO options(question_id, option_text) VALUES($1, $2)`,
        [questionId, optionText]
      )
    );

    res.status(200).json({
      success: true,
      message: "Question add successfully.",
    });
  } catch (error) {
    console.error("Error >>", error);
    res.status(400).json({
      success: false,
      message: "Something went wrong.",
      data: error,
    });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array() });
    }

    const { question_text, options } = req.body;

    // Check if question exists
    const questionExists = await client.query(
      `SELECT * FROM questions WHERE question_id = $1 AND isDeleted = false`,
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

    // Update existing options and insert new options
    for (const option of options) {
      if (option.option_id) {
        // Check if the option_id exists for the specified question
        if (!existingOptionIds.includes(option.option_id)) {
          return res.status(400).json({
            success: false,
            message: `OptionId dose not exist.`,
          });
        }

        // Update existing option for the specified question
        await client.query(
          "UPDATE options SET option_text = $1 WHERE option_id = $2 AND question_id = $3",
          [option.option_text, option.option_id, req.params.id]
        );
      } else {
        // Store new option
        await client.query(
          "INSERT INTO options (option_text, question_id) VALUES ($1, $2)",
          [option.option_text, req.params.id]
        );
      }
    }

    // Delete options not present in the payload
    const optionsToDelete = existingOptionIds.filter(
      (optionId) => !options.some((option) => option.option_id === optionId)
    );
    console.log("🚀 ~ updateQuestion ~ optionsToDelete:", optionsToDelete);
    for (const optionId of optionsToDelete) {
      await client.query(
        `UPDATE options
        SET isDeleted = true
        WHERE option_id = $1 AND question_id = $2;`,
        [optionId, req.params.id]
      );

      await client.query(
        `
        UPDATE user_responses
        SET isDeleted = true
        WHERE option_id = $1
        `,
        [optionId]
      );
    }

    res.status(200).json({
      success: true,
      message: "Question updated successfully.",
    });
  } catch (error) {
    console.log("Error >>", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array() });
    }

    // Check if question exists
    const questionExists = await client.query(
      `SELECT * FROM questions WHERE question_id = $1 AND isDeleted = false`,
      [req.params.id]
    );

    if (questionExists.rows.length === 0) {
      return res.status(404).json({ message: "Question not found." });
    }

    // Delete options
    await client.query(
      `UPDATE options
      SET isDeleted = true
      WHERE question_id = $1;`,
      [req.params.id]
    );

    // Then delete the question
    await client.query(
      `UPDATE questions
      SET isDeleted = true
      WHERE question_id = $1;`,
      [req.params.id]
    );

    //Then delete the question response
    await client.query(
      `UPDATE user_responses SET isDeleted = true WHERE question_id = $1;`,
      [req.params.id]
    );

    res
      .status(200)
      .json({ success: true, message: "Question deleted successfully." });
  } catch (error) {
    console.log("Error >>", error);
    res.status(400).json({ success: false, message: error });
  }
};

const listQuestion = async (req, res) => {
  try {
    const result = await client.query(`
      SELECT q.question_id, q.question_text, o.option_id , o.option_text
      FROM questions q
      LEFT JOIN options o ON q.question_id = o.question_id AND o.isDeleted = false
      WHERE q.isDeleted = false
      ORDER BY q.question_id ASC
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
      success: true,
      message: "Questions listed successfully.",
      data: questionGroup,
    });
  } catch (error) {
    console.log("Error >>", error);
    res.status(400).json({ success: false, message: error });
  }
};

const submitResponse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array() });
    }

    const { questionId, userId, priority } = req.body;

    // Check if question exists
    const questionExists = await client.query(
      `SELECT * FROM questions WHERE question_id = $1 AND isDeleted = false`,
      [questionId]
    );

    if (questionExists.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found." });
    }

    for (const optionId of priority) {
      const optionExists = await client.query(
        `SELECT * FROM options WHERE option_id = $1 AND question_id = $2`,
        [optionId, questionId]
      );

      if (optionExists.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `OptionId dose not exist.`,
        });
      }
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
      success: true,
      message: "User response store Successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong." });
  }
};

const finalReport = async (req, res) => {
  try {
    // Fetch all questions and their options
    const questionsResult = await client.query(
      `
      SELECT q.question_id, string_agg(o.option_text, ', ') AS option_text, array_agg(o.option_id) AS option_ids
      FROM questions AS q
      LEFT JOIN options AS o ON q.question_id = o.question_id
      WHERE q.isDeleted = false AND o.isDeleted = false
      GROUP BY q.question_id;
      `
    );

    const questions = questionsResult.rows;

    const reports = [];

    // Iterate through each question
    for (const question of questions) {
      const questionId = question.question_id;
      const optionTexts = question.option_text.split(", ");
      const optionIds = question.option_ids.map((id) => parseInt(id)); // Convert option_ids to integers

      // Fetch responses for the current question
      const responsesResult = await client.query(
        `
        SELECT *
        FROM user_responses
        WHERE question_id = $1
        AND priority = 1 AND isDeleted = false;
        `,
        [questionId]
      );

      const responses = responsesResult.rows;

      // Total number of users who responded to this question
      const totalCount = responses.length;

      // Create a map to store the count of each option
      const optionCounts = {};

      // Calculate the count of each option
      responses.forEach((row) => {
        const optionId = row.option_id;
        optionCounts[optionId] = (optionCounts[optionId] || 0) + 1;
      });

      // Calculate percentage ratios for each option
      const optionPercentages = optionIds.map((optionId, index) => ({
        option_id: optionId,
        option_text: optionTexts[index],
        userCount: optionCounts[optionId] || 0,
        percentage:
          totalCount > 0
            ? ((optionCounts[optionId] || 0) / totalCount) * 100
            : 0,
      }));

      // Push report for the current question to the reports array
      reports.push({
        questionId: questionId,
        totalUserCount: totalCount,
        option_percentages: optionPercentages,
      });
    }

    res.status(200).json({
      success: true,
      message: "Reports listed successfully.",
      reports: reports,
    });
  } catch (error) {
    console.log("error >>", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export {
  createUser,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listQuestion,
  submitResponse,
  finalReport,
};
