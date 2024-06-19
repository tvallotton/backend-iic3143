import nodemailer from "nodemailer";

export const MAIL_USER = process.env["MAIL_USER"];
const MAIL_PASS = process.env["MAIL_PASS"];

export default nodemailer.createTransport({
  service: "hotmail",
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});
