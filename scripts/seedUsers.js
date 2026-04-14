const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { connectDB, getDB } = require('../config/db');

dotenv.config();

const hashPassword = (plain) => bcrypt.hash(plain, 10);

const usersToSeed = [
    {
        fullName: 'Central Admin',
        email: 'admin@easyrent.com',
        password: '1234',
        role: 'admin',
        persona: 'central_admin',
        status: 'Active',
        phoneNumber: '+8801700000101',
        profile: { profilePicture: '', address: 'HQ', preferredArea: 'Global', nid: 'ADMIN0001', bio: 'Only central admin account' }
    },
    {
        fullName: 'Tenant One',
        email: 'tenant1@easyrent.com',
        password: '1234',
        role: 'tenant',
        persona: 'tenant',
        status: 'Active',
        phoneNumber: '+8801700000201',
        profile: { profilePicture: '', address: 'Uttara', preferredArea: 'Uttara', nid: 'TENANT001', bio: 'Tenant account 1' }
    },
    {
        fullName: 'Tenant Two',
        email: 'tenant2@easyrent.com',
        password: '1234',
        role: 'tenant',
        persona: 'tenant',
        status: 'Active',
        phoneNumber: '+8801700000202',
        profile: { profilePicture: '', address: 'Mirpur', preferredArea: 'Mirpur', nid: 'TENANT002', bio: 'Tenant account 2' }
    },
    {
        fullName: 'Tenant Three',
        email: 'tenant3@easyrent.com',
        password: '1234',
        role: 'tenant',
        persona: 'tenant',
        status: 'Active',
        phoneNumber: '+8801700000203',
        profile: { profilePicture: '', address: 'Bashundhara', preferredArea: 'Bashundhara', nid: 'TENANT003', bio: 'Tenant account 3' }
    },
    {
        fullName: 'Land Owner One',
        email: 'landowner1@easyrent.com',
        password: '1234',
        role: 'land_owner',
        persona: 'land_owner',
        status: 'Active',
        phoneNumber: '+8801700000301',
        profile: { profilePicture: '', address: 'Sector 11', preferredArea: 'Uttara', nid: 'LANDOWN001', bio: 'Land owner account 1' }
    },
    {
        fullName: 'Land Owner Two',
        email: 'landowner2@easyrent.com',
        password: '1234',
        role: 'land_owner',
        persona: 'land_owner',
        status: 'Pending',
        phoneNumber: '+8801700000302',
        profile: { profilePicture: '', address: 'Sector 12', preferredArea: 'Uttara', nid: 'LANDOWN002', bio: 'Land owner account 2' }
    },
    {
        fullName: 'Land Owner Three',
        email: 'landowner3@easyrent.com',
        password: '1234',
        role: 'land_owner',
        persona: 'land_owner',
        status: 'Pending',
        phoneNumber: '+8801700000303',
        profile: { profilePicture: '', address: 'Rupayan City', preferredArea: 'Uttara', nid: 'LANDOWN003', bio: 'Land owner account 3' }
    },
    {
        fullName: 'Flat Owner One',
        email: 'flatowner1@easyrent.com',
        password: '1234',
        role: 'flat_owner',
        persona: 'flat_owner',
        status: 'Active',
        phoneNumber: '+8801700000401',
        profile: { profilePicture: '', address: 'Sector 11 Plot 4', preferredArea: 'Uttara', nid: 'FLATOWN001', bio: 'Flat owner account 1' }
    },
    {
        fullName: 'Flat Owner Two',
        email: 'flatowner2@easyrent.com',
        password: '1234',
        role: 'flat_owner',
        persona: 'flat_owner',
        status: 'Pending',
        phoneNumber: '+8801700000402',
        profile: { profilePicture: '', address: 'Sector 11 Plot 4', preferredArea: 'Uttara', nid: 'FLATOWN002', bio: 'Flat owner account 2' }
    },
    {
        fullName: 'Flat Owner Three',
        email: 'flatowner3@easyrent.com',
        password: '1234',
        role: 'flat_owner',
        persona: 'flat_owner',
        status: 'Pending',
        phoneNumber: '+8801700000403',
        profile: { profilePicture: '', address: 'Sector 12 Plot 9', preferredArea: 'Uttara', nid: 'FLATOWN003', bio: 'Flat owner account 3' }
    }
];

const seedUsers = async () => {
    try {
        await connectDB();
        const db = getDB();

        const seedEmails = usersToSeed.map((entry) => entry.email.toLowerCase());
        await db.collection('users').deleteMany({
            role: 'admin',
            email: { $ne: 'admin@easyrent.com' }
        });
        await db.collection('users').deleteMany({ email: { $in: seedEmails } });
        console.log('Cleared existing seed users.');

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

        console.log('Seeded users with single central admin and 3 users for each non-admin role.');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error.message);
        process.exit(1);
    }
};

seedUsers();
