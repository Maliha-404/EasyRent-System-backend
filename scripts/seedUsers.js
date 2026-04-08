const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { connectDB, getDB } = require('../config/db');

dotenv.config();

const hashPassword = (plain) => bcrypt.hash(plain, 10);

const usersToSeed = [
    {
        fullName: 'Central Admin',
        email: 'admin@easyrent.com',
        password: '123456',
        role: 'admin',
        persona: 'central_admin',
        status: 'Active',
        phoneNumber: '+8801700000001',
        profile: {
            profilePicture: '',
            address: 'AllInfoZone HQ',
            preferredArea: 'All',
            nid: 'ADMIN0001',
            bio: 'Platform super administrator with full access'
        }
    },
    {
        fullName: 'General User',
        email: 'user@easyrent.com',
        password: '123456',
        role: 'user',
        persona: 'user',
        status: 'Active',
        phoneNumber: '+8801700000002',
        profile: {
            profilePicture: '',
            address: 'Uttara, Dhaka',
            preferredArea: 'Uttara',
            nid: 'USER0002',
            bio: 'General user account for rent or buy activities'
        }
    },
    {
        fullName: 'General Owner',
        email: 'owner@easyrent.com',
        password: '123456',
        role: 'owner',
        persona: 'owner',
        status: 'Active',
        phoneNumber: '+8801700000003',
        profile: {
            profilePicture: '',
            address: 'Uttara Sector 11, Dhaka',
            preferredArea: 'Uttara',
            nid: 'OWNER0003',
            bio: 'General owner account for own or sell activities'
        }
    }
];

const legacySeedEmails = [
    'tenant@easyrent.com',
    'buyer@easyrent.com',
    'renter@easyrent.com',
    'seller@easyrent.com'
];

const seedUsers = async () => {
    try {
        await connectDB();
        const db = getDB();

        await db.collection('users').deleteMany({ email: { $in: legacySeedEmails } });
        console.log('Removed legacy persona-seeded demo accounts (if present).');

        for (const entry of usersToSeed) {
            const existing = await db.collection('users').findOne({ email: entry.email.toLowerCase() });
            const password = await hashPassword(entry.password);

            const payload = {
                fullName: entry.fullName,
                email: entry.email.toLowerCase(),
                password,
                role: entry.role,
                persona: entry.persona,
                status: entry.status,
                phoneNumber: entry.phoneNumber,
                profile: entry.profile,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            if (existing) {
                await db.collection('users').updateOne(
                    { _id: existing._id },
                    {
                        $set: {
                            ...payload,
                            createdAt: existing.createdAt || payload.createdAt
                        }
                    }
                );
                console.log(`Updated: ${entry.email}`);
            } else {
                await db.collection('users').insertOne(payload);
                console.log(`Inserted: ${entry.email}`);
            }
        }

        console.log('User seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error.message);
        process.exit(1);
    }
};

seedUsers();
