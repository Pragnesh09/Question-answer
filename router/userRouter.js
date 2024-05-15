import express from "express";
const router = express.Router();
import {
  createUser,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listQuestion,
  storeResponse,
  finalReport,
} from "../controller/userController.js";

router.post("/createUser", createUser);

router.post("/createQuestion", createQuestion);
router.patch("/updateQuestion/:id", updateQuestion);
router.delete("/deleteQuestion/:id", deleteQuestion);
router.get("/listQuestion", listQuestion);

router.post("/storeResponse", storeResponse);
router.get("/finalReport/:id", finalReport);

export default router;
