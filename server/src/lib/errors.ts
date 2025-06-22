import { Prisma } from "@prisma/client";
import { PrismaClientInitializationError } from "@prisma/client/runtime/library";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HeadlessAuthError extends Error {
  public code: number;
  public message: string;
  constructor({ code, message }: { code: number; message: string }) {
    super(message);
    this.code = code;
    this.message = message;
  }
}

export const ErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("handler running");
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        type: "Invalid request data",
        code: err.name,
        message: JSON.parse(err.message) || err.errors,
      },
      success: false,
    });
    return;
  }

  if (err instanceof HeadlessAuthError) {
    res.status(err.code).json({
      error: {
        type: err.name,
        code: err.code,
        message: err.message,
      },
      success: false,
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
          message: err.message,
        },
        success: false,
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(422).json({
        error: {
          type: "not_found",
          code: 404,
          message:
            err?.meta?.cause ||
            err?.message ||
            "The requested resource was not found.",
        },
        success: false,
      });
      return;
    }
  }
  res.status(500).json({
    error: {
      type: "Internal Server Error",
      code: 500,
      message: JSON.parse(err.message) || "Something went wrong",
    },
    success: false,
  });

  return;
};
