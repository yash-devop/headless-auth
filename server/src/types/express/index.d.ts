import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { userId: string; email?: string }; // Add any other fields you decode
    }
  }
}
