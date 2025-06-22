import { createTransport } from "nodemailer";
interface MailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  redirectLink?: string;
}
export const sendEmail = async (options: MailOptions, code?: string) => {
  createTransport({
    host: "smtp-mail.outlook.com",
    service: "gmail",
    auth: {
      user: "kamble1234meena@gmail.com", // use same mail and app password associated to it .
      pass: "ntdrqywudefxqqfa", // setup this google app password by going to the manage google aaccount
    },
  }).sendMail(options);
};
