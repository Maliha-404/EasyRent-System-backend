const fs = require('fs');

let content = fs.readFileSync('controllers/adminController.js', 'utf8');

if (!content.includes('const bcrypt = require(\'bcrypt\');')) {
    content = content.replace('const { ObjectId } = require(\'mongodb\');', 'const { ObjectId } = require(\'mongodb\');\nconst bcrypt = require(\'bcrypt\');');
}

const newMethods = `
const createUserByAdmin = async (req, res) => {
    try {
        const db = getDB();
        const { fullName, email, password, role, phoneNumber } = req.body;

        if (!fullName || !email || !password || !role) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await db.collection('users').findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const payload = {
            fullName: String(fullName).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: String(role).trim().toLowerCase(),
            persona: String(role).trim().toLowerCase(),
            status: 'Active',
            phoneNumber: phoneNumber ? String(phoneNumber).trim() : '',
            profile: {
                profilePicture: '',
                address: '',
                preferredArea: '',
                nid: '',
                bio: ''
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('users').insertOne(payload);
        const createdUser = await db.collection('users').findOne({ _id: result.insertedId });
        
        res.status(201).json({ message: 'User created successfully', user: toSafeUserRow(createdUser) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUserByAdmin = async (req, res) => {
    try {
        const db = getDB();
        const { id } = req.params;
        const { fullName, email, role, phoneNumber } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updateData = { updatedAt: new Date() };
        if (fullName !== undefined) updateData.fullName = String(fullName).trim();
        if (email !== undefined) updateData.email = String(email).trim().toLowerCase();
        if (role !== undefined) {
            updateData.role = String(role).trim().toLowerCase();
            updateData.persona = updateData.role;
        }
        if (phoneNumber !== undefined) updateData.phoneNumber = String(phoneNumber).trim();

        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: updateData }
        );

        const updatedUser = await db.collection('users').findOne({ _id: user._id });
        res.json({ message: 'User updated successfully', user: toSafeUserRow(updatedUser) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
`;

if (!content.includes('createUserByAdmin')) {
    content = content.replace('    createUnit\r\n};', '    createUnit,\r\n    createUserByAdmin,\r\n    updateUserByAdmin\r\n};\r\n' + newMethods);
    content = content.replace('    createUnit\n};', '    createUnit,\n    createUserByAdmin,\n    updateUserByAdmin\n};\n' + newMethods);
    fs.writeFileSync('controllers/adminController.js', content);
    console.log("Successfully updated adminController.js");
} else {
    console.log("Already updated.");
}
