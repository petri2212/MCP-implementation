import "dotenv/config";
import { MongoClient } from "mongodb"
import fs from "fs/promises"
import path from "path"

async function testSavePdf() {
  const mongoUri = process.env.MONGODB_URI
   if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set")
    }
    const client = new MongoClient(mongoUri)
  try {
    await client.connect()
    const db = client.db("Main")
    const collection = db.collection("CVs")
    const pdfPath = path.resolve(__dirname, "../files/Andrei__Resume.pdf");
    const buffer = await fs.readFile(pdfPath)
    const result = await collection.insertOne({
      nome: "documento.pdf",
      tipo: "application/pdf",
      file: buffer,
      uploadedAt: new Date(),
    })
    console.log(`PDF salvato con ID: ${result.insertedId}`)
  } finally {
    await client.close()
  }
}

testSavePdf()