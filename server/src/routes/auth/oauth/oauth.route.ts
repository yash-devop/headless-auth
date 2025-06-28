import {
  googleAuthHandler,
  initialiseGoogleAuth,
} from "@/controllers/oauth.controller";
import express from "express";

const router = express.Router();

router.get("/auth/google", initialiseGoogleAuth);
router.get("/auth/google/callback", googleAuthHandler);

export default router;
