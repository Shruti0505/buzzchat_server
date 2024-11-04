import mongoose, { Schema, model,Types } from "mongoose";

const schema= new Schema({
    name: { type: String, default: false },
    groupChat: { type: Boolean, required: true },
    creator: { type: Types.ObjectId, ref: "User" },
    members: [{ type: Types.ObjectId, ref: "User" }],
},
{
    timestamps: true,
}
);


    export const Chat = mongoose.models.Chat || model("Chat", schema);