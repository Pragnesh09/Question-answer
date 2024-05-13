import express from "express";
const router = express.Router();
import {
  createUser,
  createQuestion,
  createOption,
  storeResponse,
  finalReport,
} from "../controller/userController.js";

router.post("/createUser", createUser);
router.post("/createQuestion", createQuestion);
router.post("/createOption", createOption);
router.post("/storeResponse", storeResponse);
router.get("/finalReport", finalReport);

export default router;
