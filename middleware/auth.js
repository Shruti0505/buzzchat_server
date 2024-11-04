import { CHAT_TOKEN } from "../constants/config.js";
import { TryCatch } from "../middleware/error.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken"; // Import jsonwebtoken
import { User } from "../models/user.js";
import { adminSecretKey } from "../app.js";

const isAuthenticated = TryCatch(async (req, res, next) => {
    const token = req.cookies[CHAT_TOKEN];

    if (!token) {
        return next(new ErrorHandler("Please login to access this route", 401));
    }
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    console.log(decodedData);
    req.user = decodedData._id;

    next();
});

const adminOnly = TryCatch(async (req, res, next) => {
    const token = req.cookies["admin-token"];

    if (!token) {
        return next(new ErrorHandler("Only admin can access this route", 401));
    }
    const secretKey = jwt.verify(token, process.env.JWT_SECRET);

 
    const isMatched= secretKey === adminSecretKey;

    if(!isMatched) return next(new ErrorHandler("Invalid Secret Key", 401));


    next();
});



const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return next(new ErrorHandler("You are not authorized to access this route", 403));
    }
    next();
};

const socketAuthenticator=async (err,socket,next) =>{
    try{
        if (err) return next(err)
            const authToken= socket.request.cookies[CHAT_TOKEN];
        if (!authToken) {
            return next(new ErrorHandler("Please login to access this route", 401));
        }
        const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);
        const user= await User.findById(decodedData._id);
        if(!user) return next(new ErrorHandler("Please login to access this route", 401));
        socket.user = user;
        return next();

    }
    catch(error){
        return next(new ErrorHandler("Please login to access this route", 401));
    }
};



export { isAuthenticated, isAdmin, socketAuthenticator , adminOnly};