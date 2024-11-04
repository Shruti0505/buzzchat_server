const corsOptions= {
    origin: [
        "http://localhost:5173",
        "http://localhost:4173",
        process.env.CLIENT_URL,
    ],
    methpds: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}

const CHAT_TOKEN = "token";

export { corsOptions, CHAT_TOKEN };