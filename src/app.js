import helmet from "helmet";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import passport from "../config/passport.js";
import userRouter from "./routes/userRoutes.js";
import http from "http";
import { Server } from "socket.io";
import { connect } from "../config/db.js";
import { addNewUser, removeUser } from "./utils/socketManager.js";
import conversationRouter from "./routes/conversationRoutes.js";
import { generateToken } from "./utils/helpers.js";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.APP_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const allowedOrigins = [process.env.APP_URL, process.env.SERVICE_URL];

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
 res.send('<h1>HELLO WORLD</h1>');
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
  (req, res) => {
    const token = generateToken(req.user._id, { expiresIn: "1d" });
    res.redirect(`${redirectUri}/auth/callback?t=${token}`);
  }
);

app.get("/auth/facebook", passport.authenticate("facebook"));

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: redirectUri,
    session: false,
  }),
  (req, res) => {
    const token = generateToken(req.user._id, { expiresIn: "1d" });
    res.redirect(`${redirectUri}/auth/callback?t=${token}`);
  }
);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/conversations", conversationRouter);

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

    socket.on('typing', (data) => {
      io.emit(`typing.${data.conversationId}`, data);
    })

    socket.on('stopTyping', (data) => {
      io.emit(`stopTyping.${data.conversationId}`, data);
    })
  });

export { app, httpServer };
