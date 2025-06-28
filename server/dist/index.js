// src/index.ts
import express3 from "express";

// src/routes/auth/credentials/credentials.route.ts
import express from "express";

// src/lib/auth/jwt.ts
import jwt from "jsonwebtoken";
var hashToken = (data, secretKey, signOptions) => {
  return jwt.sign(data, secretKey, signOptions);
};
var verifyToken = (token, secretKey, verifyOptions) => {
  return jwt.verify(token, secretKey, verifyOptions);
};

// src/lib/email/email.ts
import { createTransport } from "nodemailer";
var sendEmail = async (options, code) => {
  createTransport({
    host: "smtp-mail.outlook.com",
    service: "gmail",
    auth: {
      user: "kamble1234meena@gmail.com",
      // use same mail and app password associated to it .
      pass: "ntdrqywudefxqqfa"
      // setup this google app password by going to the manage google aaccount
    }
  }).sendMail(options);
};

// src/lib/errors.ts
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
var HeadlessAuthError = class extends Error {
  constructor({ code, message }) {
    super(message);
    this.code = code;
    this.message = message;
  }
};
var ErrorHandler = (err, req, res, next) => {
  console.log("handler running");
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        type: "Invalid request data",
        code: err.name,
        message: JSON.parse(err.message) || err.errors
      },
      success: false
    });
    return;
  }
  if (err instanceof HeadlessAuthError) {
    res.status(err.code).json({
      error: {
        type: err.name,
        code: err.code,
        message: err.message
      },
      success: false
    });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      console.error(err.message);
      res.status(422).json({
        error: {
          type: err.name || "Unique constraint failed",
          code: err.code,
          message: err.message
        },
        success: false
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(422).json({
        error: {
          type: "not_found",
          code: 404,
          message: err?.meta?.cause || err?.message || "The requested resource was not found."
        },
        success: false
      });
      return;
    }
  }
  res.status(500).json({
    error: {
      type: "Internal Server Error",
      code: 500,
      message: JSON.parse(err.message) || "Something went wrong"
    },
    success: false
  });
  return;
};

// src/lib/services/auth.service.ts
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

// src/constants/constants.ts
var SALT_ROUNDS = 10;
var SECRET_KEY = "yashsigner";
var JWT_EXPIRY_MINUTES = "15MINUTES";
var DOMAIN = "http://localhost:5173";

// src/lib/services/auth.service.ts
import { generateUsername } from "unique-username-generator";
import { z } from "zod";
var prisma = new PrismaClient();
var authService = {
  registerUser: async ({ email, password }) => {
    const alreadyRegisteredUser = await prisma.user.findFirst({
      where: { email }
    });
    console.log("alreadyRegisteredUser", alreadyRegisteredUser);
    if (alreadyRegisteredUser) {
      if (!alreadyRegisteredUser.emailVerified) {
        throw new HeadlessAuthError({
          message: "Your email is not verified. Please verify your email.",
          code: 401
        });
      }
      return {
        message: "You already have an account. Please log in.",
        code: 200,
        success: true
      };
    }
    const hashedPassword = await hash(password, SALT_ROUNDS);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        emailVerified: null
      }
    });
    await prisma.account.create({
      data: {
        provider: "credentials",
        providerAccountId: email,
        userId: newUser.id,
        type: "credentials"
      }
    });
    console.log("newUser", newUser);
    const emailToken = hashToken({ email, userId: newUser.id }, SECRET_KEY, {
      expiresIn: JWT_EXPIRY_MINUTES
    });
    const redirectURL = `${DOMAIN}/verify-email?token=${emailToken}`;
    await sendEmail({
      from: "kamble1234meena@gmail.com",
      to: email,
      subject: "Verify Your Email",
      html: `
                <p>Please verify your email:</p>
                <a href="${redirectURL}">
                  <button>Verify Email</button>
                </a>
              `
    });
    return {
      message: `Verification email sent to ${email}`,
      success: true,
      code: 200
    };
  },
  sendVerificationEmail: async ({
    email,
    userId
  }) => {
    console.log("sendVerificationEmail", { email, userId });
    const emailToken = hashToken(
      {
        email,
        userId
      },
      SECRET_KEY,
      { expiresIn: JWT_EXPIRY_MINUTES }
    );
    try {
      const redirectURL = `${DOMAIN}/verify-email?token=${emailToken}&userId=${userId}`;
      await sendEmail({
        from: "kamble1234meena@gmail.com",
        subject: "Verify Your Email",
        to: email,
        html: `<p>This is your Verification Email </p> <button><a href="${redirectURL}">Verify email<a></button>`
      });
      return {
        message: `Email is sent to ${email}`,
        success: true,
        code: 200
      };
    } catch (error) {
      const errorMsg = error.message;
      throw new HeadlessAuthError({
        code: 500,
        message: errorMsg
      });
    }
  },
  verifyEmail: async ({
    token,
    userId
  }) => {
    z.string().cuid("userId is invalid").parse(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new HeadlessAuthError({
        code: 404,
        message: "User not found for verification."
      });
    }
    if (user.emailVerified) {
      return {
        message: "User is already verified.",
        success: true,
        code: 403
      };
    }
    let email;
    let decodedUserId;
    try {
      const payload = verifyToken(token, SECRET_KEY);
      email = payload.email;
      decodedUserId = payload.userId;
    } catch (err) {
      throw new HeadlessAuthError({
        code: 500,
        message: "Token is expired or invalid!"
      });
    }
    if (decodedUserId !== userId) {
      return {
        message: "Token userId does not match request userId.",
        success: false,
        code: 406
      };
    }
    const updatedUser = await prisma.user.update({
      data: { emailVerified: /* @__PURE__ */ new Date() },
      where: { id: userId }
    });
    if (updatedUser.emailVerified) {
      const appName = generateUsername();
      console.log("appName", appName);
      const app2 = await prisma.app.create({
        data: {
          appName,
          userId: decodedUserId || userId
        }
      });
    }
    return {
      message: "User email verification done!",
      success: true,
      code: 200
    };
  }
};

