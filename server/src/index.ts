import express from "express";
import CredentialsRouter from "./routes/auth/credentials/credentials.route";
import { ErrorHandler } from "./lib/errors";

const app = express();
const PORT = 8000;

app.use(express.json());

app.use("/api/v1", CredentialsRouter);
app.use(ErrorHandler);
app.listen(PORT, () => {
  console.log("Server started successfully !");
});

app.listen("9000", () => {
  console.log("start the server");
});
