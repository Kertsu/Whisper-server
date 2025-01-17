import helmet from "helmet";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import passport from "../config/passport.js";
import http from "http";
import { Server } from "socket.io";
import { connect } from "../config/db.js";
import { addNewUser, removeUser } from "./utils/socketManager.js";
import { generateAndSaveRefreshToken, generateToken } from "./utils/helpers.js";
import {
  userRouter,
  conversationRouter,
  subscriptionRouter,
  reportRouter,
} from "./routes/index.routes.js";
import { keepAlive, refreshTokenCleanup } from "./jobs/cron.job.js";

dotenv.config();

keepAlive();
refreshTokenCleanup();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.APP_URL,
      "http://127.0.0.1:8080",
      "http://localhost:8080",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const allowedOrigins = [
  process.env.APP_URL,
  process.env.SERVICE_URL,
  "http://127.0.0.1:8080",
  "http://localhost:8080",
];

app.use((req, res, next) => {
  req.io = io;
  next();
});
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

app.use(passport.initialize());

connect();

const redirectUri = process.env.APP_URL;

app.get("/", (req, res) => {
  res.send(`<h1>Kurtd Daniel Bigtas owns this.</h1>`);
});

app.get("/hello-world", (req, res) => {
  res.send("<h1>HELLO WORLD</h1>");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: redirectUri,
    session: false,
  }),
  async (req, res) => {
    const accessToken = generateToken(req.user._id, { type: 'access' });
    const refreshToken = await generateAndSaveRefreshToken(req.user);
    res.redirect(`${redirectUri}/auth/callback?at=${accessToken}&rt=${refreshToken}`);
  }
);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/conversations", conversationRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/reports", reportRouter);

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    removeUser(socket.id);
  });

  socket.on("live", (data) => {
    addNewUser(data, socket.id);
  });

  socket.on("die", () => {
    removeUser(socket.id);
  });

  socket.on("typing", (data) => {
    io.emit(`typing.${data.conversationId}`, data);
  });

  socket.on("stopTyping", (data) => {
    io.emit(`stopTyping.${data.conversationId}`, data);
  });
});

export { app, httpServer };
