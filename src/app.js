import helmet from "helmet";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "../config/passport.js";
import userRouter from "./routes/userRoutes.js";
import { success } from "./utils/httpResponse.js";
import { connect } from "../config/db.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors());
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

connect()

const redirectUri = process.env.REDIRECT_URI

app.get('/', (req, res) => {
  res.send(
    `
    <h1>Kurtd Daniel Bigtas owns this.</h1>
    `
  )

})

app.get("/hello-world", (req, res) => {
  success(res, { message: "Hello, world!" });
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: redirectUri }),
  (req, res) => {
    res.redirect('http://localhost:5090/api/v1/users/@me'); 
  }
);

app.use("/api/v1/users", userRouter);

export default app;
