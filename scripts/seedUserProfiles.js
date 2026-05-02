const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load from backend/.env

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/easyrent';
const dbName = process.env.DB_NAME || 'easyrent';

const bdNames = [
  "Rahim Uddin", "Karim Hasan", "Rafiqul Islam", "Tariqul Haque", "Abdur Rahman",
  "Nazmul Huda", "Jashim Uddin", "Farhana Akter", "Nusrat Jahan", "Sadia Islam",
  "Mahmudul Hasan", "Shakil Ahmed", "Imran Hossain", "Mehedi Hasan", "Rubel Miah",
  "Sumaiya Akter", "Tania Rahman", "Sultana Kamal", "Kamrul Islam", "Ayesha Siddiqa"
];

const bdAddresses = [
  "House 12, Road 4, Sector 7, Uttara, Dhaka",
  "Block C, Banani, Dhaka",
  "House 45, Road 2, Dhanmondi, Dhaka",
  "Mirpur 10, Block B, Dhaka",
  "Bashundhara R/A, Block A, Dhaka",
  "Gulshan 2, Road 12, Dhaka",
  "Mohakhali DOHS, Dhaka",
  "Mirpur DOHS, Dhaka",
  "House 10, Road 5, Mohammadpur, Dhaka",
  "Baily Road, Dhaka"
];

const randomBdPhone = () => {
  const prefixes = ["017", "018", "019", "015", "016", "013"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const body = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${body}`;
};

async function seedUserProfiles() {
  let client;
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users. Updating with Bangladesh context data...`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const newName = bdNames[i % bdNames.length];
      const newPhone = randomBdPhone();
      const newAddress = bdAddresses[i % bdAddresses.length];
      
      // Use dicebear for realistic avatars based on their name
      const encodedName = encodeURIComponent(newName);
      const newAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodedName}&backgroundColor=0284c7,16a34a,ea580c,4f46e5&textColor=ffffff`;

      const updateDoc = {
        $set: {
          fullName: newName,
          phone: newPhone,
          address: newAddress,
          avatar: newAvatar,
          updatedAt: new Date()
        }
      };

      await db.collection('users').updateOne({ _id: user._id }, updateDoc);
    }

    console.log("Successfully updated all users with realistic Bangladesh demo data!");
  } catch (error) {
    console.error("Error seeding users:", error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

seedUserProfiles();
