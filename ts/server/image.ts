import { Server } from "./Server";

const server: Promise<void | Server> = Server.start().catch(console.error);