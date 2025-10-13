# MySQL Integration Guide for FinCraft

## 🚀 Quick Setup

### 1. Install MySQL Workbench

- Download and install [MySQL Workbench](https://dev.mysql.com/downloads/workbench/)
- Install MySQL Server if not already installed

### 2. Create Database

1. Open MySQL Workbench
2. Connect to your MySQL server
3. Run the SQL script: `backend/scripts/mysql-schema.sql`
4. This will create:
   - `fincraft_db` database
   - `users` table
   - `otps` table

### 3. Configure Environment Variables

1. Copy `backend/.env.mysql.example` to `backend/.env`
2. Update the MySQL connection details:

```env
USE_MYSQL=true
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=fincraft_db
MYSQL_USERNAME=root
MYSQL_PASSWORD=your_mysql_password
JWT_SECRET=your_jwt_secret_key
```

### 4. Initialize Database

```bash
cd backend
node scripts/init-mysql.js
```

### 5. Start Server with MySQL

```bash
cd backend
npm start
# OR use the flexible server
node server-flexible.js
```

## 📊 Database Schema

### Users Table

- **id**: Primary key (auto-increment)
- **firstName, lastName**: User name fields
- **email**: Unique email (login credential)
- **password**: Hashed password (bcrypt)
- **phoneNumber**: 10-digit Indian phone number
- **panNumber**: Unique PAN number
- **holderName**: Full name
- **cibilConsent fields**: CIBIL authorization data
- **bankConsents**: JSON array of bank authorizations
- **cibilAccounts**: JSON array of account data
- **documentRequests**: JSON array of document requests
- **isActive**: Account status
- **lastLogin**: Last login timestamp
- **createdAt, updatedAt**: Timestamps

### OTPs Table

- **id**: Primary key
- **identifier**: Unique identifier for OTP
- **otpCode**: 6-digit verification code
- **otpType**: Type of verification
- **phoneNumber, panNumber**: Associated user data
- **attempts**: Failed verification attempts
- **isVerified**: Verification status
- **expiresAt**: Expiration timestamp

## 🔄 How Login Data is Saved in MySQL

### Registration Process:

1. **User submits registration form**
2. **Backend validates input data**
3. **Password is hashed using bcrypt (12 salt rounds)**
4. **User record is inserted into `users` table**
5. **Response sent with user profile (no password)**

### Login Process:

1. **User submits email and password**
2. **Backend finds user by email in `users` table**
3. **Password is compared using bcrypt.compare()**
4. **JWT token is generated and returned**
5. **`lastLogin` timestamp is updated in database**
6. **Frontend stores JWT token in localStorage**

### Data Storage Locations:

- **MySQL Database**: Permanent user data, hashed passwords
- **Browser localStorage**: JWT tokens, user profile
- **Server Memory**: Current session data
- **HTTP Headers**: JWT tokens for API requests

## 🛠 Switching Between MongoDB and MySQL

### Use MongoDB:

```env
USE_MYSQL=false
MONGODB_URI=mongodb://localhost:27017/fincraft
```

### Use MySQL:

```env
USE_MYSQL=true
MYSQL_HOST=localhost
MYSQL_DATABASE=fincraft_db
MYSQL_USERNAME=root
MYSQL_PASSWORD=your_password
```

## 📝 Default Admin Account

After running `init-mysql.js`, you can login with:

- **Email**: admin@fincraft.com
- **Password**: Admin@123

## 🔍 MySQL Workbench Queries

### View all users:

```sql
SELECT id, firstName, lastName, email, phoneNumber, panNumber, isActive, lastLogin, createdAt
FROM users;
```

### Check login activity:

```sql
SELECT email, holderName, lastLogin, isActive
FROM users
WHERE lastLogin IS NOT NULL
ORDER BY lastLogin DESC;
```

### View OTP records:

```sql
SELECT * FROM otps
WHERE createdAt > DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY createdAt DESC;
```

## 🚨 Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: 7-day expiration
- **Input Validation**: Email, phone, PAN validation
- **SQL Injection Prevention**: Sequelize ORM with parameterized queries
- **Account Status**: Active/inactive user management

## 📈 Performance Optimizations

- **Database Indexes**: On email, PAN, phone number
- **Connection Pooling**: Max 5 connections
- **JSON Fields**: For flexible data storage
- **Auto-cleanup**: Expired OTPs are automatically removed

## 🔧 Troubleshooting

### Common Issues:

1. **Connection Error**: Check MySQL server is running
2. **Auth Failed**: Verify username/password in .env
3. **Table Not Found**: Run mysql-schema.sql script
4. **Port Conflict**: Change MySQL port in .env

### Debug Commands:

```bash
# Test MySQL connection
node -e "require('./config/mysql-database').connectMySQL()"

# View server health
curl http://localhost:5000/health

# Check database tables
mysql -u root -p fincraft_db -e "SHOW TABLES;"
```

## 🎯 Next Steps

1. Set up your MySQL database using the provided SQL script
2. Configure environment variables
3. Run the initialization script
4. Test login functionality
5. Monitor the database using MySQL Workbench

Your login data will now be securely stored in MySQL with all the same functionality as the original MongoDB setup!
