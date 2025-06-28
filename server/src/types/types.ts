import { AuthSchema } from "@/lib/zod/schema";
import { z } from "zod";

type User = z.infer<typeof AuthSchema>;

type GoogleUserProfile = {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
};

type OAuth = {
  access_token: string;
  id_token: string;
  profile: GoogleUserProfile;
  redirectUri: string;
  status: number;
  success: true;
  scope?: string;
  expiresIn?: string;
};

export { User, OAuth };
