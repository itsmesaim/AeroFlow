const nodemailer = require("nodemailer");

console.log("nodemailer object:", nodemailer);
console.log("createTransporter type:", typeof nodemailer.createTransporter);

if (typeof nodemailer.createTransporter === "function") {
  console.log("✅ nodemailer.createTransporter is a function!");

  const transporter = nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: "test@gmail.com",
      pass: "test",
    },
  });

  console.log("✅ Transporter created successfully!");
} else {
  console.log("❌ nodemailer.createTransporter is NOT a function");
  console.log("Available methods:", Object.keys(nodemailer));
}
