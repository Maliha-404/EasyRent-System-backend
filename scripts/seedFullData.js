const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/easyrent';
const dbName = process.env.DB_NAME || 'easyrent';

const zonesData = [
  { name: "Uttara", city: "Dhaka", description: "Northern part of Dhaka, planned city." },
  { name: "Mirpur", city: "Dhaka", description: "Densely populated residential area." },
  { name: "Dhanmondi", city: "Dhaka", description: "Upscale residential and commercial area." },
  { name: "Gulshan", city: "Dhaka", description: "Diplomatic and premium commercial zone." }
];

const blocksData = {
  "Uttara": ["Sector 4", "Sector 7", "Sector 11"],
  "Mirpur": ["Block A", "Block B", "DOHS"],
  "Dhanmondi": ["Road 2", "Road 8A", "Road 27"],
  "Gulshan": ["Gulshan 1", "Gulshan 2", "Niketan"]
};

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedFullData() {
  let client;
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    console.log("Connected to DB. Starting Full Seed...");

    // Clear existing structural and relational data to avoid duplicates
    const collectionsToClear = ['zones', 'blocks', 'plots', 'buildings', 'floors', 'units', 'bookings', 'payments', 'notices'];
    for (const col of collectionsToClear) {
      await db.collection(col).deleteMany({});
      console.log(`Cleared ${col} collection.`);
    }

    // 1. Fetch Users
    console.log("Fetching users...");
    const users = await db.collection('users').find({}).toArray();
    console.log(`Fetched ${users.length} users`);
    const owners = users.filter(u => u.role === 'owner');
    const tenants = users.filter(u => u.role === 'tenant');

    if (owners.length === 0 || tenants.length === 0) {
      console.log("WARNING: You need at least one 'owner' and one 'tenant' in the users collection to seed relationships.");
      // We will just use any user if strictly needed, or skip.
    }

    const fallbackOwnerId = owners.length > 0 ? owners[0]._id : (users[0]?._id || new ObjectId());
    const fallbackTenantId = tenants.length > 0 ? tenants[0]._id : (users[0]?._id || new ObjectId());

    // 2. Create Zones & Blocks & Plots & Buildings & Floors & Units
    console.log("Creating relational data...");
    const buildingNames = ["Green View", "Skyline Tower", "Rose Valley", "Lakefront Living", "Sunset Heights"];
    
    let totalPlots = 0, totalBuildings = 0, totalUnits = 0;

    for (const zData of zonesData) {
      const zoneRes = await db.collection('zones').insertOne({
        ...zData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const zoneId = zoneRes.insertedId;

      const blocks = blocksData[zData.name];
      for (const bName of blocks) {
        const blockRes = await db.collection('blocks').insertOne({
          zoneId,
          name: bName,
          type: "Sector",
          createdAt: new Date(),
          updatedAt: new Date()
        });
        const blockId = blockRes.insertedId;

        // Create 2-3 Plots per block
        const numPlots = randomInt(2, 3);
        for (let i = 1; i <= numPlots; i++) {
          const owner = randomItem(owners) || { _id: fallbackOwnerId };
          
          const plotRes = await db.collection('plots').insertOne({
            blockId,
            plotNumber: `Plot-${randomInt(10, 99)}`,
            address: `Road ${randomInt(1, 15)}, ${bName}, ${zData.name}`,
            size: randomInt(3, 10), // Katha
            primaryLandOwnerId: owner._id,
            status: "Verified",
            createdAt: new Date(),
            updatedAt: new Date()
          });
          const plotId = plotRes.insertedId;
          totalPlots++;

          // Create a Building for the Plot
          const bldgName = randomItem(buildingNames);
          const totalFloors = randomInt(2, 6);
          const buildingRes = await db.collection('buildings').insertOne({
            plotId,
            name: bldgName,
            totalFloors,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          const buildingId = buildingRes.insertedId;
          totalBuildings++;

          // Create Notices for Building
          if (Math.random() > 0.5) {
            await db.collection('notices').insertOne({
              buildingId,
              title: "Maintenance Work Notice",
              content: "Water supply will be unavailable from 2 AM to 5 AM tomorrow due to tank cleaning.",
              date: new Date().toISOString(),
              createdAt: new Date()
            });
          }

          // Create Floors and Units
          for (let f = 1; f <= totalFloors; f++) {
            const floorRes = await db.collection('floors').insertOne({
              buildingId,
              floorNumber: f,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            const floorId = floorRes.insertedId;

            // 2 units per floor
            for (let u = 1; u <= 2; u++) {
              const unitLetter = u === 1 ? 'A' : 'B';
              const flatOwner = randomItem(owners) || { _id: fallbackOwnerId };
              
              const statusChoices = ["Listed", "Listed", "Occupied", "Draft"];
              const status = randomItem(statusChoices);
              const isRent = Math.random() > 0.2;

              const unitRes = await db.collection('units').insertOne({
                floorId,
                flatOwnerId: flatOwner._id,
                unitNumber: `${f}${unitLetter}`,
                size: randomInt(800, 2000), // sqft
                bedrooms: randomInt(2, 4),
                bathrooms: randomInt(2, 3),
                type: isRent ? "Rent" : "Sale",
                price: isRent ? randomInt(15000, 50000) : randomInt(5000000, 15000000),
                status: status,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              const unitId = unitRes.insertedId;
              totalUnits++;

              // Create Bookings & Payments if Listed or Occupied
              if (status === "Occupied" || status === "Listed") {
                if (Math.random() > 0.5 && tenants.length > 0) {
                  const tenant = randomItem(tenants) || { _id: fallbackTenantId };
                  const bStatus = status === "Occupied" ? "Confirmed" : "Pending";
                  const advance = isRent ? randomInt(5000, 10000) : 50000;
                  
                  const bookingRes = await db.collection('bookings').insertOne({
                    unitId,
                    tenantId: tenant._id,
                    date: new Date().toISOString(),
                    status: bStatus,
                    advanceAmount: advance,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  });
                  
                  if (bStatus === "Confirmed") {
                    await db.collection('payments').insertOne({
                      bookingId: bookingRes.insertedId,
                      amount: advance,
                      purpose: "Advance Booking",
                      status: "Paid",
                      date: new Date().toISOString(),
                      createdAt: new Date()
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log(`\nSeed Complete!`);
    console.log(`Created ${zonesData.length} Zones`);
    console.log(`Created ${Object.values(blocksData).flat().length} Blocks`);
    console.log(`Created ${totalPlots} Plots`);
    console.log(`Created ${totalBuildings} Buildings`);
    console.log(`Created ${totalUnits} Units (Flats)`);
    console.log(`Created random bookings, payments, and notices.`);
    
  } catch (error) {
    console.error("Error during seeding:", error);
  } finally {
    if (client) await client.close();
  }
}

seedFullData();
