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

        //Save parcels in database 
        app.post("/parcels", async (req, res) => {
            const parcelDate = req.body
            const result = await parcelsCollection.insertOne(parcelDate)
            res.send(result)
        })

        // Get parcels by email id
        app.get("/parcels", async (req, res) => {
            const email = req.query.email
            const query = { createdBy: email }
            const result = await parcelsCollection.find(query).toArray()
            res.send(result)
        })

        // Delete a parcel
        app.delete("/parcels/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await parcelsCollection.deleteOne(query)
            res.send(result)
        })

        // Save user (Google + Register)
        app.post("/users", async (req, res) => {
            try {
                const user = req.body

                const existingUser = await usersCollection.findOne({ email: user.email })

                // ✅ If user already exists → just send success response
                if (existingUser) {
                    return res.status(200).send({
                        message: "User already exists",
                        inserted: false
                    })
                }

                // ✅ If new user → insert
                const result = await usersCollection.insertOne(user)

                res.status(201).send({
                    message: "User created successfully",
                    inserted: true,
                    result
                })

            } catch (error) {
                console.log("User Save Error:", error)
                res.status(500).send({ message: "Internal Server Error" })
            }
        })

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