import { z } from "zod";

export const SignUpSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .email("Invalid Email")
    .min(1)
    .transform((email) => email.toLowerCase()),
  password: z
    .string({ message: "Password is required" })
    .min(8, "Password must be of 8 characters")
    .max(30, "Password must be less than 30 characters"),
});
