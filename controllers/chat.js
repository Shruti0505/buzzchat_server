import { TryCatch } from "../middleware/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { User } from "../models/user.js";
import { ALERT, NEW_ATTACHMENT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { deleteFilesFromCloudinary, emitEvent } from "../utils/features.js";
import { getOtherMember } from "../lib/helper.js";
import { Message } from "../models/message.js";
import { uploadFilesToCloudinary } from "../utils/features.js";


const newGroupChat = TryCatch(async (req, res, next) => {
    const { name, members } = req.body;

    if (members.length < 2) {
        return next(new ErrorHandler("Group Chat must have at least 3 members", 400));
    }

    const allMembers = [...members, req.user];

    await Chat.create({
        name,
        groupChat: true,
        creator: req.user,
        members: allMembers,
    });

    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
    emitEvent(req, REFETCH_CHATS, members);

    res.status(201).json({
        success: true,
        message: "Group Chat Created",
    });
});

const getMyChats = TryCatch(async (req, res, next) => {
    const chats = await Chat.find({ members: req.user }).populate("members", "name avatar");

    const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
        const otherMember = getOtherMember(members, req.user);
        return {
            _id,
            groupChat,
            avatar: groupChat
                ? members.slice(0, 3).map(({ avatar }) => avatar.url)
                : [otherMember.avatar.url],
            name: groupChat ? name : otherMember.name,
            members: members.reduce((prev, curr) => {
                if (curr._id.toString() !== req.user.toString()) {
                    prev.push(curr._id);
                }
                return prev;
            }, []),
        };
    });

    return res.status(201).json({
        success: true,
        chats: transformedChats,
    });
});

const getMyGroups = TryCatch(async (req, res, next) => {
    const chats = await Chat.find({ members: req.user, groupChat: true, creator: req.user }).populate("members", "name avatar");

    const groups = chats.map(({ _id, name, members, groupChat }) => ({
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    }));

    return res.status(200).json({
        success: true,
        groups,
    });
});

const addMembers = TryCatch(async (req, res, next) => {
    const { chatId, members } = req.body;

    if (!members || members.length < 1) {
        return next(new ErrorHandler("Please provide members", 400));
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }

    if (!chat.groupChat) {
        return next(new ErrorHandler("This is not a group chat", 400));
    }

    if (chat.creator.toString() !== req.user.toString()) {
        return next(new ErrorHandler("You are not allowed to add members", 403));
    }

    const allNewMembersPromise = members.map((i) => User.findById(i));

    const allNewMembers = await Promise.all(allNewMembersPromise);

    const uniqueMembers = allNewMembers.filter((i) => !chat.members.includes(i._id.toString())).map((i) => i._id);

    chat.members.push(...uniqueMembers);

    if (chat.members.length > 100) {
        return next(new ErrorHandler("Group Members limit reached", 400));
    }

    await chat.save();

    const allUsersName = allNewMembers.map((i) => i.name).join(", ");

    emitEvent(req, ALERT, chat.members, `${allUsersName} added to ${chat.name} group`);
    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
        success: true,
        message: "Members added successfully",
    });
});

const removeMember = TryCatch(async (req, res, next) => {
    const { userId, chatId } = req.body;

    const [chat, userThatWillBeRemoved] = await Promise.all([
        Chat.findById(chatId),
        User.findById(userId, "name"),
    ]);

    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }

    if (!chat.groupChat) { 
        return next(new ErrorHandler("This is not a group chat", 400));
    }

    if (chat.creator.toString() !== req.user.toString()) {
        return next(new ErrorHandler("You are not allowed to remove members", 403));
    }

    if (chat.members.length <= 3) {
        return next(new ErrorHandler("Group must have at least 3 members", 400));
    }

    const allChatMembers = chat.members.map((i) => i.toString());

    chat.members = chat.members.filter((member) => member.toString() !== userId.toString());

    await chat.save();

    emitEvent(req, ALERT, chat.members, 
        {message: `${userThatWillBeRemoved.name} removed from ${chat.name} group`, chatId}
    );

    emitEvent(req, REFETCH_CHATS, allChatMembers);

    return res.status(200).json({
        success: true,
        message: "Members removed successfully",
    });
});

