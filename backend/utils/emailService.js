const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendOTP(phoneNumber, otpCode, purpose = 'CIBIL_CONSENT') {
    // In a real implementation, you would integrate with SMS service
    // For demo purposes, we'll just log the OTP
    console.log(`📱 SMS to ${phoneNumber}: Your OTP for ${purpose} is: ${otpCode}`);
    
    return {
      success: true,
      message: `OTP sent to ${phoneNumber}`,
      messageId: `SMS_${Date.now()}`
    };
  }

  async sendEmail(to, subject, html, attachments = []) {
    try {
      if (process.env.DEMO_MODE === 'true') {
        console.log(`📧 Email to ${to}: ${subject}`);
        return {
          success: true,
          messageId: `EMAIL_${Date.now()}`
        };
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  async sendDocumentNotification(email, documents) {
    const subject = 'Your Documents are Ready for Download';
    const html = `
      <h2>Document Retrieval Completed</h2>
      <p>Your requested loan documents have been successfully retrieved and are ready for download.</p>
      <h3>Documents Retrieved:</h3>
      <ul>
        ${documents.map(doc => `<li>${doc.bank_name} - ${doc.document_type}</li>`).join('')}
      </ul>
      <p>Please log in to your account to download the documents.</p>
      <p>Note: Documents will be available for download for 30 days.</p>
    `;

    return this.sendEmail(email, subject, html);
  }
}

module.exports = new EmailService();