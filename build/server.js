"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = __importDefault(require("zod"));
const promises_1 = __importDefault(require("node:fs/promises"));
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const server = new mcp_js_1.McpServer({
    name: "test",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
        prompts: {},
    }
});
server.resource("users", "user://all", {
    description: "Get all user data from a database",
    title: "Users",
    mimeType: "application/json"
}, async (uri) => {
    const users = await import("./data/users.json", {
        with: { type: "json" }
    }).then(m => m.default);
    return {
        contents: [{ uri: uri.href, text: JSON.stringify(users), mimeType: "application/json" }]
    };
});
server.resource("user-details", new mcp_js_1.ResourceTemplate("users://{userId}/profile", { list: undefined }), {
    description: "Get a user's details from the database",
    title: "User Details",
    mimeType: "application/json"
}, async (uri, { userId }) => {
    const users = await import("./data/users.json", {
        with: { type: "json" }
    }).then(m => m.default);
    const user = users.find(u => u.id === parseInt(userId));
    if (user == null) {
        return {
            contents: [{ uri: uri.href, text: JSON.stringify({ error: "User not found" }), mimeType: "application/json" }]
        };
    }
    return {
        contents: [{ uri: uri.href, text: JSON.stringify(user), mimeType: "application/json" }]
    };
});
server.resource("get-jobs", "job://all", {
    description: "Get all jobs from a database",
    title: "jobs",
    mimeType: "application/json"
}, async (uri) => {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    const response = await fetch(`https://api.adzuna.com/v1/api/jobs/it/search/1?app_id=${appId}&app_key=${appKey}&&results_per_page=20&what=javascript%20developer&content-type=application/json`);
    //http://api.adzuna.com/v1/api/jobs/gb/search/1?app_id={YOUR API ID}&app_key={YOUR API KEY}&results_per_page=20&what=javascript%20developer&content-type=application/json
    if (!response.ok) {
        throw new Error(`Failed to fetch jobs from Adzuna: ${response.statusText}`);
    }
    const data = await response.json();
    const jobs = data.results.map((job) => ({
        title: job.title,
        company: job.company.display_name,
        location: job.location.display_name,
        description: job.description,
        url: job.redirect_url
    }));
    //content as [{ text: string }])[0].text
    return {
        contents: [{
                uri: uri.href,
                text: JSON.stringify(jobs, null, 2), //JSON.stringify(data), // or filter it before returning
                mimeType: "application/json"
            }]
    };
});
server.tool("create-user", "Create a new user in the database", {
    name: zod_1.default.string(),
    email: zod_1.default.string(),
    address: zod_1.default.string(),
    phone: zod_1.default.string(),
}, {
    title: "Create User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true, //does interact with the external world?
}, async (params) => {
    try {
        const id = await createUser(params);
        return {
            content: [
                { type: "text", text: `User ${id} created successfully` }
            ]
        };
    }
    catch {
        return {
            content: [
                { type: "text", text: "Failed to save user" }
            ]
        };
    }
});
server.tool("create-random-user", "Create a random user with fake data", {
    title: "Create Random User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
}, async () => {
    const res = await server.server.request({
        method: "sampling/createMessage",
        params: {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: "Generate fake user data. The user should have a realistic name, email, address, and phone number. Return this data as a JSON object with no other text or formatter so it can be used with JSON.parse.",
                    },
                },
            ],
            maxTokens: 1024,
        },
    }, types_js_1.CreateMessageResultSchema);
    if (res.content.type !== "text") {
        return {
            content: [{ type: "text", text: "Failed to generate user data" }],
        };
    }
    try {
        const fakeUser = JSON.parse(res.content.text
            .trim()
            .replace(/^```json/, "")
            .replace(/```$/, "")
            .trim());
        const id = await createUser(fakeUser);
        return {
            content: [{ type: "text", text: `User ${id} created successfully` }],
        };
    }
    catch {
        return {
            content: [{ type: "text", text: "Failed to generate user data" }],
        };
    }
});
//u have to install mongodb
server.tool("save-pdf-to-mongo", "Save a local PDF file to MongoDB", {
    title: "Save PDF to MongoDB",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
}, async () => {
    const { MongoClient } = await import("mongodb");
    const fs = await import("fs/promises");
    const path = await import("path");
    const mongoUri = process.env.MONGODB_URI;
    //const mongoUri = "mongodb://localhost:27017"
    if (!mongoUri) {
        throw new Error("MONGODB_URI environment variable is not set");
    }
    const client = new MongoClient(mongoUri);
    try {
        // ✅ 1. Connetti al DB
        await client.connect();
        const db = client.db("IkigAI");
        const collection = db.collection("CVs");
        // ✅ 2. Percorso al PDF (puoi sostituire con quello che preferisci)
        const pdfPath = path.resolve("files", "Andrei__Resume.pdf");
        const buffer = await fs.readFile(pdfPath);
        // ✅ 3. Documento Mongo
        const result = await collection.insertOne({
            nome: "documento.pdf",
            tipo: "application/pdf",
            file: buffer,
            uploadedAt: new Date(),
        });
        return {
            content: [
                {
                    type: "text",
                    text: `PDF salvato con ID: ${result.insertedId.toString()}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: "Errore nel salvataggio del PDF." }],
        };
    }
    finally {
        await client.close();
    }
});
server.tool("get-pdf-from-mongo", "Retrieve a PDF from MongoDB and save it locally", {
    title: "Get PDF from MongoDB",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
}, async () => {
    const { MongoClient } = await import("mongodb");
    const fs = await import("fs/promises");
    const path = await import("path");
    const mongoUri = "mongodb://localhost:27017";
    const client = new MongoClient(mongoUri);
    try {
        await client.connect();
        const db = client.db("mypdfdb");
        const collection = db.collection("pdfs");
        const filename = "documento.pdf"; // Puoi cambiarlo o passarlo come parametro
        const doc = await collection.findOne({ nome: filename });
        if (!doc) {
            return {
                content: [{ type: "text", text: `PDF "${filename}" non trovato.` }],
            };
        }
        const outputPath = path.resolve("output", filename);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, doc.file.buffer);
        return {
            content: [
                {
                    type: "text",
                    text: `PDF "${filename}" salvato localmente in: ${outputPath}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: "Errore nel recupero del PDF." }],
        };
    }
    finally {
        await client.close();
    }
});
server.prompt("generate-fake-user", "Generate a fake user based on a given name", { name: zod_1.default.string()
}, ({ name }) => {
    return {
        messages: [{
                role: 'user',
                content: {
                    type: "text", text: `Generate a fake user with the name ${name}. 
                        The user should have a realistic email, address, and a phone number.`
                },
            },
        ],
    };
});
async function createUser(user) {
    const users = await import("./data/users.json", {
        with: { type: "json" }
    }).then(m => m.default);
    const id = users.length + 1;
    users.push({ id, ...user });
    await promises_1.default.writeFile("./src/data/users.json", JSON.stringify(users, null, 2));
    return id;
}
async function main() {
    // try {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    //} catch (err) {
    // console.error("Fatal error in server:", err)
    // process.exit(1)
    //}
}
main();
