import multer from "multer";

export const multerUpload = multer({
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
});

const singleAvatar = multerUpload.single("avatar");
const attachementsMulter = multerUpload.array("files",5);


export { singleAvatar, attachementsMulter };