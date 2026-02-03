const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.keysers.co.za',
  port: 465,
  secure: true,
  auth: {
    user: 'quotes@keysers.co.za',
    pass: '3QA`fre.E*iT~3_ez=',
  },
});

transporter.sendMail({
  from: '"Keysers Camera" <quotes@keysers.co.za>',
  to: 'info@riaankeyser.com',
  subject: 'Test Email from Dashboard',
  html: '<h1>Test Email</h1><p>If you receive this, SMTP is working!</p>',
}).then(info => {
  console.log('✅ Email sent:', info.messageId);
  process.exit(0);
}).catch(err => {
  console.error('❌ Email failed:', err);
  process.exit(1);
});
