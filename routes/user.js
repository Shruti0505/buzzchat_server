import express from "express";
import {acceptFriendRequest, login, logout, newUser, searchUser, sendFriendRequest,getAllNotifications, getMyFriends} from "../controllers/user.js";
import { multerUpload, singleAvatar } from "../middleware/multer.js";
import { get } from "mongoose";
import { getMyProfile } from "../controllers/user.js";
import { isAuthenticated } from "../middleware/auth.js";
import { acceptRequestValidator, loginValidator, registerValidator, sendRequestValidator, validateHandler } from "../lib/validators.js";

const app =express.Router();

app.post("/new", singleAvatar, registerValidator(),validateHandler, newUser,);
app.post("/login", loginValidator(),validateHandler, login);

app.use(isAuthenticated);

app.get("/me",getMyProfile);
app.get("/logout", logout);
app.get("/search", searchUser);
app.put("/sendrequest", sendRequestValidator(), validateHandler, sendFriendRequest);
app.put("/acceptrequest", acceptRequestValidator(), validateHandler, acceptFriendRequest);
app.get("/notifications",  getAllNotifications);
app.get("/friends", getMyFriends);







export default app;
