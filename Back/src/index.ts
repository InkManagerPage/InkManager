import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cloudinary from "./config/cloudinary.js";
import { upload } from "./middlewares/multer.js";
import { resenasRouter } from "./routes/resenas.routes.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use("/api/resenas", resenasRouter);
app.use("/api/auth", authRoutes);

// Endpoint de verificación de estado
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend InkManager corriendo correctamente",
  });
});

// Endpoint de prueba para subir una imagen a Cloudinary
app.post("/api/upload", upload.single("imagen"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió ninguna imagen" });
    }

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const uploadResponse = await cloudinary.uploader.upload(dataURI, {
      folder: "inkmanager/referencias",
    });

    return res.status(200).json({
      message: "Imagen subida exitosamente a Cloudinary",
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });
  } catch (error) {
    console.error("Error al subir imagen:", error);
    return res
      .status(500)
      .json({ error: "Error interno al procesar la imagen" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
