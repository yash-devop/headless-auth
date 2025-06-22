import express from "express";
import {
  register,
  sendVerificationEmail,
  verifyEmail,
} from "../../../controllers/auth.controller";
const router = express.Router();

router.post("/user/create", register);
router.post("/user/verify-email", verifyEmail);
router.post("/user/send-verification-email", sendVerificationEmail);

export default router;
