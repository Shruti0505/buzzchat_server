import { envMode } from "../app.js";

const errorMiddleware = (err, req, res, next) => {
    err.message ||= "Internal Server Error";
    err.statusCode ||= 500;

    if(err.code === 11000){
        err.message = `Duplicate Field ${Object.keys(err.keyPattern).join(",")} entered`;
        err.statusCode = 400;
    }

    if(err.name === "CastError"){
        err.message = `Resource not found. Invalid: ${err.path}`;
        err.statusCode = 404;
    }

    const response= {
        success: false,
        message: err.message,
    }

    if(envMode === "DEVELOPMENT"){
        response.error = err;
    }

    return res.status(err.statusCode).json(response);
};

const TryCatch=(passedFunc)=> async (req,res,next) => {
    try {
        await passedFunc(req,res,next);
    } catch (error) {
        next(error);
    }
};

export { errorMiddleware, TryCatch};