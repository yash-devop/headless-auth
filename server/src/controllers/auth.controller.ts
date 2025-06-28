import { authService } from "@/lib/services/auth.service";
import { SignUpSchema } from "@/lib/zod/schema";
import { Request, Response } from "express";
import { User } from "../types/types";

const register = async (req: Request, res: Response) => {
  const user: User = SignUpSchema.parse(req.body);
  const { password, email } = user;
  const registeredUser = await authService.registerUser({ email, password });

  res.json(registeredUser);
  return;
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

  res.json(emailForVerification);
  return;
};
const verifyEmail = async (req: Request, res: Response) => {
  const { token, userId } = req.query as {
    token: string;
    userId: string;
  };

  if (!token) {
    res.status(400).json({
      message: "Verification token not found!",
      success: false,
    });
    return;
  }

  const response = await authService.verifyEmail({ token, userId });

  res.json(response);
  return;
};

export { register, sendVerificationEmail, verifyEmail };
