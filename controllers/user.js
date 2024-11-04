import { TryCatch } from "../middleware/error.js";
import { User } from "../models/user.js";
import { cookieOptions, sendToken, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { compare } from "bcrypt"; // Import compare from bcrypt
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { Request } from "../models/request.js";
import { getOtherMember } from "../lib/helper.js";


const newUser = TryCatch(async (req, res, next) => {
    const { name, username, password, bio } = req.body;
    const file = req.file;
    if (!file) return next(new ErrorHandler("Please upload an image", 400));

    const results = await uploadFilesToCloudinary([file]);

    if (!results[0] || !results[0].url) {
        return next(new ErrorHandler("Image upload failed", 500));
    }

    const avatar = {
        public_id: results[0].public_id,
        url: results[0].url,
    };

    const user = await User.create({
        name,
        bio,
        username,
        password,
        avatar,
    });

    sendToken(res, user, 201, "User Created");
});

const login = TryCatch(async (req, res, next) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).select("+password");
    if (!user) return next(new ErrorHandler("Invalid username or password", 404));
    
    const isMatch = await compare(password, user.password);
    if (!isMatch) return next(new ErrorHandler("Invalid Password or password", 404));

    sendToken(res, user, 200, `Welcome back ${user.name}`);
});

const getMyProfile = TryCatch(async (req, res, next) => {
    const user = await User.findById(req.user);
    if (!user) return next(new ErrorHandler("User not found", 404));
    res.status(200).json({
        success: true,
        user,
    });
});

const logout = TryCatch(async (req, res) => {
    return res.status(200).cookie("token", "", { ...cookieOptions, maxAge: 0 }).json({
        success: true,
        message: "Logged out",
    });
});

const searchUser = TryCatch(async (req, res) => {
    const { name = "" } = req.query;

    const myChats = await Chat.find({ groupChat: false, members: req.user });

    const allUsersFromMyChats = myChats.map((chat) => chat.members).flat();

    const allUsersExceptMeAndFriends = await User.find({
        _id: { $nin: [...allUsersFromMyChats, req.user] },
        name: { $regex: name, $options: "i" },
    });

    const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({ _id, name, avatar: avatar.url }));

    return res.status(200).json({
        success: true,
        users,
    });
});

const sendFriendRequest = TryCatch(async (req, res, next) => {
    const { userId } = req.body;
    const request = await Request.findOne({
        $or: [
            { sender: req.user, receiver: userId },
            { sender: userId, receiver: req.user },
        ],
    });

    if (request) return next(new ErrorHandler("Request already sent", 400));

    await Request.create({ sender: req.user, receiver: userId });

    emitEvent(req, NEW_REQUEST, [userId]);

    return res.status(200).json({
        success: true,
        message: "Friend Request Sent",
    });
});

const acceptFriendRequest = TryCatch(async (req, res, next) => {
    const { requestId, accept } = req.body;

    const request = await Request.findById(requestId)
        .populate("sender", "name")
        .populate("receiver", "name");

    if (!request) return next(new ErrorHandler("Request not found", 404));

    console.count("Accepting friend request");

    if (request.receiver._id.toString() !== req.user) return next(new ErrorHandler("Unauthorized", 401));

    if (!accept) {
        await request.deleteOne();
        
        return res.status(200).json({
            success: true,
            message: "Request rejected",
        });
    }
    console.count("Accepting friend request");

    const members = [request.sender._id, request.receiver._id];

    await Promise.all([
        Chat.create({
            members,
            name: `${request.sender.name} and ${request.receiver.name}`,
            //changed
            groupChat: false,
        }),
        request.deleteOne(),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
        success: true,
        message: "Friend Request Accepted",
        senderId: request.sender._id,
    });
});

const getAllNotifications = TryCatch(async (req, res) => {
    const requests = await Request.find({ receiver: req.user })
        .populate("sender", "name avatar");

    const allRequests = requests.map(({ _id, sender }) => ({
        _id,
        sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url,
        },
    }));
    res.status(200).json({
        success: true,
        allRequests,
    });
});

const getMyFriends = TryCatch(async (req, res) => {
    const chatId = req.query.chatId;

    const chats = await Chat.find({ groupChat: false, members: req.user })
        .populate("members", "name avatar");

    const friends = chats.map(({ members }) => {
        const otherUser = getOtherMember(members, req.user);
        return {
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar.url,
        };
    });

    if (chatId) {
        const chat = await Chat.findById(chatId);
        const availableFriends = friends.filter((friend) => !chat.members.includes(friend._id));
        return res.status(200).json({
            success: true,
            friends: availableFriends,
        });
    } else {
        return res.status(200).json({
            success: true,
            friends,
        });
    }
});

export { login, newUser, getMyProfile, logout, searchUser, sendFriendRequest, acceptFriendRequest, getAllNotifications, getMyFriends };