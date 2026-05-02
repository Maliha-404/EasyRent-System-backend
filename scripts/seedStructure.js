const dotenv = require('dotenv');
const { connectDB, getDB } = require('../config/db');

dotenv.config();

const now = () => new Date();

const mockAreas = [
    { id: 'a1', zoneName: 'Uttara', blockName: 'Sector 11', city: 'Dhaka', description: 'A peaceful residential area with excellent connectivity and modern amenities.' },
    { id: 'a2', zoneName: 'Uttara', blockName: 'Sector 4', city: 'Dhaka', description: 'Well-planned sector known for parks, quiet environment, and prominent schools.' },
    { id: 'a3', zoneName: 'Bashundhara', blockName: 'R/A', city: 'Dhaka', description: 'Premium residential zone with top universities and hospitals nearby.' },
    { id: 'a4', zoneName: 'Gulshan', blockName: '2', city: 'Dhaka', description: 'Diplomatic zone offering luxury apartments and elite services.' }
];

const mockBuildings = [
    { id: 'b1', name: 'Rahman Tower', address: 'Road 14, Uttara Sector 11, Dhaka', areaId: 'a1' },
    { id: 'b2', name: 'Chowdhury Plaza', address: 'Road 5, Uttara Sector 11, Dhaka', areaId: 'a1' },
    { id: 'b3', name: 'Bhuiyan Villa', address: 'Road 7, Uttara Sector 4, Dhaka', areaId: 'a2' },
    { id: 'b4', name: 'Apollo Heights', address: 'Block D, Bashundhara R/A, Dhaka', areaId: 'a3' },
    { id: 'b5', name: 'Imperial Court', address: 'Road 79, Gulshan 2, Dhaka', areaId: 'a4' }
];

