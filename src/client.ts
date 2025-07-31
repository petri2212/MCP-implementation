import { select } from "@inquirer/prompts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const mcp = new Client({
    name: "text-client-video", version: "1.0.0"
}, {
    capabilities:{sampling: {}}
})

const transport = new StdioClientTransport({
    command: "node",
    args:["build/server.js"],
    stderr: "ignore"
})

async function main() {
    await mcp.connect(transport)
    const [{tools}, {prompts}, {resources}, {resourceTemplates}] = await Promise.all([
         mcp.listTools(),
         mcp.listPrompts(),
         mcp.listResources(),
         mcp.listResourceTemplates()

    ])

    console.log("You are connected")
    while(true){
        const option = await select({
            message: "what would you like to do",
            choices: ["Query", "Tools","Resources","Prompts"]
        })
        switch(option){
            case "Tools":
                 const toolName = await select({
            message: "Select a tool",
            choices: tools.map(tool => ({
                name: tool.annotations?.title || tool.name,
                value: tool.name,
                description: tool.description,
            })),
                }) 
                console.log(toolName)
        }

    }
}

main()