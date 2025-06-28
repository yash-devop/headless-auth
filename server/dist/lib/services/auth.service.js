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
      const app = await prisma.app.create({
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
export {
  authService
};
