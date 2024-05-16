import express from "express";
const router = express.Router();
import {
  createUser,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listQuestion,
  submitResponse,
  finalReport,
} from "../controller/userController.js";
import { body, param } from "express-validator";

router.post(
  "/createUser",
  [
    body("userName").notEmpty().withMessage("userName is require."),
    body("email")
      .notEmpty()
      .withMessage("Email is require.")
      .isEmail()
      .withMessage("Invalid Email."),
    body("password")
      .isLength({ min: 8, max: 16 })
      .withMessage("Password must be between 8 and 16 characters long.")
      .matches(/[A-Z]/)
      .withMessage("Password must contain at least one capital letter.")
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage("Password must contain at least one special character."),
  ],
  createUser
);

router.post(
  "/createQuestion",
  [
    body("question")
      .notEmpty()
      .withMessage("Question is require.")
      .isString()
      .withMessage("Question must be strings."),
    body("options")
      .isArray({ min: 2 })
      .withMessage("At least two options are required."),
    body("options.*").isString().withMessage("Options must be strings."),
  ],
  createQuestion
);

router.patch(
  "/updateQuestion/:id",
  [
    param("id")
      .notEmpty()
      .withMessage("Question ID is required.")
      .isNumeric()
      .withMessage("Question ID must be numeric."),
    body("question_text")
      .notEmpty()
      .withMessage("Question is required.")
      .isString()
      .withMessage("Question must be a string."),
    body("options")
      .isArray({ min: 2 })
      .withMessage("At least two options are required."),
  ],
  updateQuestion
);

router.delete(
  "/deleteQuestion/:id",
  [
    param("id")
      .notEmpty()
      .withMessage("Question ID is required.")
      .isNumeric()
      .withMessage("Question ID must be numeric."),
  ],
  deleteQuestion
);
router.get("/listQuestion", listQuestion);

router.post(
  "/submitResponse",
  [
    body("questionId")
      .notEmpty()
      .withMessage("Question ID is required.")
      .isNumeric()
      .withMessage("Question ID must be numeric."),
    body("userId")
      .notEmpty()
      .withMessage("User ID is required.")
      .isNumeric()
      .withMessage("User ID must be numeric."),
    body("priority.*").isNumeric().withMessage("Options must be numeric."),
  ],
  submitResponse
);

router.get("/finalReport", finalReport);

export default router;
