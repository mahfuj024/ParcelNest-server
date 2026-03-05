const express = require('express')
const app = express()

require('dotenv').config()

const port = process.env.PORT || 4000
const cors = require('cors')

app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.fq1afvi.mongodb.net/?appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        console.log("Mongodb connect successfully!✅");

        const db = client.db("Parcel-nest");
        const warehousesCollection = db.collection("warehouses");
        const parcelsCollection = db.collection("parcels");
        const usersCollection = db.collection("users");
        const ridersCollection = db.collection("riders");

        //Get warehouses all data 
        app.get("/warehouses", async (req, res) => {
            const result = await warehousesCollection.find().toArray()
            res.send(result)
        })

        // Save parcels in database 
        app.post("/parcels", async (req, res) => {
            try {
                const parcelData = {
                    ...req.body,
                    createdAt: new Date(),
                    status: "pending",
                    updatedAt: new Date()
                };
                const result = await parcelsCollection.insertOne(parcelData);
                res.status(201).send(result);
            } catch (error) {
                console.log("Error saving parcel:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Get parcels by email id (for logged in user)
        app.get("/parcels", async (req, res) => {
            try {
                const email = req.query.email;

                // If no email provided, return empty array
                if (!email) {
                    return res.status(200).send([]);
                }

                const query = { createdBy: email };
                const result = await parcelsCollection.find(query).sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (error) {
                console.log("Error fetching parcels:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Get all parcels (for admin only - add authentication later)
        app.get("/parcels/all", async (req, res) => {
            try {
                const result = await parcelsCollection.find().sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (error) {
                console.log("Error fetching all parcels:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Get single parcel by ID
        app.get("/parcels/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await parcelsCollection.findOne(query);

                if (!result) {
                    return res.status(404).send({ message: "Parcel not found" });
                }

                res.send(result);
            } catch (error) {
                console.log("Error fetching parcel:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Update parcel
        app.patch("/parcels/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const updates = req.body;

                const result = await parcelsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            ...updates,
                            updatedAt: new Date()
                        }
                    }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: "Parcel not found" });
                }

                res.send({
                    message: "Parcel updated successfully",
                    modifiedCount: result.modifiedCount
                });
            } catch (error) {
                console.log("Error updating parcel:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Delete a parcel
        app.delete("/parcels/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await parcelsCollection.deleteOne(query);

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: "Parcel not found" });
                }

                res.send({
                    message: "Parcel deleted successfully",
                    deletedCount: result.deletedCount
                });
            } catch (error) {
                console.log("Error deleting parcel:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Get all users
        app.get("/users", async (req, res) => {
            try {
                const result = await usersCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.log("Error fetching users:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Get user by email (MISSING ENDPOINT - ADD THIS)
        app.get("/users/:email", async (req, res) => {
            try {
                const { email } = req.params;
                const user = await usersCollection.findOne({ email });

                if (!user) {
                    return res.status(404).send({ message: "User not found" });
                }

                res.send(user);
            } catch (error) {
                console.log("Error fetching user:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Save user (Google + Register) - UPDATED with role
        app.post("/users", async (req, res) => {
            try {
                const user = req.body;
                const existingUser = await usersCollection.findOne({ email: user.email });

                // If user already exists → just send success response
                if (existingUser) {
                    return res.status(200).send({
                        message: "User already exists",
                        inserted: false,
                        user: existingUser
                    });
                }

                // Check if this is the first user (make them admin)
                const totalUsers = await usersCollection.countDocuments();
                const role = totalUsers === 0 ? "admin" : "user"; // First user becomes admin

                // Add role and timestamps to new user
                const newUser = {
                    ...user,
                    role: role,
                    created_at: new Date(),
                    updated_at: new Date()
                };

                const result = await usersCollection.insertOne(newUser);

                res.status(201).send({
                    message: "User created successfully",
                    inserted: true,
                    result,
                    user: newUser
                });

            } catch (error) {
                console.log("User Save Error:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Update user role (Single version - REMOVE DUPLICATE)
        app.patch("/users/:id/role", async (req, res) => {
            try {
                const { id } = req.params;
                const { role } = req.body; // "user" or "admin"

                // Validate role
                if (!["user", "admin"].includes(role)) {
                    return res.status(400).send({ message: "Invalid role value" });
                }

                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            role: role,
                            updated_at: new Date()
                        }
                    }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: "User not found" });
                }

                res.send({
                    message: "User role updated successfully",
                    modifiedCount: result.modifiedCount
                });
            } catch (error) {
                console.log("Error updating user role:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Get all riders
        app.get("/riders", async (req, res) => {
            const riders = await ridersCollection.find().toArray();
            res.send(riders);
        });

        // Update rider status
        app.patch("/riders/:id/status", async (req, res) => {
            const { id } = req.params;
            const { status } = req.body; // "pending" or "active"
            const result = await ridersCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status } }
            );
            res.send(result);
        });

        // Get active riders only
        app.get("/riders/active", async (req, res) => {
            try {
                const activeRiders = await ridersCollection.find({ status: "active" }).toArray();
                res.send(activeRiders);
            } catch (error) {
                console.log("Error fetching active riders:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Save riders
        app.post("/riders", async (req, res) => {
            const riderDate = req.body
            const result = await ridersCollection.insertOne(riderDate)
            res.send(result)
        })



    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// Root route
app.get('/', (req, res) => {
    res.send('Hello World!')
})

// Server start
app.listen(port, () => {
    console.log(`Express server running port : ${port}`)
})