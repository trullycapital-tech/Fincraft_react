const crypto = require('crypto');

class SecurityUtils {
  static hashPassword(password) {
    const bcrypt = require('bcryptjs');
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    return bcrypt.hashSync(password, saltRounds);
  }

  static comparePassword(password, hashedPassword) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compareSync(password, hashedPassword);
  }

  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  static maskPhoneNumber(phoneNumber) {
    if (phoneNumber.length < 10) return phoneNumber;
    return phoneNumber.replace(/(\d{6})(\d{4})/, 'XXXXXX$2');
  }

  static maskAccountNumber(accountNumber) {
    if (accountNumber.length < 8) return accountNumber;
    return accountNumber.replace(/(\d{4})(\d+)(\d{4})/, '$1XXXX$3');
  }

  static validatePAN(panNumber) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(panNumber);
  }

  static validatePhoneNumber(phoneNumber) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous characters
    return input
      .replace(/[<>\"']/g, '')
      .trim();
  }

  static encryptSensitiveData(data) {
    const algorithm = 'aes-256-gcm';
    const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-this';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  static decryptSensitiveData(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-this';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static generateAPIKey() {
    return 'fk_' + crypto.randomBytes(32).toString('hex');
  }

  static isValidAPIKey(apiKey) {
    return apiKey && apiKey.startsWith('fk_') && apiKey.length === 67;
  }
}

module.exports = SecurityUtils;