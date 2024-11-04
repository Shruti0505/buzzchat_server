
import { body, validationResult ,param} from "express-validator";

const validateHandler = (req,res,next)=>{
    const errors = validationResult(req);

    const errorMessages = errors.array().map((error) => error.msg).join(", ");

    if(errors.isEmpty()) return next();
    else next(new Error(errorMessages, 400));
}


const registerValidator=()=>[
    body("name", "PLease enter name").notEmpty(),
    body("username", "PLease enter username").notEmpty(),
    body("password", "PLease enter password").notEmpty(),
    body("bio", "PLease enter bio").notEmpty(),
    // check("avatar").notEmpty().withMessage("Please upload an image"),
];

const loginValidator=()=>[
    body("username", "PLease enter username").notEmpty(),
    body("password", "PLease enter password").notEmpty(),
];

const newGroupChatValidator=()=>[
    body("name", "PLease enter name").notEmpty(),
    body("members", "PLease enter members").notEmpty().withMessage("Enter members").
    isArray({min:2, max:100})
    .withMessage("Members must be least 2 "),
];

const addMemberValidator=()=>[
    body("chatId", "PLease enter chat Id").notEmpty(),
    body("members").notEmpty().withMessage("Enter members").
    isArray({min:1, max:100})
    .withMessage("Members must be least 1 "),
];

const removeMemberValidator=()=>[
    body("chatId", "PLease enter chat Id").notEmpty(),
    body("userId", "Please enter user Id").notEmpty(),
];

// const leaveGroupValidator=()=>[
//     param("id", "PLease enter chat Id").notEmpty(),
// ];

const sendAttachmentsValidator=()=>[
    body("chatId", "PLease enter chat Id").notEmpty(),
    // check("files").notEmpty().withMessage("please upload files").isArray({min:1, max:5}).withMessage("Please upload files")
];

const chatIdValidator=()=>[
    param("id", "PLease enter chat Id").notEmpty(),

];

const renameValidator=()=>[
    param("id", "PLease enter chat Id").notEmpty(),
    body("name", "PLease enter new name").notEmpty(),
];

const sendRequestValidator=()=>[
    body("userId", "PLease enter user Id ").notEmpty(),
];

const acceptRequestValidator=()=>[
    body("requestId", "PLease enter request Id ").notEmpty(),
    body("accept", "PLease enter accept").notEmpty().isBoolean()
    .withMessage("Accept must be boolean"),
];

const adminLoginValidator=()=>[
    body("secretKey", "PLease enter secret key").notEmpty(),
];

export {registerValidator, validateHandler, loginValidator, newGroupChatValidator,
    addMemberValidator, removeMemberValidator,sendAttachmentsValidator,
    chatIdValidator, renameValidator, sendRequestValidator,acceptRequestValidator,
    adminLoginValidator,
};