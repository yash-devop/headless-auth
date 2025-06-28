import axios from "axios";
import { env } from "../env";
import { HeadlessAuthError } from "../errors";
import { OAuth } from "@/types/types";

const {
  GOOGLE_ACCESS_TOKEN_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URL,
  GOOGLE_USER_PROFILE_URL,
} = env;
const OauthService = {
  google: {
    getAuthorizationUrl: (): string => {
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URL}&response_type=code&scope=profile email`;
      return url;
    },
    handleCallback: async (
      code: string,
      redirectUrl: string
    ): Promise<OAuth> => {
      try {
        // Exchange authorization code for access token
        const res = await axios.post(
          GOOGLE_ACCESS_TOKEN_URL,
          {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: GOOGLE_REDIRECT_URL,
            grant_type: "authorization_code",
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        const finalData: Omit<
          OAuth,
          "profile" | "status" | "success" | "status" | "expiresIn"
        > = res.data;
        const { access_token, id_token, redirectUri } = finalData;
        console.log("finalData", finalData);

        const { data: profile, status } = await axios.get(
          GOOGLE_USER_PROFILE_URL,
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );

        return {
          id_token,
          profile,
          access_token,
          redirectUri,
          status,
          success: true,
        };
      } catch (error) {
        const errorMsg = (error as Error).message;
        throw new HeadlessAuthError({
          code: 500,
          message: errorMsg,
        });
      }
    },
  },
};
export { OauthService };