const leaveGroup = TryCatch(async (req, res, next) => {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (!chat.groupChat) {
        return next(new ErrorHandler("This is not a group chat", 400));
    }

    const remainingMembers = chat.members.filter((member) => member.toString() !== req.user.toString());

    if (remainingMembers.length < 3) {
        return next(new ErrorHandler("Group must have at least 3 members", 400));
    }

    if (chat.creator.toString() === req.user.toString()) {
        const randomNumber = Math.floor(Math.random() * remainingMembers.length);
        const newCreator = remainingMembers[randomNumber];
        chat.creator = newCreator;
    }

    chat.members = remainingMembers;

    const [user] = await Promise.all([
        User.findById(req.user, "name"),
        chat.save(),
    ]);

    emitEvent(req, ALERT, chat.members, {chatId, message: `${user.name} left the group`});

    return res.status(200).json({
        success: true,
        message: "leave group successful",
    });
});

const sendAttachments = TryCatch(async (req, res, next) => {
    const { chatId } = req.body;
    const files = req.files || [];

    if (files.length < 1) {
        return next(new ErrorHandler("Please upload files", 400));
    }
    if (files.length > 5) {
        return next(new ErrorHandler("You can upload a maximum of 5 files", 400));
    }

    const [chat, me] = await Promise.all([
        Chat.findById(chatId),
        User.findById(req.user, "name"),
    ]);

    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }

    const attachments = await uploadFilesToCloudinary(files);

    const messageForDB = {
        content: "",
        attachments,
        sender: me._id,
        chat: chatId,
    };

    const messageForRealTime = {
        ...messageForDB,
        sender: {
            _id: me._id,
            name: me.name,
        },
    };

    const message = await Message.create(messageForDB);

    emitEvent(req, NEW_MESSAGE, chat.members, {
        message: messageForRealTime,
        chat: chatId,
    });

    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

    return res.status(200).json({
        success: true,
        message, // Ensure the message is included in the response
    });
});

const getChatDetails = TryCatch(async (req, res, next) => {
    if(req.query.populate ==="true" ) {
        const chat = await Chat.findById(req.params.id).populate("members", "name avatar").lean();
        if (!chat) {
            return next(new ErrorHandler("Chat not found", 404));
        }

        if (req.query.populate === "true") {
            chat.members = chat.members.map(({ _id, name, avatar }) => ({
                _id,
                name,
                avatar: avatar.url,
            }));
        }

        return res.status(200).json({
            success: true,
            chat,
        });
    } else {
        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return next(new ErrorHandler("Chat not found", 404));
        }
        return res.status(200).json({
            success: true,
            chat,
        });
    }
});

const renameGroup = TryCatch(async (req, res, next) => {
    const chatId = req.params.id;
    const { name } = req.body;
    const chat = await Chat.findById(chatId);

    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (chat.creator.toString() !== req.user.toString()) {
        return next(new ErrorHandler("You are not allowed to rename this group", 403));
    }
    if (!chat.groupChat) {
        return next(new ErrorHandler("This is not a group chat", 400));
    }
    chat.name = name;
    await chat.save();
    emitEvent(req, REFETCH_CHATS, chat.members, `${chat.name} group renamed`);

    return res.status(200).json({
        success: true,
        message: "Group renamed successfully",
    });
});

const deleteChat = TryCatch(async (req, res, next) => {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);
    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (chat.groupChat && chat.creator.toString() !== req.user.toString()) {
        return next(new ErrorHandler("You are not allowed to delete this group", 403));
    }
    const members = chat.members;
    if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
        return next(new ErrorHandler("You are not allowed to delete this chat", 403));
    }
    const messageWithAttachments = await Message.find({ chat: chatId, attachments: { $exists: true, $ne: [] } });

    const public_ids = [];
    messageWithAttachments.forEach(({ attachments }) => {
        attachments.forEach(({ public_id }) => {
            public_ids.push(public_id);
        });
    });

    await Promise.all([
        deleteFilesFromCloudinary(public_ids),
        chat.deleteOne(),
        Message.deleteMany({ chat: chatId }),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
        success: true,
        message: "Chat deleted successfully",
    });
});

const getMessages = TryCatch(async (req, res, next) => {
    const chatId = req.params.id;
    const { page = 1 } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    const chat= await Chat.findById(chatId);
    if(!chat){
        return next(new ErrorHandler("Chat not found",404));
    }
    if(!chat.members.includes(req.user)){
        return next(new ErrorHandler("You are not a member of this chat",403));
    }

    const [messages, totalMessagesCount] = await Promise.all([
        Message.find({ chat: chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("sender", "name")
            .lean(),
        Message.countDocuments({ chat: chatId }),
    ]);

    const totalPages = Math.ceil(totalMessagesCount / limit);

    return res.status(200).json({
        success: true,
        messages: messages.reverse(),
        totalPages,
    });
});

export {
    newGroupChat,
    getMyChats,
    getMyGroups,
    addMembers,
    removeMember,
    leaveGroup,
    sendAttachments,
    getChatDetails,
    renameGroup,
    deleteChat,
    getMessages,
};