const mockFlats = [
    { id: 'f1', buildingId: 'b1', flat_number: '4A', size: 1400, price: 35000, type: 'Rent', status: 'Available', floor: 4, bedrooms: 3, bathrooms: 3, availability_date: '2024-11-01', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800' },
    { id: 'f2', buildingId: 'b1', flat_number: '7B', size: 1600, price: 12500000, type: 'Sale', status: 'Available', floor: 7, bedrooms: 3, bathrooms: 3, availability_date: 'Immediate', image: 'https://images.unsplash.com/photo-1502672260266-1c1e5250ce73?auto=format&fit=crop&q=80&w=800' },
    { id: 'f3', buildingId: 'b3', flat_number: '2A', size: 1100, price: 25000, type: 'Rent', status: 'Available', floor: 2, bedrooms: 2, bathrooms: 2, availability_date: '2024-12-15', image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=800' },
    { id: 'f4', buildingId: 'b4', flat_number: '5C', size: 1800, price: 42000, type: 'Rent', status: 'Booked', floor: 5, bedrooms: 3, bathrooms: 4, availability_date: 'N/A', image: 'https://images.unsplash.com/photo-1560448204-61dc36dc98c8?auto=format&fit=crop&q=80&w=800' },
    { id: 'f5', buildingId: 'b5', flat_number: '9B', size: 2800, price: 45000000, type: 'Sale', status: 'Available', floor: 9, bedrooms: 4, bathrooms: 4, availability_date: 'Immediate', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800' },
    { id: 'f6', buildingId: 'b2', flat_number: 'PH-1', size: 3000, price: 85000, type: 'Rent', status: 'Occupied', floor: 12, bedrooms: 4, bathrooms: 4, availability_date: '2025-05-01', image: 'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&q=80&w=800' }
];

const mockBookings = [
    { id: 'bk1', flatId: 'f4', date: '2024-03-24', status: 'Confirmed', advanceAmount: 42000 },
    { id: 'bk2', flatId: 'f6', date: '2024-03-20', status: 'Confirmed', advanceAmount: 85000 },
    { id: 'bk3', flatId: 'f3', date: '2024-03-28', status: 'Pending', advanceAmount: 25000 },
    { id: 'bk4', flatId: 'f1', date: '2024-02-15', status: 'Cancelled', advanceAmount: 35000 }
];

const mockNotices = [
    { title: 'Lift Maintenance', content: 'The left lift will be under maintenance from 10 AM to 2 PM on Sunday.', date: '2024-03-27' },
    { title: 'Water Supply Delay', content: 'Water supply will be restricted on Friday morning.', date: '2024-03-28' }
];

const seedStructure = async () => {
    try {
        await connectDB();
        const db = getDB();

        const [owners, tenants] = await Promise.all([
            db.collection('users').find({ role: 'owner', status: 'Active' }).toArray(),
            db.collection('users').find({ role: 'tenant', status: 'Active' }).toArray()
        ]);

        if (owners.length === 0 || tenants.length === 0) {
            throw new Error('Active tenant and owner accounts are required. Run npm run seed:users first.');
        }

        const collections = ['zones', 'blocks', 'plots', 'buildings', 'floors', 'units', 'bookings', 'payments', 'notices'];
        await Promise.all(collections.map((name) => db.collection(name).deleteMany({})));

        const zonesCollection = db.collection('zones');
        const blocksCollection = db.collection('blocks');
        const plotsCollection = db.collection('plots');
        const buildingsCollection = db.collection('buildings');
        const floorsCollection = db.collection('floors');
        const unitsCollection = db.collection('units');
        const bookingsCollection = db.collection('bookings');
        const paymentsCollection = db.collection('payments');
        const noticesCollection = db.collection('notices');

        const zoneIdByName = new Map();
        for (const area of mockAreas) {
            if (!zoneIdByName.has(area.zoneName)) {
                const created = await zonesCollection.insertOne({
                    name: area.zoneName,
                    city: area.city,
                    description: `${area.zoneName} location hub`,
                    createdAt: now(),
                    updatedAt: now()
                });
                zoneIdByName.set(area.zoneName, created.insertedId);
            }
        }

        const blockIdByArea = new Map();
        for (const area of mockAreas) {
            const zoneId = zoneIdByName.get(area.zoneName);
            const created = await blocksCollection.insertOne({
                zoneId,
                name: area.blockName,
                type: 'sector',
                createdAt: now(),
                updatedAt: now()
            });
            blockIdByArea.set(area.id, created.insertedId);
        }

        const plotIdByBuilding = new Map();
        for (let i = 0; i < mockBuildings.length; i += 1) {
            const building = mockBuildings[i];
            const blockId = blockIdByArea.get(building.areaId);
            const owner = owners[i % owners.length];

            const plotCreated = await plotsCollection.insertOne({
                blockId,
                plotNumber: `P-${building.id.toUpperCase()}`,
                address: building.address,
                size: 3000 + i * 200,
                primaryLandOwnerId: owner._id,
                status: i % 2 === 0 ? 'Verified' : 'Pending Approval',
                createdAt: now(),
                updatedAt: now()
            });

            plotIdByBuilding.set(building.id, plotCreated.insertedId);

            await buildingsCollection.insertOne({
                _legacyId: building.id,
                plotId: plotCreated.insertedId,
                name: building.name,
                totalFloors: 12,
                createdAt: now(),
                updatedAt: now()
            });
        }

        const allBuildings = await buildingsCollection.find({}).toArray();
        const buildingByLegacyId = new Map(allBuildings.map((b) => [b._legacyId, b]));

        const floorMap = new Map();
        for (const flat of mockFlats) {
            const parentBuilding = buildingByLegacyId.get(flat.buildingId);
            if (!parentBuilding) continue;

            const floorKey = `${parentBuilding._id}-${flat.floor}`;
            if (!floorMap.has(floorKey)) {
                const floorCreated = await floorsCollection.insertOne({
                    buildingId: parentBuilding._id,
                    floorNumber: flat.floor,
                    createdAt: now(),
                    updatedAt: now()
                });
                floorMap.set(floorKey, floorCreated.insertedId);
            }

            const floorId = floorMap.get(floorKey);
            const flatOwner = owners[(flat.floor + flat.flat_number.length) % owners.length];

            await unitsCollection.insertOne({
                _legacyId: flat.id,
                floorId,
                flatOwnerId: flatOwner._id,
                unitNumber: flat.flat_number,
                size: flat.size,
                bedrooms: flat.bedrooms,
                bathrooms: flat.bathrooms,
                type: flat.type,
                price: flat.price,
                image: flat.image,
                availabilityDate: flat.availability_date,
                status: flat.status === 'Available' ? 'Listed' : flat.status,
                createdAt: now(),
                updatedAt: now()
            });
        }

        const allUnits = await unitsCollection.find({}).toArray();
        const unitByLegacyId = new Map(allUnits.map((u) => [u._legacyId, u]));

        const createdBookings = [];
        for (let i = 0; i < mockBookings.length; i += 1) {
            const booking = mockBookings[i];
            const unit = unitByLegacyId.get(booking.flatId);
            if (!unit) continue;
            const tenant = tenants[i % tenants.length];

            const created = await bookingsCollection.insertOne({
                tenantId: tenant._id,
                unitId: unit._id,
                date: booking.date,
                status: booking.status,
                advanceAmount: booking.advanceAmount,
                createdAt: now(),
                updatedAt: now()
            });

            createdBookings.push({
                id: created.insertedId,
                tenantId: tenant._id,
                amount: booking.advanceAmount,
                date: booking.date,
                status: booking.status
            });
        }

        for (const booking of createdBookings) {
            await paymentsCollection.insertOne({
                tenantId: booking.tenantId,
                bookingId: booking.id,
                date: booking.date,
                amount: booking.amount,
                purpose: 'Advance',
                status: booking.status === 'Cancelled' ? 'Pending' : 'Paid',
                createdAt: now(),
                updatedAt: now()
            });

            if (booking.status === 'Confirmed') {
                await paymentsCollection.insertOne({
                    tenantId: booking.tenantId,
                    bookingId: booking.id,
                    date: '2024-04-01',
                    amount: booking.amount,
                    purpose: 'Rent',
                    status: 'Paid',
                    createdAt: now(),
                    updatedAt: now()
                });
            }
        }

        const targetBuildings = allBuildings.slice(0, 2);
        for (let i = 0; i < mockNotices.length; i += 1) {
            const notice = mockNotices[i];
            const building = targetBuildings[i % targetBuildings.length];
            const owner = owners[i % owners.length];

            await noticesCollection.insertOne({
                ownerId: owner._id,
                buildingId: building ? building._id : null,
                title: notice.title,
                content: notice.content,
                date: notice.date,
                createdAt: now(),
                updatedAt: now()
            });
        }

        console.log('Structure seed complete: mock-equivalent data populated for zones, blocks, plots, buildings, floors, units, and bookings.');
        process.exit(0);
    } catch (error) {
        console.error('Structure seed failed:', error.message);
        process.exit(1);
    }
};

seedStructure();
