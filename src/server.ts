import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import fs from "node:fs/promises"

const server = new McpServer({
    name:"test",
    version:"1.0.0",
    capabilities:{
        resources:{},
        tools:{},
        prompts:{},
    }
})

server.resource(
    "users",
    "user://all",
    {
        description: "Get all user data from a database",
        title: "Users",
        mimeType: "application/json"
    }, async uri =>{
        const users = await import("./data/users.json",{
        with:{type: "json"}
    } ).then(m => m.default)
        return{ 
             contents:[{uri: uri.href, text: JSON.stringify(users), mimeType:"application/json"}]
        }
    }
)

server.resource("user-details", new ResourceTemplate("users://{userId}/profile", {list:undefined}),
     {
        description: "Get a user's details from the database",
        title: "User Details",
        mimeType: "application/json"
    }, async (uri, {userId}) =>{
        const users = await import("./data/users.json",{
        with:{type: "json"}
    } ).then(m => m.default)

    const user = users.find(u => u.id === parseInt(userId as string))
    if (user == null){
        return{ 
             contents:[{uri: uri.href, text: JSON.stringify({error: "User not found"}), mimeType:"application/json"}]
        }
    }
     return{ 
             contents:[{uri: uri.href, text: JSON.stringify(user), mimeType:"application/json"}]
        }
    }

)


server.tool("create-user", "Create a new uer in teh database",{
    name: z.string(),
    email:z.string(),
    address: z.string(),
    phone: z.string(),
},{
    title: "Create User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true, //does interact with the external world?

}, async (params) => {
    try {
       const id = await createUser(params)
       return{
            content:[
                {type: "text", text: `User ${id} created successfully`}
            ]
        }
    } catch {
        return{
            content:[
                {type: "text", text: "Failed to save user"}
            ]
        }
    }
})

async function createUser(user:{
    name: string,
    email:string,
    address: string,
    phone:string
}){
    const users = await import("./data/users.json",{
        with:{type: "json"}
    } ).then(m => m.default)
    const id = users.length + 1;
    users.push({id, ...user})
    await fs.writeFile("./src/data/users.json", JSON.stringify(users, null, 2))
}


async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
}

main()