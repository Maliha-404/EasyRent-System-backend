const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/easyrent';
const dbName = process.env.DB_NAME || 'easyrent';

const zonesData = [
    { name: "Uttara", city: "Dhaka", description: "Modern residential area with planned sectors." },
    { name: "Mirpur", city: "Dhaka", description: "Densely populated and culturally rich area." },
    { name: "Dhanmondi", city: "Dhaka", description: "Upscale residential area with many restaurants and schools." }
];

const blocksDataMap = {
    "Uttara": ["Sector 4", "Sector 7", "Sector 11", "Sector 13"],
    "Mirpur": ["Block A", "Block B", "DOHS", "Pallabi"],
    "Dhanmondi": ["Road 2", "Road 8A", "Road 27", "Satmasjid Road"]
};

const buildingPrefixes = ["Green", "Blue", "Sky", "Lake", "Rose", "Palm", "Metro", "Royal"];
const buildingSuffixes = ["View", "Tower", "Residency", "Apartments", "Heights", "Valley", "Square"];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
    console.log("Connecting to MongoDB...");
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        console.log("Connected to database:", dbName);

        // 1. Fetch Users
        const users = await db.collection('users').find({}).toArray();
        const owners = users.filter(u => u.role === 'owner');
        const tenants = users.filter(u => u.role === 'tenant');

        if (owners.length === 0) {
            console.log("No owners found in database. Please register an owner first.");
            return;
        }
        if (tenants.length === 0) {
            console.log("No tenants found in database. Please register a tenant first.");
            return;
        }

        console.log(`Found ${owners.length} owners and ${tenants.length} tenants.`);

        // 2. Clear existing structural data
        const collections = ['zones', 'blocks', 'plots', 'buildings', 'floors', 'units', 'bookings', 'payments', 'notices'];
        for (const coll of collections) {
            await db.collection(coll).deleteMany({});
            console.log(`Cleared collection: ${coll}`);
        }

        // 3. Create Zones
        const zoneInserts = zonesData.map(z => ({
            ...z,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        const zonesResult = await db.collection('zones').insertMany(zoneInserts);
        const zoneIds = Object.values(zonesResult.insertedIds);
        console.log(`Inserted ${zoneIds.length} zones.`);

        // 4. Create Blocks
        const blockInserts = [];
        zoneIds.forEach((zoneId, idx) => {
            const zoneName = zonesData[idx].name;
            const blocks = blocksDataMap[zoneName];
            blocks.forEach(bName => {
                blockInserts.push({
                    zoneId,
                    name: bName,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            });
        });
        const blocksResult = await db.collection('blocks').insertMany(blockInserts);
        const blockIds = Object.values(blocksResult.insertedIds);
        console.log(`Inserted ${blockIds.length} blocks.`);

        // 5. Create Plots, Buildings, Floors, and Units
        let totalPlots = 0;
        let totalBuildings = 0;
        let totalFloors = 0;
        let totalUnits = 0;

        for (const blockId of blockIds) {
            // Create 1-2 plots per block
            const plotsInBlock = getRandomInt(1, 2);
            for (let p = 0; p < plotsInBlock; p++) {
                const owner = getRandomItem(owners);
                const plotInsert = {
                    blockId,
                    plotNumber: `Plot-${getRandomInt(100, 999)}`,
                    address: `House ${getRandomInt(1, 50)}, Road ${getRandomInt(1, 20)}`,
                    size: getRandomInt(2, 10),
                    primaryLandOwnerId: owner._id,
                    status: 'Verified',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const plotResult = await db.collection('plots').insertOne(plotInsert);
                const plotId = plotResult.insertedId;
                totalPlots++;

                // Create a building for each plot
                const buildingName = `${getRandomItem(buildingPrefixes)} ${getRandomItem(buildingSuffixes)}`;
                const floorsCount = getRandomInt(3, 6);
                const buildingInsert = {
                    plotId,
                    name: buildingName,
                    totalFloors: floorsCount,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const buildingResult = await db.collection('buildings').insertOne(buildingInsert);
                const buildingId = buildingResult.insertedId;
                totalBuildings++;

                // Create Floors
                const floorInserts = [];
                for (let f = 1; f <= floorsCount; f++) {
                    floorInserts.push({
                        buildingId,
                        floorNumber: f,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }
                const floorsResult = await db.collection('floors').insertMany(floorInserts);
                const floorIds = Object.values(floorsResult.insertedIds);
                totalFloors += floorIds.length;

                // Create Units (2-3 per floor)
                for (const floorId of floorIds) {
                    const unitsInFloor = getRandomInt(2, 3);
                    const floorObj = floorInserts.find(fi => fi.buildingId.equals(buildingId) && floorIds.includes(floorId)); // Approximate match for floorNumber
                    const floorNum = floorInserts[floorIds.indexOf(floorId)].floorNumber;

                    const unitInserts = [];
                    for (let u = 1; u <= unitsInFloor; u++) {
                        const unitOwner = getRandomItem(owners);
                        const status = getRandomItem(['Listed', 'Occupied', 'Draft']);
                        unitInserts.push({
                            floorId,
                            flatOwnerId: unitOwner._id,
                            unitNumber: `${floorNum}${String.fromCharCode(64 + u)}`,
                            size: getRandomInt(800, 2500),
                            bedrooms: getRandomInt(1, 4),
                            bathrooms: getRandomInt(1, 3),
                            type: getRandomItem(['Rent', 'Sale']),
                            price: getRandomInt(15000, 150000),
                            status: status,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                    const unitsResult = await db.collection('units').insertMany(unitInserts);
                    const unitIds = Object.values(unitsResult.insertedIds);
                    totalUnits += unitIds.length;

                    // 6. Create Bookings and Payments for Occupied Units
                    for (let ui = 0; ui < unitIds.length; ui++) {
                        const unitId = unitIds[ui];
                        const unit = unitInserts[ui];
                        if (unit.status === 'Occupied') {
                            const tenant = getRandomItem(tenants);
                            const bookingInsert = {
                                unitId,
                                tenantId: tenant._id,
                                date: new Date(Date.now() - getRandomInt(1, 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                status: 'Confirmed',
                                advanceAmount: unit.price * 2,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            };
                            const bookingResult = await db.collection('bookings').insertOne(bookingInsert);
                            const bookingId = bookingResult.insertedId;

                            // Create Payment
                            await db.collection('payments').insertOne({
                                bookingId,
                                amount: unit.price * 2,
                                purpose: 'Advance Payment',
                                status: 'Paid',
                                date: bookingInsert.date,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            });
                        } else if (unit.status === 'Listed' && Math.random() > 0.5) {
                             // Create a pending booking
                             const tenant = getRandomItem(tenants);
                             await db.collection('bookings').insertOne({
                                 unitId,
                                 tenantId: tenant._id,
                                 date: new Date().toISOString().split('T')[0],
                                 status: 'Pending',
                                 advanceAmount: unit.price,
                                 createdAt: new Date(),
                                 updatedAt: new Date()
                             });
                        }
                    }
                }

                // 7. Create some Notices for the owner/building
                if (Math.random() > 0.3) {
                    await db.collection('notices').insertOne({
                        ownerId: owner._id,
                        buildingId: buildingId,
                        title: "Maintenance Notice",
                        content: "The elevator will be under maintenance on Sunday from 10 AM to 2 PM.",
                        date: new Date().toISOString().split('T')[0],
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }
            }
        }

        console.log(`Seeding complete!`);
        console.log(`Total Plots: ${totalPlots}`);
        console.log(`Total Buildings: ${totalBuildings}`);
        console.log(`Total Floors: ${totalFloors}`);
        console.log(`Total Units: ${totalUnits}`);

    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await client.close();
        console.log("Connection closed.");
    }
}

seed();
