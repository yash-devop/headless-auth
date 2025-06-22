import { SignUpSchema } from "@/lib/zod/schema";
import { z } from "zod";

type User = z.infer<typeof SignUpSchema>;

export { User };
