import multer from "multer";

const memoryStorage = multer.memoryStorage({
    filename(req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });

export const uploadToBuffer = multer({ 
    storage :multer.memoryStorage({
        filename(req, file, cb) {
          cb(null, `${Date.now()}-${file.originalname}`);
        }
      })
    });

export const uploadToDisk = multer({
    storage:multer.diskStorage({
        destination: "./public/uploads/",
        filename(req, file, cb) {
          cb(null, `${Date.now()}-${file.originalname}`);
        }
      }),
  });