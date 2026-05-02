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
        fullName: 'Kamrul Hasan',
        email: 'tenant1@easyrent.com',
        password: '1234',
        role: 'tenant',
        persona: 'tenant',
        status: 'Active',
        phoneNumber: '+8801700000201',
        profile: { profilePicture: '', address: 'Uttara', preferredArea: 'Uttara', nid: 'TENANT001', bio: 'Looking for a flat in Uttara' }
    },
    {
        fullName: 'Nusrat Jahan',
        email: 'tenant2@easyrent.com',
        password: '1234',
        role: 'tenant',
        persona: 'tenant',
        status: 'Active',
        phoneNumber: '+8801700000202',
        profile: { profilePicture: '', address: 'Mirpur', preferredArea: 'Mirpur', nid: 'TENANT002', bio: 'Looking for a 3-bed apartment' }
    },
    {
        fullName: 'Asif Rahman',
        email: 'tenant3@easyrent.com',
        password: '1234',
        role: 'tenant',
        persona: 'tenant',
        status: 'Active',
        phoneNumber: '+8801700000203',
        profile: { profilePicture: '', address: 'Bashundhara', preferredArea: 'Bashundhara', nid: 'TENANT003', bio: 'University student looking for housing' }
    },
    {
        fullName: 'Abdul Karim',
        email: 'owner1@easyrent.com',
        password: '1234',
        role: 'owner',
        persona: 'owner',
        status: 'Active',
        phoneNumber: '+8801700000301',
        profile: { profilePicture: '', address: 'Sector 11', preferredArea: 'Uttara', nid: 'OWNER001', bio: 'Property developer and owner in Uttara' }
    },
    {
        fullName: 'Farida Begum',
        email: 'owner2@easyrent.com',
        password: '1234',
        role: 'owner',
        persona: 'owner',
        status: 'Pending',
        phoneNumber: '+8801700000302',
        profile: { profilePicture: '', address: 'Sector 12', preferredArea: 'Uttara', nid: 'OWNER002', bio: 'Building owner' }
    },
    {
        fullName: 'Mahmudul Haque',
        email: 'owner3@easyrent.com',
        password: '1234',
        role: 'owner',
        persona: 'owner',
        status: 'Pending',
        phoneNumber: '+8801700000303',
        profile: { profilePicture: '', address: 'Rupayan City', preferredArea: 'Uttara', nid: 'OWNER003', propertyType: 'Flats' }
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
        // Also cleanup old legacy emails if present
        await db.collection('users').deleteMany({ email: { $regex: 'landowner|flatowner' } });
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

        console.log('Seeded users with central admin, 3 tenants, and 3 owners.');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error.message);
        process.exit(1);
    }
};

seedUsers();
