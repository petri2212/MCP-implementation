"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prompts_1 = require("@inquirer/prompts");
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const mcp = new index_js_1.Client({
    name: "text-client-video", version: "1.0.0"
}, {
    capabilities: { sampling: {} }
});
const transport = new stdio_js_1.StdioClientTransport({
    command: "node",
    args: ["build/server.js"],
    stderr: "ignore"
});
async function main() {
    await mcp.connect(transport);
    const [{ tools }, { prompts }, { resources }, { resourceTemplates }] = await Promise.all([
        mcp.listTools(),
        mcp.listPrompts(),
        mcp.listResources(),
        mcp.listResourceTemplates()
    ]);
    console.log("You are connected");
    while (true) {
        const option = await (0, prompts_1.select)({
            message: "what would you like to do",
            choices: ["Query", "Tools", "Resources", "Prompts"]
        });
        switch (option) {
            case "Tools":
                const toolName = await (0, prompts_1.select)({
                    message: "Select a tool",
                    choices: tools.map(tool => ({
                        name: tool.annotations?.title || tool.name,
                        value: tool.name,
                        description: tool.description,
                    })),
                });
                console.log(toolName);
        }
    }
}
main();
