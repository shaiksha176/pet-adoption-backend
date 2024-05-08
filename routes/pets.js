import express from "express";
import multer from "multer";
import AWS from "aws-sdk";
import fs from "fs";
import path from "path";
import Pet from "../models/pets.js";
import User from "../models/user.js";
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/"); // Create a folder named 'uploads' in your project directory
//   },
//   filename: function (req, file, cb) {
//     cb(
//       null,
//       file.fieldname + "-" + Date.now() + path.extname(file.originalname),
//     );
//   },
// });
const storage = multer.memoryStorage(); // Use memory storage for uploading to S3 directly

const upload = multer({ storage });

const router = express.Router();
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
})

// add a new pet
router.post("/", upload.single("image"), async (req, res) => {
  const {
    name,
    age,
    category,
    gender,
    breed,
    size,
    color,
    personality,
    description,
    uploadedBy,
  } = req.body;

  try {
    console.log(req.body);
    console.log(req.file);

    // Download the file from the URI and convert it to a buffer
    // const response = await axios.get(uri, { responseType: "arraybuffer" });
    // const fileBuffer = Buffer.from(response.data, "binary");
    // console.log("buffer file => ", fileBuffer);

    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `${Date.now()}-${req.file.originalname}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      // ACL: "public-read", // Adjust permissions as needed
    };

    console.log("s3 params ",params)

    const uploadImageToS3 = new Promise((resolve, reject) => {
      s3.upload(params, (error, data) => {
        if (error) {
          console.log(error)
          reject({
            success: false,
            message: "Error uploading to S3",
          });
        } else {
          resolve({
            success: true,
            message: "File uploaded successfully to S3!",
            image_url: data.Location,
          });
        }
      });
    });

    const s3Response = await uploadImageToS3;

    const pet = new Pet({
      name,
      age,
      category,
      gender,
      breed,
      size,
      color,
      personality,
      description,
      uploadedBy,
      images: [s3Response.image_url],
    });

    const savedPet = await pet.save();
    // await savedPet.populate({
    //   path: "uploadedBy",
    //   select: "username email _id",
    // });

    // console.log(savedPet);
    res.status(201).json(savedPet);

    // s3.upload(params, (error, data) => {
    //   if (error) {
    //     console.error("Error uploading to S3:", error);
    //     res
    //       .status(500)
    //       .json({ success: false, error: "Error uploading to S3" });
    //   } else {
    //     console.log("File uploaded to S3:", data.Location);
    //     res.json({ success: true, s3Url: data.Location });
    //   }
    // });
    // res.json({ message: "saved to db" });
  } catch (error) {
    console.log("Error in adding pet ", error);
    res.sendStatus(500);
  }
});

// delete a pet
router.delete("/:id", (req, res) => {
  // TODO: Add logic to delete a pet by ID
});

// Update pet information route
router.put("/:id", async (req, res) => {
  try {
    const petId = req.params.id;
    const updateData = req.body;

    // Find the pet by ID and update the information
    const updatedPet = await Pet.findByIdAndUpdate(
      petId,
      { $set: updateData },
      { new: true }, // Return the updated pet
    );

    if (!updatedPet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    res.status(200).json({
      message: "Pet information updated successfully",
      pet: updatedPet,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// get details of a specific pet
router.get("/:id", async (req, res) => {
  try {
    const petId = req.params.id;

    // Find pet by ID and populate user details for various fields
    const pet = await Pet.findById(petId)
      .populate({
        path: "uploadedBy",
        select: "username email",
      })
      .populate({
        path: "adoptionHistory",
        populate: { path: "user", ref: "User", select: "username email _id" }, // Specify ref and select
      })
      .populate({
        path: "fosteringHistory",
        populate: { path: "user", ref: "User", select: "username email _id" }, // Specify ref and select
      })
      .populate({
        path: "requests",
        populate: { path: "user", ref: "User", select: "username email _id" }, // Specify ref and select
      });
    if (!pet) {
      return res.status(404).json({
        success: true,
        message: "Pet not found",
      });
    }

    res.status(200).json({ data: pet, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// get a list of all available pets
router.get("/", async (req, res) => {
  try {
    const pets = await Pet.find().populate({
      path: "uploadedBy",
      select: "username email",
    });
    if (!pets || pets.length === 0) {
      return res.status(404).json({
        success: true,
        message: "No pets found for the given user ID",
      });
    }
    res.status(200).json(pets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// route to update the adoption history of a pet
router.put("/:id/adopt", async (req, res) => {
  try {
    const petId = req.params.id;
    const { userId } = req.body;

    // Find the pet by ID
    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found", success: false });
    }

    console.log("user id => ", userId);
    // Find the user by ID
    const user = await User.findById(userId);
    console.log("user details => ", user);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    // Create an adoption record with current and previous owner details
    const adoptionRecord = {
      previousOwner: pet.uploadedBy, // Assuming current owner is the one who uploaded the pet for adoption
      currentOwner: userId,
      adoptionDate: new Date(),
    };
    // Add the adoption record to the adoption history array
    pet.adoptionHistory.push(adoptionRecord);
    pet.requests = [];
    // Update the pet's uploadedBy to the new owner
    pet.uploadedBy = userId;

    // Update the pet's status to "Available" (or any other suitable status)
    pet.status = "Adopted";

    // Save the updated pet to the database
    await pet.save();

    res
      .status(200)
      .json({ message: "Pet put up for adoption successfully", success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", success: false });
  }
});

// route to update the fostering history of a pet
router.put("/:id/foster", async (req, res) => {
  try {
    const petId = req.params.id;
    const { userId } = req.body;

    // Find the pet by ID
    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found", success: false });
    }

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    // Create an adoption record with current and previous owner details
    const fosteringRecord = {
      previousOwner: pet.uploadedBy, // Assuming current owner is the one who uploaded the pet for adoption
      currentOwner: userId,
      fosteringDate: new Date(),
    };
    // Add the adoption record to the adoption history array
    pet.fosteringHistory.push(fosteringRecord);

    // Update the pet's uploadedBy to the new owner
    pet.uploadedBy = userId;

    // Update the pet's status to "Available" (or any other suitable status)
    pet.status = "Fostered";

    // Save the updated pet to the database
    await pet.save();

    res
      .status(200)
      .json({ message: "Pet put up for adoption successfully", success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", success: false });
  }
});

// route to provide info on the pets uploaded by user
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const pets = await Pet.find({ uploadedBy: userId }).populate({
      path: "uploadedBy",
      select: "username email", // Specify the fields you want to retrieve from the User model
    });

    if (!pets || pets.length === 0) {
      return res.status(404).json({
        success: true,
        message: "No pets found for the given user ID",
      });
    }

    res.status(200).json(pets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Route to request adoption or fostering of a pet

// router.post("/:id/request", async (req, res) => {
//   try {
//     const petId = req.params.id;
//     const { userId, requestType } = req.body;

//     // Find the pet by ID
//     const pet = await Pet.findById(petId);

//     if (!pet) {
//       return res.status(404).json({ message: "Pet not found" });
//     }

//     // Check if the pet status is "Available"
//     if (pet.status !== "Available") {
//       return res
//         .status(400)
//         .json({ message: "Pet is not available for adoption or fostering" });
//     }

//     // Find the user by ID
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Add the user to either adoption or fostering history
//     const historyField =
//       requestType === "adoption" ? "adoptionHistory" : "fosteringHistory";

//     // Check if the user has already adopted or fostered the pet
//     const isAlreadyInHistory = pet[historyField].some((entry) =>
//       entry.user.equals(userId),
//     );

//     if (isAlreadyInHistory) {
//       return res
//         .status(400)
//         .json({ message: "User has already adopted or fostered this pet" });
//     }

//     // Add the user to the history array
//     pet[historyField].push({
//       user: userId,
//       requestDate: new Date(),
//     });

//     // Update the pet status based on the request type
//     pet.status = requestType === "adoption" ? "Adopted" : "Fostered";

//     // Save the updated pet to the database
//     await pet.save();

//     res.status(200).json({
//       message: `${requestType} request submitted successfully for the pet`,
//       pet,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

// router.post("/:id/request", async (req, res) => {
//   try {
//     const petId = req.params.id;
//     const { userId, requestType } = req.body;

//     // Find the pet by ID
//     const pet = await Pet.findById(petId);

//     if (!pet) {
//       return res.status(404).json({ message: "Pet not found" });
//     }

//     // Check if the pet status is "Available"
//     if (pet.status !== "Available") {
//       return res
//         .status(400)
//         .json({ message: "Pet is not available for adoption or fostering" });
//     }

//     // Find the user by ID
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Initialize requests array if it doesn't exist
//     if (!pet.requests) {
//       pet.requests = [];
//     }

//     // Add the request to the pet's requests array
//     pet.requests.push({
//       user: userId,
//       requestType,
//       requestDate: new Date(),
//     });

//     // Save the updated pet to the database
//     await pet.save();

//     res.status(200).json({
//       message: `${requestType} request submitted successfully for the pet`,
//       pet,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

router.post("/:id/request", async (req, res) => {
  try {
    const petId = req.params.id;
    const { userId, requestType } = req.body;

    // Find the pet by ID
    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    // Check if the pet status is "Available"
    if (pet.status !== "Available") {
      return res
        .status(400)
        .json({ message: "Pet is not available for adoption or fostering" });
    }

    // Check if the user has already applied
    const existingRequest = pet.requests.find(
      (request) => request.user.toString() === userId,
    );

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "User has already applied for this pet" });
    }

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize requests array if it doesn't exist
    if (!pet.requests) {
      pet.requests = [];
    }

    // Add the request to the pet's requests array
    pet.requests.push({
      user: userId,
      requestType,
      requestDate: new Date(),
    });

    // Save the updated pet to the database
    await pet.save();

    res.status(200).json({
      message: `${requestType} request submitted successfully for the pet`,
      pet,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// route to get all the pets except the users

router.get("/user/not/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find pets excluding those uploaded by the specified user
    const pets = await Pet.find({ uploadedBy: { $ne: userId } }).populate({
      path: "uploadedBy",
      select: "username email",
    });

    if (!pets || pets.length === 0) {
      return res.status(404).json({
        message: "No pets found uploaded by other users",
      });
    }

    res.status(200).json(pets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
