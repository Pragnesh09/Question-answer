import { client } from "../database/database.js";
import { validationResult } from "express-validator";

// Create a new user
const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((error) => error.msg),
      });
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
    res.status(400).json({ success: false, message: "Something went wrong." });
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
    res.status(400).json({ success: false, message: "Something went wrong." });
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

    const { rows } = await client.query(
      "SELECT array_agg(option_id) AS option_ids FROM options WHERE question_id = $1 AND isDeleted = false  ",
      [req.params.id]
    );

    const existingOptionIds = rows[0].option_ids || [];

    const invalidOptions = options.filter(
      (option) =>
        (option.option_id && !existingOptionIds.includes(option.option_id)) ||
        (option.option_id === 0 && !existingOptionIds.includes(0))
    );

    if (invalidOptions.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Option not found.",
      });
    }

    // Filter out undefined or null option_id values
    const filteredOptions = options.filter(
      (option) => option.option_id !== undefined && option.option_id !== null
    );

    // Constructing the SET clause
    const setClause = filteredOptions
      .map((option) => {
        return `
          WHEN option_id = ${option.option_id} THEN '${option.option_text}'`;
      })
      .join(" ");

    // Constructing the WHERE condition
    const validOptionIds = filteredOptions.map((option) => option.option_id);
    const whereCondition = `${validOptionIds}`;

    // Constructing the UPDATE query
    await client.query(`
      UPDATE options
      SET option_text = (CASE ${setClause} END)
      WHERE option_id IN (${whereCondition});
    `);

    // Insert new options
    const optionsToInsert = options.filter((option) => !option.option_id);

    if (optionsToInsert.length > 0) {
      const insertValues = optionsToInsert
        .map((option) => `('${option.option_text}', ${req.params.id})`)
        .join(", ");

      await client.query(
        `INSERT INTO options (option_text, question_id) VALUES ${insertValues}`
      );
    }

    // Mark options as deleted
    const optionsToDelete = existingOptionIds.filter(
      (optionId) => !options.some((option) => option.option_id === optionId)
    );

    if (optionsToDelete.length > 0) {
      const optionsToDeleteStr = optionsToDelete.join(", ");

      await client.query(
        `UPDATE options
            SET isDeleted = true
            WHERE option_id IN (${optionsToDeleteStr}) AND question_id = $1;`,
        [req.params.id]
      );

      await client.query(
        `UPDATE user_responses
            SET isDeleted = true
            WHERE option_id IN (${optionsToDeleteStr});
          `
      );
    }

    // Update question text
    await client.query(
      `UPDATE questions SET question_text = $1 WHERE question_id = $2`,
      [question_text, req.params.id]
    );

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
    res.status(400).json({ success: false, message: "Something went wrong." });
  }
};

