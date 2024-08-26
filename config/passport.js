import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../src/models/user.model.js";
import dotenv from "dotenv";
import { generateRandomUsername } from "../src/utils/helpers.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVICE_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.findOne({ email: profile.emails[0].value });
          // const generatedUsername = await generateRandomUsername();
          const username = await generateRandomUsername(7);
          if (!user) {
            user = await User.create({
              googleId: profile.id,
              email: profile.emails[0].value,
              username,
              verification: undefined,
              emailVerifiedAt: Date.now(),
            });
          } else {
            user.googleId = profile.id;
            user.emailVerifiedAt = Date.now();
            user.verification = undefined;
            await user.save();
          }
        }

        if (user.status === "suspended") {
          return done('Your account is suspended. If you think this is a mistake, please contact the developer kurtddbigtas@gmail.com', null)
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
