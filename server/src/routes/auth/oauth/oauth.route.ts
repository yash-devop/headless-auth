import {
  googleAuthHandler,
  initialiseGoogleAuth,
} from "@/controllers/oauth.controller";
import { authenticate } from "@/middlewares/authenticate";
import express from "express";

const router = express.Router();

router.get("/auth/google", initialiseGoogleAuth);
router.get("/auth/google/callback", googleAuthHandler);
router.get("/me", authenticate, async (req, res) => {
  const user = req.user;
  res.json({ user });
});

export default router;
