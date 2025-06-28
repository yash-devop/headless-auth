import express from "express";
import CredentialsRouter from "./routes/auth/credentials/credentials.route";
import OauthRouter from "./routes/auth/oauth/oauth.route";
import { ErrorHandler } from "./lib/errors";
import cookieParser from "cookie-parser";

const app = express();
const PORT = 8000;

app.use(express.json());

app.use(cookieParser());

app.use("/api/v1", CredentialsRouter, OauthRouter);
app.use(ErrorHandler);
app.listen(PORT, () => {
  console.log("Server started successfully !");
});

app.listen("9000", () => {
  console.log("start the server");
});
