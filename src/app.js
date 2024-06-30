import helmet from "helmet";
import express from "express";
import cors from "cors";
import userRouter from "./routes/userRoutes.js";
import { success } from "./utils/httpResponse.js";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors());

app.get("hello-world", (req, res) => {
  success(res, { message: "Hello, world!" });
});

app.use("/api/v1/users", userRouter);

export default app;
