import express from "express";
import router from "./router/userRouter.js";
import dotenv from "dotenv";
import { connectDatabase } from "./database/database.js";

const app = express();
app.use(express.json());
dotenv.config();
connectDatabase();

app.use("/", router);

const port = 3000;
app.listen(port, () => {
  console.log(`Connection is live at port no: ${port}`);
});
