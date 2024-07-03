import helmet from "helmet";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "../config/passport.js";
import userRouter from "./routes/userRoutes.js";
import http from "http";
import { Server } from "socket.io";
import { success } from "./utils/httpResponse.js";
import { connect } from "../config/db.js";
import { addNewUser, removeUser } from "./utils/socketManager.js";
import conversationRouter from "./routes/conversationRoutes.js";
import { attachIo } from "./middlewares/authMiddleware.js";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:5090",
];

app.use(helmet());
app.use(express.json());
app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: false
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

connect();

const redirectUri = process.env.REDIRECT_URI;

app.get("/", (req, res) => {
  res.send(`<h1>Kurtd Daniel Bigtas owns this.</h1>`);
});

app.get("/hello-world", (req, res) => {
  success(res, { message: "Hello, world!" });
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: redirectUri }),
  (req, res) => {
    res.redirect("http://localhost:4200/whisper/whisps");
  }
);

app.get("/auth/facebook", passport.authenticate("facebook"));

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: redirectUri }),
  (req, res) => {
    res.redirect("http://localhost:4200/whisper/whisps");
  }
);

app.use("/api/v1/users", attachIo(io), userRouter);
app.use("/api/v1/conversations", attachIo(io), conversationRouter);

io.on("connection", (socket) => {
  console.log(socket.id);
  socket.on("disconnect", () => {
    removeUser(socket.id);
  });

  socket.on("live", (data) => {
    addNewUser(data, socket.id);
  });

  socket.on("die", () => {
    removeUser(socket.id);
  });
});

export { app, httpServer };
