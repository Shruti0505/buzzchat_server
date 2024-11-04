
import {User} from "../models/user.js";
import {faker, simpleFaker} from "@faker-js/faker"
import {Chat} from "../models/chat.js";
import {Message} from "../models/message.js";
const createSingleChats = async (numChats) => {
    try {
        const users = await User.find().select("_id");
        const chatsPromise = [];
        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                chatsPromise.push(
                    Chat.create({
                        name: faker.lorem.words(2),
                        members: [users[i]._id, users[j]._id],
                        groupChat: true, // Set groupChat to false for single chats
                    })
                );
            }
        }
        await Promise.all(chatsPromise);
        console.log("Chats Created", numChats);
        process.exit();
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};
const createGroupChats = async (numChats) => {
    try {
        const users = await User.find().select("_id");
        const chatsPromise = [];
        for (let i = 0; i < numChats; i++) {
            const numMembers = faker.number.int({ min: 3, max: users.length });
            const members = [];

            for (let j = 0; j < numMembers; j++) {
                const randomIndex = Math.floor(Math.random() * users.length);
                const randomUser = users[randomIndex];

                if (!members.includes(randomUser)) {
                    members.push(randomUser);
                }
            }

            const chat = Chat.create({
                groupChat: true,
                name: faker.lorem.words(2),
                members: members.map((member) => member._id),
                creator: members[0]._id,
            });
            chatsPromise.push(chat);
        }
        await Promise.all(chatsPromise);
        console.log("Chats Created");
        process.exit();
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

const createMessages= async(numMessages)=>{
    try{
        const users= await User.find().select("_id");
        const chats= await Chat.find().select("_id");
        const messagesPromise= [];

        for(let i=0; i<numMessages; i++){
            const randomUser= users[Math.floor(Math.random()*users.length)];
            const randomChat= chats[Math.floor(Math.random()*chats.length)];

            messagesPromise.push(
                Message.create({
                    chat: randomChat,
                    sender: randomUser,
                    content: faker.lorem.sentence(),
                })
            );
        }
        await Promise.all(messagesPromise);
        console.log("Messages Created", numMessages);
        process.exit();

    }catch (error) {
        console.log(error);
        process.exit(1);
    }
};

const createMessagesInAChat = async ( chatId, numMessages) => {
    try{
        const users= await User.find().select("_id");
        const messagesPromise= [];

        for(let i=0; i<numMessages; i++){
            const randomUser= users[Math.floor(Math.random()*users.length)];

            messagesPromise.push(
                Message.create({
                    chat: chatId,
                    sender: randomUser,
                    content: faker.lorem.sentence(),
                })
            );
        }
        await Promise.all(messagesPromise);
        console.log("Messages Created", numMessages);
        process.exit();
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
};

export {createSingleChats, createGroupChats, createMessages, createMessagesInAChat};