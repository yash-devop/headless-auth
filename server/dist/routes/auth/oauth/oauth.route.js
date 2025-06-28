// src/lib/services/oauth.service.ts
import axios from "axios";

// src/lib/env.ts
import { z } from "zod";
var envSchema = z.object({
  ENV: z.union([
    z.literal("development"),
    z.literal("testing"),
    z.literal("production")
  ]).default("development"),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URL: z.string(),
  GOOGLE_USER_PROFILE_URL: z.string(),
  GOOGLE_ACCESS_TOKEN_URL: z.string().url()
});
var env = envSchema.parse(process.env);

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

// src/lib/services/oauth.service.ts
var {
  GOOGLE_ACCESS_TOKEN_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URL,
  GOOGLE_USER_PROFILE_URL
} = env;
var OauthService = {
  google: {
    getAuthorizationUrl: () => {
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URL}&response_type=code&scope=profile email`;
      return url;
    },
    handleCallback: async (code, redirectUrl) => {
      try {
        const res = await axios.post(
          GOOGLE_ACCESS_TOKEN_URL,
          {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: GOOGLE_REDIRECT_URL,
            grant_type: "authorization_code"
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          }
        );
        const finalData = res.data;
        const { access_token, id_token, redirectUri } = finalData;
        console.log("finalData", finalData);
        const { data: profile, status } = await axios.get(
          GOOGLE_USER_PROFILE_URL,
          {
            headers: { Authorization: `Bearer ${access_token}` }
          }
        );
        return {
          id_token,
          profile,
          access_token,
          redirectUri,
          status,
          success: true
        };
      } catch (error) {
        const errorMsg = error.message;
        throw new HeadlessAuthError({
          code: 500,
          message: errorMsg
        });
      }
    }
  }
};

// src/controllers/oauth.controller.ts
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient();
var initialiseGoogleAuth = async (req, res) => {
  const url = OauthService.google.getAuthorizationUrl();
  res.redirect(url);
};
var googleAuthHandler = async (req, res) => {
  const { code } = req.query;
  const redirectUrl = "/";
  try {
    const { access_token, id_token, profile, redirectUri, status } = await OauthService.google.handleCallback(code, redirectUrl);
    const user = await prisma.user.create({
      data: {
        emailVerified: profile.verified_email ? /* @__PURE__ */ new Date() : null,
        email: profile.email,
        image: profile.picture,
        name: profile.given_name || profile.family_name
      }
    });
    if (user.id) {
      await prisma.account.create({
        data: {
          provider: "google",
          providerAccountId: profile.id,
          userId: user.id,
          type: "oauth"
        }
      });
    }
    res.redirect(redirectUri);
    return;
  } catch (error) {
    return res.redirect(500, "/login?error=OAuthFailed");
  }
};

// src/routes/auth/oauth/oauth.route.ts
import express from "express";
var router = express.Router();
router.get("/auth/google", initialiseGoogleAuth);
router.get("/auth/google/callback", googleAuthHandler);
var oauth_route_default = router;
export {
  oauth_route_default as default
};
