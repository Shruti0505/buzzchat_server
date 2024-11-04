import mongoose, { Schema, model ,Types} from "mongoose";


const schema= new Schema({
    status: {type:String, default: "pending", enum: ["accepted", "pending", "rejected"]},
    sender: { type: Types.ObjectId, ref: "User", required: true },
    receiver:{ type: Types.ObjectId, ref: "User", required: true },
},
{
    timestamps: true,
}
);


    export const Request = mongoose.models.Request || model("Request", schema);