import { OauthService } from "@/lib/services/oauth.service";
import { PrismaClient } from "@prisma/client";
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
    const user = await prisma.user.create({
      data: {
        emailVerified: profile.verified_email ? new Date() : null,
        email: profile.email,
        image: profile.picture,
        name: profile.given_name || profile.family_name,
      },
    });

    if (user.id) {
      await prisma.account.create({
        data: {
          provider: "google",
          providerAccountId: profile.id,
          userId: user.id,
          type: "oauth",
        },
      });

      /**
       * TODOS:
       * 1) after signup with google , check if there is an existing user or not , if yes then update that user. and if not then create a new user.
       * 2) handle the error redirection correctly after the above...
       * 3) idk but check if any other table should be created or updated !
       * 4) once signup , additionally you can also automatically SIGNIN the user. ( important )
       * 4.a) user gets redirected to another route ( but only in case of signup ) and then that route will just login the user.
       * 4.b) or simply in this file only , add the login logic. ( one thing we can do is just move the login logic in service and then we can reuse the logic SHEESHH ! )
       * 6) once all done , your google and credential auth flow is completed.
       */
    }
    res.redirect(redirectUri); // redirect to home
    return;
  } catch (error) {
    return res.redirect(500, "/login?error=OAuthFailed");
  }
};

export { googleAuthHandler, initialiseGoogleAuth };
