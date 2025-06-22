import { hashToken, verifyToken } from "@/lib/auth/jwt";
import { sendEmail } from "@/lib/email/email";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";
import { Request, Response } from "express";
import { User } from "../types/types";
import {
  DOMAIN,
  JWT_EXPIRY_MINUTES,
  SECRET_KEY,
  SALT_ROUNDS,
} from "../constants/constants";
import { HeadlessAuthError } from "@/lib/errors";
import { SignUpSchema } from "@/lib/zod/schema";
import { generateFromEmail, generateUsername } from "unique-username-generator";
import { z } from "zod";
import { authService } from "@/lib/services/auth.service";
const prisma = new PrismaClient();

const register = async (req: Request, res: Response) => {
  const user: User = SignUpSchema.parse(req.body);
  const { password, email } = user;
  const registeredUser = await authService.registerUser({ email, password });

  return res.json(registeredUser);

  // const alreadyRegisteredUser = await prisma.user.findFirst({
  //   where: { email },
  // });

  // console.log("alreadyRegisteredUser", alreadyRegisteredUser);

  // if (alreadyRegisteredUser) {
  //   if (!alreadyRegisteredUser.emailVerified) {
  //     throw new HeadlessAuthError({
  //       message: "Your email is not verified. Please verify your email.",
  //       code: 401,
  //     });
  //   }

  //   res.status(200).json({
  //     message: "You already have an account. Please log in.",
  //     success: true,
  //   });
  //   return;
  // }

  // try {
  //   const hashedPassword = await hash(password, SALT_ROUNDS);

  //   const newUser = await prisma.user.create({
  //     data: {
  //       email,
  //       password: hashedPassword,
  //       emailVerified: null, // optional, depends on your schema
  //     },
  //   });

  //   const emailToken = hashToken({ email, userId: newUser.id }, SECRET_KEY, {
  //     expiresIn: JWT_EXPIRY_MINUTES,
  //   });

  //   const redirectURL = `${DOMAIN}/verify-email?token=${emailToken}`;

  //   await sendEmail({
  //     from: "kamble1234meena@gmail.com",
  //     to: email,
  //     subject: "Verify Your Email",
  //     html: `
  //       <p>Please verify your email:</p>
  //       <a href="${redirectURL}">
  //         <button>Verify Email</button>
  //       </a>
  //     `,
  //   });

  //   res.status(200).json({
  //     message: `Verification email sent to ${email}`,
  //     success: true,
  //   });
  //   return;
  // } catch (error) {
  //   res.status(500).json({
  //     message: "Registration failed",
  //     error: (error as Error).message,
  //     success: false,
  //   });
  //   return;
  // }
};

const sendVerificationEmail = async (req: Request, res: Response) => {
  const { email, userId } = req.query as {
    email: string;
    userId: string;
  };

  const emailForVerification = await authService.sendVerificationEmail({
    email,
    userId,
  });

  return res.json(emailForVerification);
  // console.log("sendVerificationEmail", { email, userId });
  // const emailToken = hashToken(
  //   {
  //     email,
  //     userId,
  //   },
  //   SECRET_KEY,
  //   { expiresIn: JWT_EXPIRY_MINUTES }
  // );
  // try {
  //   const redirectURL = `${DOMAIN}/verify-email?token=${emailToken}&userId=${userId}`;
  //   await sendEmail({
  //     from: "kamble1234meena@gmail.com",
  //     subject: "Verify Your Email",
  //     to: email,
  //     html: `<p>This is your Verification Email </p> <button><a href="${redirectURL}">Verify email<a></button>`,
  //   });

  //   res.status(200).json({
  //     message: `Email is sent to ${email}`,
  //     success: true,
  //   });
  //   return;
  // } catch (error) {
  //   const errorMsg = (error as Error).message;
  //   res.status(500).json({
  //     message: "Something went wrong with email verification.",
  //     error: errorMsg,
  //     success: false,
  //   });
  //   return;
  // }
};
const verifyEmail = async (req: Request, res: Response) => {
  const { token, userId } = req.query as {
    token: string;
    userId: string;
  };

  if (!token) {
    return res.status(400).json({
      message: "Verification token not found!",
      success: false,
    });
  }

  const response = await authService.verifyEmail({ token, userId });

  return res.json(response);
  // z.string().cuid("userId is invalid").parse(userId);

  // const user = await prisma.user.findUnique({
  //   where: { id: userId },
  // });

  // if (!user) {
  //   throw new HeadlessAuthError({
  //     code: 404,
  //     message: "User not found for verification.",
  //   });
  // }
  // if (user.emailVerified) {
  //   return res.status(200).json({
  //     message: "User is already verified.",
  //     success: true,
  //   });
  // }
  // // Token validation block
  // let email: string;
  // let decodedUserId: string;

  // try {
  //   const payload: any = verifyToken(token, SECRET_KEY);
  //   email = payload.email;
  //   decodedUserId = payload.userId;
  // } catch (err) {
  //   return res.status(419).json({
  //     message: "Token is expired or invalid!",
  //     success: false,
  //     error: (err as Error).message,
  //   });
  // }

  // // User ID match check
  // if (decodedUserId !== userId) {
  //   return res.status(400).json({
  //     message: "Token userId does not match request userId.",
  //     success: false,
  //   });
  // }

  // // Update emailVerified
  // const updatedUser = await prisma.user.update({
  //   data: { emailVerified: new Date() },
  //   where: { email, id: userId },
  // });

  // if (updatedUser.emailVerified) {
  //   const appName = generateUsername();
  //   console.log("appName", appName);

  //   const app = await prisma.app.create({
  //     data: {
  //       appName,
  //       userId: decodedUserId || userId,
  //     },
  //   });
  // }

  // return res.status(200).json({
  //   message: "User email verification done!",
  //   success: true,
  // });
};

export { register, sendVerificationEmail, verifyEmail };