const listQuestion = async (req, res) => {
  try {
    let { limit, page } = req.query;

    // Ensure limit and page are integers with default values
    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;

    const offset = (page - 1) * limit;

    // Fetch questions and their options with pagination
    const result = await client.query(
      `
      SELECT q.question_id, q.question_text, 
        COALESCE(
          json_agg(
            json_build_object('option_id', o.option_id, 'option_text', o.option_text)
            ORDER BY o.option_id
          ) FILTER (WHERE o.option_id IS NOT NULL), '[]'
        ) AS options
      FROM questions q
      LEFT JOIN options o ON q.question_id = o.question_id AND o.isDeleted = false
      WHERE q.isDeleted = false
      GROUP BY q.question_id
      ORDER BY q.question_id ASC
      LIMIT $1 OFFSET $2;
      `,
      [limit, offset]
    );

    res.status(200).json({
      success: true,
      message: "Questions listed successfully.",
      data: result.rows,
    });
  } catch (error) {
    console.log("Error >>", error);
    res.status(400).json({ success: false, message: "Something went wrong." });
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

    // Check if question exists
    const userExists = await client.query(
      `SELECT * FROM users WHERE user_id = $1`,
      [userId]
    );

    if (userExists.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Check if question exists
    const optionExist = await client.query(
      `SELECT option_id 
        FROM options 
        WHERE option_id IN (${priority.join(",")}) AND question_id = $1`,
      [questionId]
    );

    if (optionExist.rows.length !== priority.length) {
      return res
        .status(404)
        .json({ success: false, message: "Option not found." });
    }

    const priorityValuesString = priority
      .map(
        (optionId, index) =>
          `(${questionId}, ${optionId}, ${userId}, ${index + 1})`
      )
      .join(", ");

    await client.query(`
      INSERT INTO user_responses (question_id, option_id, user_id, priority)
      VALUES ${priorityValuesString};
    `);

    res.status(200).json({
      success: true,
      message: "Report submit Successfully.",
    });
  } catch (error) {
    console.log("error >>", error);
    res.status(400).json({ success: false, message: "Something went wrong." });
  }
};

const finalReport = async (req, res) => {
  try {
    // Fetch all questions and their options
    const questionsResult = await client.query(
      `
      SELECT q.question_id, q.question_text, string_agg(o.option_text, ', ') AS option_text, array_agg(o.option_id) AS option_ids
      FROM questions AS q
      LEFT JOIN options AS o ON q.question_id = o.question_id
      WHERE q.isDeleted = false AND o.isDeleted = false
      GROUP BY q.question_id, q.question_text;
      `
    );

    const questions = questionsResult.rows;

    // Group questions by question_text
    const groupedQuestions = questions.reduce((acc, question) => {
      if (!acc[question.question_text]) {
        acc[question.question_text] = [];
      }
      acc[question.question_text].push(question);
      return acc;
    }, {});

    // Fetch all responses for the questions
    const questionIds = questions.map((q) => q.question_id);
    const responsesResult = await client.query(
      `
      SELECT *
      FROM user_responses
      WHERE question_id = ANY($1::int[])
      AND priority = 1 AND isDeleted = false;
      `,
      [questionIds]
    );

    const responses = responsesResult.rows;

    const reports = [];

    // Process each group of questions with the same question_text
    for (const questionText in groupedQuestions) {
      const questionsGroup = groupedQuestions[questionText];

      // Combine options and responses for the group
      const combinedOptions = {};
      let combinedResponses = [];

      questionsGroup.forEach((question) => {
        const optionTexts = question.option_text.split(", ");
        question.option_ids.forEach((optionId, index) => {
          if (!combinedOptions[optionId]) {
            combinedOptions[optionId] = optionTexts[index];
          }
        });
        combinedResponses = combinedResponses.concat(
          responses.filter(
            (response) => response.question_id === question.question_id
          )
        );
      });

      // Total number of users who responded to this group of questions
      const totalCount = combinedResponses.length;

      // Create a map to store the count of each option
      const optionCounts = {};

      // Calculate the count of each option
      combinedResponses.forEach((response) => {
        const optionId = response.option_id;
        optionCounts[optionId] = (optionCounts[optionId] || 0) + 1;
      });

      // Calculate percentage ratios for each option
      const optionPercentages = Object.keys(combinedOptions).map(
        (optionId) => ({
          option_id: parseInt(optionId),
          option_text: combinedOptions[optionId],
          userCount: optionCounts[optionId] || 0,
          percentage:
            totalCount > 0
              ? ((optionCounts[optionId] || 0) / totalCount) * 100
              : 0,
        })
      );

      // Push report for the current group of questions to the reports array
      reports.push({
        questionText: questionText,
        totalUserCount: totalCount,
        option_percentages: optionPercentages,
      });
    }

    res.status(200).json({
      success: true,
      message: "Reports listed successfully.",
      Data: reports,
    });
  } catch (error) {
    console.log("error >>", error);
    res.status(400).json({ success: false, message: "Something went wrong." });
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
