// MongoDB initialization script
db = db.getSiblingDB('fincraft');

// Create collections with indexes
db.createCollection('users');
db.createCollection('otps');

// Create indexes for better performance
db.users.createIndex({ "panNumber": 1 }, { unique: true });
db.users.createIndex({ "phoneNumber": 1 });
db.users.createIndex({ "email": 1 });
db.users.createIndex({ "cibilConsent.expiresAt": 1 });
db.users.createIndex({ "bankConsents.expiresAt": 1 });
db.users.createIndex({ "documentRequests.requestId": 1 });

db.otps.createIndex({ "identifier": 1 });
db.otps.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 300 });
db.otps.createIndex({ "expiresAt": 1 });
db.otps.createIndex({ "otpType": 1 });

// Insert demo data if needed
if (db.users.countDocuments() === 0) {
    print('Inserting demo user data...');
    
    db.users.insertMany([
        {
            panNumber: "ABCDE1234F",
            holderName: "John Doe",
            phoneNumber: "9876543210",
            email: "john.doe@example.com",
            cibilConsent: {
                isGranted: false
            },
            bankConsents: [],
            cibilData: null,
            documentRequests: [],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ]);
    
    print('Demo data inserted successfully');
}

print('MongoDB initialization completed');