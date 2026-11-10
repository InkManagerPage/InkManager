import multer from "multer";
import { HttpError } from "../errors/http-error.js";

const opciones: multer.Options = {
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, done) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      done(new HttpError(400, "Usá una imagen JPG, PNG o WebP."));
      return;
    }
    done(null, true);
  },
};

export const upload = multer({ ...opciones, limits: { fileSize: 2 * 1024 * 1024 } });
export const uploadSolicitud = multer({
  ...opciones,
  limits: { fileSize: 2 * 1024 * 1024, files: 2, fields: 14, fieldSize: 8192 },
});
