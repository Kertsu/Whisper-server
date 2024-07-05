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
import MongoStore from "connect-mongo";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

const allowedOrigins = [
  process.env.APP_URL, process.env.SERVICE_URL
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

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'none', 
      maxAge: 24 * 60 * 60 * 1000, 
      // domain: '.onrender.com' 
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions'
    })
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
    console.log('Authenticated user:', req.user);
    res.redirect(`${process.env.APP_URL}/whisper/whisps`);
  }
);

app.get("/auth/facebook", passport.authenticate("facebook"));

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: redirectUri }),
  (req, res) => {
    console.log('Authenticated user:', req.user);
    res.redirect(`${process.env.APP_URL}/whisper/whisps`);
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
});

export { app, httpServer };
