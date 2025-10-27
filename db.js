// db.js
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: ServerApiVersion.v1,
    tlsAllowInvalidCertificates: true,
    connectTimeoutMS: 10000
});

async function connectDB() {
    try {
        await client.connect();
        console.log("conectado ao mongodb atlas com sucesso");
        return client.db("brasil_2026_votes");
    } catch (err) {
        console.error("erro ao conectar no mongodb:", err);
    }
}

module.exports = connectDB;