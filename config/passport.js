import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../src/models/userModel.js";
import dotenv from "dotenv";

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

          if (!user) {
            user = await User.create({
              googleId: profile.id,
              email: profile.emails[0].value,
              username: profile.displayName,
              avatar: profile.photos[0].value,
              verification: undefined,
              emailVerifiedAt: Date.now()
            });
          } else {
            user.avatar = user.avatar ? user.avatar : profile.photos[0].value;
            user.googleId = profile.id;
            user.emailVerifiedAt = Date.now()
            user.verification = undefined
            await user.save();
          }
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${process.env.SERVICE_URL}/auth/facebook/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, name, username } = profile;
        let newUserUn;
        console.log(profile);
        if (!username) {
          newUserUn = displayName.split(" ")[0];
        }

        let user = await User.findOne({ facebookId: id });

        if (!user) {
          user = await User.create({
            facebookId: id,
            username: newUserUn,
          });
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
