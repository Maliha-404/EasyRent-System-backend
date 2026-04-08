const { MongoClient } = require('mongodb');

let db;

const connectDB = async () => {
    if (db) return db;

    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;

    if (!uri) {
        throw new Error('MONGO_URI or MONGODB_URI is not set. Add one of them to your .env file.');
    }

    try {
        const client = new MongoClient(uri);
        await client.connect();
        db = dbName ? client.db(dbName) : client.db();
        console.log("MongoDB Connected");

        return db;
    } catch (err) {
        console.error("DB Connection Error:", err);
        process.exit(1);
    }
};

const getDB = () => {
    if (!db) throw new Error("DB not initialized");
    return db;
};

module.exports = { connectDB, getDB };
