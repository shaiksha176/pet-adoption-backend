import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { checkIfEmailExists } from "../utils/helper.js";

const router = express.Router();

// add user
router.post("/", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "some  fields are missing",
      });
    }

    const existingUser = await checkIfEmailExists(email);

    if (existingUser) {
      return res.status(409).json({
        message: "this email is already in use",
      });
    }

    // Create a new user instance
    const newUser = new User({
      username,
      email,
      password,
    });

    // Save the new user to the database
    const savedUser = await newUser.save();

    // Respond with the saved user object
    res.status(201).json(savedUser);
  } catch (error) {
    console.log("error caught in add user ", error);
    next(error);
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);
  try {
    // Find user by email
    const user = await User.findOne({
      email,
      password,
    }).exec();
    console.log(user);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate a JWT token with a 7-day expiration
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      "your-secret-key",
      { expiresIn: "7d" },
    );

    res.status(200).json({
      token: token,
      id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/all", async (req, res) => {
  const users = await User.find().populate({
    path: "adoptionHistory",
    select: "name",
  });
  res.json(users);
});

// delete user account
router.delete("/", (req, res) => {
  // TODO: Add logic to delete user account
});

// update user account
router.put("/:id", (req, res) => {
  // TODO: Add logic to update user account by ID
  // This code can not only be used to update user details, but also the adoption and fostering details when adopting/fostering a pet
});

// fetch user details
router.get("/:id", (req, res) => {
  // TODO: Add logic to fetch user details by ID
  // This code contains adoption and foster history of user as well
});

// get all users
router.get("/", (req, res) => {
  // TODO: Add logic to get all users
  // This code contains adoption and foster history of all users as well
});

export default router;
