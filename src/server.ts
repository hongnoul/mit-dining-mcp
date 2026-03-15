import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMenuTools } from "./tools/menus.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mit-dining",
    version: "1.0.0",
  });

  registerMenuTools(server);

  return server;
}
