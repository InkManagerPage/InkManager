import multer from "multer";
import { HttpError } from "../errors/http-error.js";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5 MB
  fileFilter: (_req, file, done) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      done(new HttpError(400, "Usá una imagen JPG, PNG o WebP."));
      return;
    }
    done(null, true);
  },
});
