import express from "express";

import { isAuthenticated } from "../middleware/auth.js";
import { newGroupChat , getMyChats,getMyGroups, addMembers, removeMember, leaveGroup, sendAttachments,getChatDetails, renameGroup, deleteChat, getMessages} from "../controllers/chat.js";
import { attachementsMulter } from "../middleware/multer.js";
import { addMemberValidator, chatIdValidator, newGroupChatValidator, removeMemberValidator, validateHandler, sendAttachmentsValidator, renameValidator } from "../lib/validators.js";


const app =express.Router();



app.use(isAuthenticated);

app.post("/new", newGroupChatValidator(), validateHandler, newGroupChat);

app.post("/my", getMyChats);

app.get("/my/groups", getMyGroups);

app.put("/addmembers", addMemberValidator(), validateHandler, addMembers);

app.put("/removemember", removeMemberValidator(), validateHandler,removeMember);

app.delete("/leave/:id", chatIdValidator(), validateHandler, leaveGroup);

app.post("/message", attachementsMulter, sendAttachmentsValidator(),validateHandler, sendAttachments);

app.get("/message/:id", chatIdValidator(), validateHandler,getMessages);

app.route("/:id").get(chatIdValidator(), validateHandler, getChatDetails)
.put(renameValidator(), validateHandler,renameGroup)
.delete(chatIdValidator(),validateHandler, deleteChat);


export default app;
