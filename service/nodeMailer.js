/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-sequences */
/* eslint-disable comma-spacing */
// const handlebars = require('handlebars');
// const fs = require('fs');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fahizk100@gmail.com',
    pass: 'kqhbhyjsefbolxht',
  },
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendAdminOtp(email, otp, callback) {
  const mailOption = {
    from: 'fahizk100@gmail.com',
    to: email,
    subject: 'your OTP for Login',
    text: `your Otp is :${otp}`,
  };
  // eslint-disable-next-line no-unused-expressions
  transporter.sendMail(mailOption,callback);
}
function sendMailToAdmin(email, message,subjects, callback) {
  const mailOption = {
    from: email,
    to: 'drivewave299@gmail.com',
    subject: subjects,
    html: `<p style="font-family: Arial; sans-serif; font-size: 16px;">${message}</p>`,
  };
  transporter.sendMail(mailOption,callback);
}
function sendmailVendor(email, message, subjects, callback) {
  const mailOption = {
    from: 'fahizk100@gmail.com',
    to: email,
    subject: subjects,
    html: `<p style="font-family: Arial; sans-serif; font-size: 16px;">${message}</p>`,

  };
  transporter.sendMail(mailOption, callback);
}

function sendMailUser(email, subject, html) {
  return new Promise((resolve, reject) => {
    const mailOption = {
      from: 'fahizk100@gmail.com',
      to: email,
      subject,
      html, // Use rendered HTML template
    };

    transporter.sendMail(mailOption, (errors, info) => {
      if (errors) {
        console.error('Error sending email:', errors);
        reject(errors);
      } else {
        resolve(info);
      }
    });
  });
}
module.exports = {
  generateOtp,
  sendAdminOtp,
  sendMailToAdmin,
  sendmailVendor,
  sendMailUser,
};
