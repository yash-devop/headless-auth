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
export {
  ErrorHandler,
  HeadlessAuthError
};
