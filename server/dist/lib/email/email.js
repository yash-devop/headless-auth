// src/lib/email/email.ts
import { createTransport } from "nodemailer";
var sendEmail = async (options, code) => {
  createTransport({
    host: "smtp-mail.outlook.com",
    service: "gmail",
    auth: {
      user: "kamble1234meena@gmail.com",
      // use same mail and app password associated to it .
      pass: "ntdrqywudefxqqfa"
      // setup this google app password by going to the manage google aaccount
    }
  }).sendMail(options);
};
export {
  sendEmail
};
