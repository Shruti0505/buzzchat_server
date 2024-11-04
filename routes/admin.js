import express from "express";
import { adminLogin, adminLogout, getAdminData, allUsers, allChats, allMessages,
    getDashboardStats,
 } from "../controllers/admin.js";
import {  adminLoginValidator, validateHandler } from "../lib/validators.js";

import {adminOnly} from "../middleware/auth.js";
const app = express.Router();
app.post("/verify", adminLoginValidator(), validateHandler, adminLogin);
app.get("/logout", adminLogout);

app.use(adminOnly);

app.get("/",getAdminData);
app.get("/users", allUsers);
app.get("/chats",allChats);
app.get("/messages",allMessages);
app.get("/stats", getDashboardStats);
export default app;
