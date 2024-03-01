import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import dotenv from "dotenv";
import AWS from "aws-sdk";
import userRouter from "./routes/user.js";
import petsRouter from "./routes/pets.js";
import errorMiddleware from "./middleware/error.js";

const app = express();
const port = process.env.PORT || 8080;

dotenv.config();

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region: process.env.AWS_REGION,
});

mongoose.connect(process.env.MONGO_URL);
const db = mongoose.connection;
db.on("error", (error) => console.error("MongoDB connection error:", error));
db.once("open", () => console.log("Connected to MongoDB"));
app.use(express.json());
app.use(cors()); // Use cors without parameters to allow all origins
app.use(morgan("dev"));
app.use(express.json());
app.use("/api/users", userRouter);
app.use("/api/pets", petsRouter);

app.get("/", (req, res) => {
  res.send("data sent");
});

app.use(errorMiddleware);

app.listen(port, "0.0.0.0", () =>
  console.log(`Server is running on port: ${port}`),
);
