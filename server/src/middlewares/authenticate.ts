import { SECRET_KEY } from "@/constants/constants";
import { verifyToken } from "@/lib/auth/jwt";
import { HeadlessAuthError } from "@/lib/errors";
import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

const prisma = new PrismaClient();
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.auth_token;

  if (!token) {
    throw new HeadlessAuthError({
      message: "Unauthorized",
      code: 401,
    });
  }
  const decoded: any = verifyToken(token, SECRET_KEY);
  const session = await prisma.session.findFirst({
    where: {
      userId: decoded?.userId,
      expires: { gte: new Date() },
    },
  });

  if (!session) {
    throw new HeadlessAuthError({
      message: "Session expired",
      code: 498,
    });
  }

  req.user = decoded;
  next();

  console.log("the end");
};
