import { hashToken, verifyToken } from "@/lib/auth/jwt";
import { sendEmail } from "@/lib/email/email";
import { HeadlessAuthError } from "@/lib/errors";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";
import {
  DOMAIN,
  JWT_EXPIRY_MINUTES,
  SALT_ROUNDS,
  SECRET_KEY,
} from "../../constants/constants";
import { User } from "../../types/types";
import { generateUsername } from "unique-username-generator";
import { z } from "zod";
const prisma = new PrismaClient();

interface ServiceResponse {
  message: string;
  code: number;
  success?: boolean;
}

export const authService = {
  registerUser: async ({ email, password }: User): Promise<ServiceResponse> => {
    const alreadyRegisteredUser = await prisma.user.findFirst({
      where: { email },
    });

    console.log("alreadyRegisteredUser", alreadyRegisteredUser);

    if (alreadyRegisteredUser) {
      if (!alreadyRegisteredUser.emailVerified) {
        throw new HeadlessAuthError({
          message: "Your email is not verified. Please verify your email.",
          code: 401,
        });
      }

      return {
        message: "You already have an account. Please log in.",
        code: 200,
        success: true,
      };
    }

    const hashedPassword = await hash(password, SALT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        emailVerified: null,
      },
    });
    console.log("newUser", newUser);

    const emailToken = hashToken({ email, userId: newUser.id }, SECRET_KEY, {
      expiresIn: JWT_EXPIRY_MINUTES,
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
              `,
    });

    return {
      message: `Verification email sent to ${email}`,
      success: true,
      code: 200,
    };
  },
  sendVerificationEmail: async ({
    email,
    userId,
  }: {
    email: string;
    userId: string;
  }): Promise<ServiceResponse> => {
    console.log("sendVerificationEmail", { email, userId });
    const emailToken = hashToken(
      {
        email,
        userId,
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
        html: `<p>This is your Verification Email </p> <button><a href="${redirectURL}">Verify email<a></button>`,
      });

      return {
        message: `Email is sent to ${email}`,
        success: true,
        code: 200,
      };
    } catch (error) {
      const errorMsg = (error as Error).message;
      throw new HeadlessAuthError({
        code: 500,
        message: errorMsg,
      });
    }
  },
  verifyEmail: async ({
    token,
    userId,
  }: {
    token: string;
    userId: string;
  }): Promise<ServiceResponse> => {
    z.string().cuid("userId is invalid").parse(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HeadlessAuthError({
        code: 404,
        message: "User not found for verification.",
      });
    }
    if (user.emailVerified) {
      return {
        message: "User is already verified.",
        success: true,
        code: 403,
      };
    }
    // Token validation block
    let email: string;
    let decodedUserId: string;

    try {
      const payload: any = verifyToken(token, SECRET_KEY);
      email = payload.email;
      decodedUserId = payload.userId;
    } catch (err) {
      throw new HeadlessAuthError({
        code: 500,
        message: "Token is expired or invalid!",
      });
    }

    // User ID match check
    if (decodedUserId !== userId) {
      return {
        message: "Token userId does not match request userId.",
        success: false,
        code: 406,
      };
    }

    // Update emailVerified
    const updatedUser = await prisma.user.update({
      data: { emailVerified: new Date() },
      where: { email, id: userId },
    });

    if (updatedUser.emailVerified) {
      const appName = generateUsername();
      console.log("appName", appName);

      const app = await prisma.app.create({
        data: {
          appName,
          userId: decodedUserId || userId,
        },
      });
    }

    return {
      message: "User email verification done!",
      success: true,
      code: 200,
    };
  },
};
