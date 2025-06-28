import { SECRET_KEY } from "@/constants/constants";
import { hashToken, verifyToken } from "@/lib/auth/jwt";
import { HeadlessAuthError } from "@/lib/errors";
import { OauthService } from "@/lib/services/oauth.service";
import { AuthSchema } from "@/lib/zod/schema";
import { User } from "@/types/types";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcrypt";
import { Request, Response } from "express";

const prisma = new PrismaClient();

const initialiseGoogleAuth = async (req: Request, res: Response) => {
  const url = OauthService.google.getAuthorizationUrl();
  res.redirect(url);
};
const googleAuthHandler = async (req: Request, res: Response) => {
  const { code } = req.query;
  const redirectUrl = "/";
  try {
    const { access_token, id_token, profile, redirectUri, status } =
      await OauthService.google.handleCallback(code as string, redirectUrl);

    const existingUser = await prisma.user.findUnique({
      where: {
        email: profile.email,
      },
    });

    if (!existingUser) {
      const user = await prisma.user.create({
        data: {
          emailVerified: profile.verified_email ? new Date() : null,
          email: profile.email,
          image: profile.picture,
          name: profile.given_name || profile.family_name,
        },
      });
      await prisma.account.create({
        data: {
          provider: "google",
          providerAccountId: profile.id,
          userId: user.id,
          type: "oauth",
        },
      });
      res.json({
        message: "User created successfully.",
        success: true,
        code: 200,
      });
      return;
    }

    await prisma.user.update({
      data: {
        image: profile.picture,
        name: profile.given_name || profile.family_name,
      },
      where: {
        email: profile.email,
      },
    });
    //   /**
    //    * TODOS:
    //    * 1) after signup with google , check if there is an existing user or not , if yes then update that user. and if not then create a new user.
    //    * 2) handle the error redirection correctly after the above...
    //    * 3) idk but check if any other table should be created or updated !
    //    * 4) once signup , additionally you can also automatically SIGNIN the user. ( important )
    //    * 4.a) user gets redirected to another route ( but only in case of signup ) and then that route will just login the user.
    //    * 4.b) or simply in this file only , add the login logic. ( one thing we can do is just move the login logic in service and then we can reuse the logic SHEESHH ! )
    //    * 6) once all done , your google and credential auth flow is completed.
    //    */
    // }
    res.redirect(redirectUri); // redirect to home
    return;
  } catch (error) {
    return res.redirect(500, "/login?error=OAuthFailed");
  }
};

const signInWithCredentials = async (req: Request, res: Response) => {
  // credentials

  const { email, password }: User = AuthSchema.parse(req.body);

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!existingUser) {
    throw new HeadlessAuthError({
      code: 400,
      message: "User not found. Please signup.",
    });
  }

  if (!existingUser.password) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }
  // session and jwt manageament.

  const valid = await compare(password, existingUser.password);

  if (!valid) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const existingSession = await prisma.session.findFirst({
    where: {
      userId: existingUser.id,
      expires: {
        gte: new Date(), // still valid
      },
    },
  });

  if (existingSession) {
    res.json({
      message: "Already signed in",
      sessionToken: existingSession.sessionToken,
    });
    return;
  }

  const jwt = hashToken(
    {
      userId: existingUser.id,
    },
    SECRET_KEY
  );

  const sessionToken = crypto.randomUUID();

  await prisma.session.create({
    data: {
      sessionToken,
      userId: existingUser.id,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    },
  });
  res.cookie("auth_token", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // milliseconds.
  });

  res.status(200).json({
    message: "Signed in successfully",
    sessionToken,
  });

  return;
};

export { googleAuthHandler, initialiseGoogleAuth, signInWithCredentials };

/**
 * refresh token
 * auto-expiry
 */