// src/lib/zod/schema.ts
import { z as z2 } from "zod";
var SignUpSchema = z2.object({
  email: z2.string({ message: "Email is required" }).email("Invalid Email").min(1).transform((email) => email.toLowerCase()),
  password: z2.string({ message: "Password is required" }).min(8, "Password must be of 8 characters").max(30, "Password must be less than 30 characters")
});

// src/controllers/auth.controller.ts
var register = async (req, res) => {
  const user = SignUpSchema.parse(req.body);
  const { password, email } = user;
  const registeredUser = await authService.registerUser({ email, password });
  res.json(registeredUser);
  return;
};
var sendVerificationEmail = async (req, res) => {
  const { email, userId } = req.query;
  const emailForVerification = await authService.sendVerificationEmail({
    email,
    userId
  });
  res.json(emailForVerification);
  return;
};
var verifyEmail = async (req, res) => {
  const { token, userId } = req.query;
  if (!token) {
    res.status(400).json({
      message: "Verification token not found!",
      success: false
    });
    return;
  }
  const response = await authService.verifyEmail({ token, userId });
  res.json(response);
  return;
};

// src/routes/auth/credentials/credentials.route.ts
var router = express.Router();
router.post("/user/create", register);
router.post("/user/verify-email", verifyEmail);
router.post("/user/send-verification-email", sendVerificationEmail);
var credentials_route_default = router;

// src/lib/services/oauth.service.ts
import axios from "axios";

// src/lib/env.ts
import { z as z3 } from "zod";
var envSchema = z3.object({
  ENV: z3.union([
    z3.literal("development"),
    z3.literal("testing"),
    z3.literal("production")
  ]).default("development"),
  GOOGLE_CLIENT_ID: z3.string(),
  GOOGLE_CLIENT_SECRET: z3.string(),
  GOOGLE_REDIRECT_URL: z3.string(),
  GOOGLE_USER_PROFILE_URL: z3.string(),
  GOOGLE_ACCESS_TOKEN_URL: z3.string().url()
});
var env = envSchema.parse(process.env);

// src/lib/services/oauth.service.ts
var {
  GOOGLE_ACCESS_TOKEN_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URL,
  GOOGLE_USER_PROFILE_URL
} = env;
var OauthService = {
  google: {
    getAuthorizationUrl: () => {
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URL}&response_type=code&scope=profile email`;
      return url;
    },
    handleCallback: async (code, redirectUrl) => {
      try {
        const res = await axios.post(
          GOOGLE_ACCESS_TOKEN_URL,
          {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: GOOGLE_REDIRECT_URL,
            grant_type: "authorization_code"
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          }
        );
        const finalData = res.data;
        const { access_token, id_token, redirectUri } = finalData;
        console.log("finalData", finalData);
        const { data: profile, status } = await axios.get(
          GOOGLE_USER_PROFILE_URL,
          {
            headers: { Authorization: `Bearer ${access_token}` }
          }
        );
        return {
          id_token,
          profile,
          access_token,
          redirectUri,
          status,
          success: true
        };
      } catch (error) {
        const errorMsg = error.message;
        throw new HeadlessAuthError({
          code: 500,
          message: errorMsg
        });
      }
    }
  }
};

// src/controllers/oauth.controller.ts
import { PrismaClient as PrismaClient2 } from "@prisma/client";
var prisma2 = new PrismaClient2();
var initialiseGoogleAuth = async (req, res) => {
  const url = OauthService.google.getAuthorizationUrl();
  res.redirect(url);
};
var googleAuthHandler = async (req, res) => {
  const { code } = req.query;
  const redirectUrl = "/";
  try {
    const { access_token, id_token, profile, redirectUri, status } = await OauthService.google.handleCallback(code, redirectUrl);
    const user = await prisma2.user.create({
      data: {
        emailVerified: profile.verified_email ? /* @__PURE__ */ new Date() : null,
        email: profile.email,
        image: profile.picture,
        name: profile.given_name || profile.family_name
      }
    });
    if (user.id) {
      await prisma2.account.create({
        data: {
          provider: "google",
          providerAccountId: profile.id,
          userId: user.id,
          type: "oauth"
        }
      });
    }
    res.redirect(redirectUri);
    return;
  } catch (error) {
    return res.redirect(500, "/login?error=OAuthFailed");
  }
};

// src/routes/auth/oauth/oauth.route.ts
import express2 from "express";
var router2 = express2.Router();
router2.get("/auth/google", initialiseGoogleAuth);
router2.get("/auth/google/callback", googleAuthHandler);
var oauth_route_default = router2;

// src/index.ts
var app = express3();
var PORT = 8e3;
app.use(express3.json());
app.use("/api/v1", credentials_route_default, oauth_route_default);
app.use(ErrorHandler);
app.listen(PORT, () => {
  console.log("Server started successfully !");
});
app.listen("9000", () => {
  console.log("start the server");
});
