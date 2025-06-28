import express from "express";
import {
  register,
  sendVerificationEmail,
  verifyEmail,
} from "../../../controllers/auth.controller";
import { signInWithCredentials } from "@/controllers/oauth.controller";
const router = express.Router();

router.post("/user/signup", register);
router.post("/user/signin", signInWithCredentials);
router.post("/user/verify-email", verifyEmail);
router.post("/user/send-verification-email", sendVerificationEmail);

export default router;
