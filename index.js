// import express from "express";
// import { MongoClient } from "mongodb";
// import cors from "cors";
// import "dotenv/config";

// const app = express();
// const PORT = process.env.PORT || 8000;

// // Middleware
// app.use(cors({
//   origin: "http://localhost:3000",
// }));

// app.use(express.json());

// // MongoDB connection
// const client = new MongoClient(process.env.mongodb_url);

// const db = client.db("studioSpaceDB");
// const studioCollection = db.collection("studios");

// // Connect to MongoDB
// async function connectToMongoDB() {
//   await client.connect();
//   console.log("Successfully connected to MongoDB!");
// }

// // Home route
// app.get("/", (req, res) => {
//   res.send("Spacestudio API is running!");
// });

// // Add destination API
// app.post("/add-studio", async (req, res) => {
//   try {
//     console.log("API called");

    

    

    

    

//     // Save data to MongoDB
//     const result = await studioCollection.insertOne(studios);

//     // Send response to frontend
//     res.status(201).json({
//       message: "Studio package added successfully!",
//       insertedId: result.insertedId,
//     });
//   } catch (error) {
//     console.error("Error adding studios:", error);

//     res.status(500).json({
//       message: "Failed to save travel package.",
//     });
//   }
// });

// // Start server after connecting to MongoDB
// async function startServer() {
//   try {
//     await connectToMongoDB();

//     app.listen(PORT, () => {
//       console.log(`Server is running on port ${PORT}`);
//     });
//   } catch (error) {
//     console.error("Failed to connect to MongoDB:", error);
//     process.exit(1);
//   }
// }

// startServer();


import express from "express";
import cors from "cors";
import "dotenv/config";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";
import { client, db } from "./db.js";
import { ObjectId } from "mongodb";


const app = express();
const PORT = process.env.PORT || 8000;

// MongoDB collection
const studioCollection = db.collection("studios");
// Bookings collection
const bookingCollection = db.collection("bookings");

// 1. CORS Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// 2. Better Auth Handler
app.all("/api/auth/{*any}", toNodeHandler(auth));

// 3. JSON Middleware
app.use(express.json());

// Authentication Middleware
async function verifyUser(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }

    req.user = session.user;

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
}

// 4. Home Route
app.get("/", (req, res) => {
  res.send("StudioSpace API is running!");
});


// 5. Featured Studios API - Get 6 Studios
app.get("/api/studios/featured", async (req, res) => {
  try {
    const featuredStudios = await studioCollection
      .find({})
      .limit(6)
      .toArray();

    res.status(200).json({
      success: true,
      count: featuredStudios.length,
      studios: featuredStudios,
    });
  } catch (error) {
    console.error("Error fetching featured studios:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch featured studios.",
    });
  }
});



// 6. Get All Studios API
app.get("/api/studios", async (req, res) => {
  try {
    const studios = await studioCollection
      .find({})
      .sort({ _id: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: studios.length,
      studios: studios,
    });
  } catch (error) {
    console.error("Error fetching studios:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch studios.",
    });
  }
});


// Get Single Studio API
app.get("/api/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check whether the ID is valid
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    // Find studio by MongoDB ID
    const studio = await studioCollection.findOne({
      _id: new ObjectId(id),
    });

    // If studio does not exist
    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found.",
      });
    }

    res.status(200).json({
      success: true,
      studio: studio,
    });
  } catch (error) {
    console.error("Error fetching studio:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch studio.",
    });
  }
});



// Delete a studio listing
app.delete("/api/studios/:id", verifyUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    // Delete only the studio owned by the logged-in user
    const result = await studioCollection.deleteOne({
      _id: new ObjectId(id),
      ownerEmail: req.user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Studio not found or you are not authorized to delete it.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Studio deleted successfully.",
    });
  } catch (error) {
    console.error("Delete studio error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete studio.",
    });
  }
});



// 6. Add Studio API
// app.post("/add-studio", async (req, res) => {
//   try {
//     const studio = req.body;

//     if (!studio || Object.keys(studio).length === 0) {
//       return res.status(400).json({
//         message: "Studio data is required.",
//       });
//     }

//     const result = await studioCollection.insertOne(studio);

//     res.status(201).json({
//       message: "Studio added successfully!",
//       insertedId: result.insertedId,
//     });
//   } catch (error) {
//     console.error("Error adding studio:", error);

//     res.status(500).json({
//       message: "Failed to save studio.",
//     });
//   }
// });


// Create Booking API
app.post("/api/bookings", verifyUser, async (req, res) => {
  try {
    const {
      studioId,
      bookingDate,
      startTime,
      endTime,
    } = req.body;

    // 1. Validate required fields
    if (!studioId || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "All booking fields are required.",
      });
    }

    // 2. Validate Studio ID
    if (!ObjectId.isValid(studioId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    // 3. Validate date and time formats
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date or time format.",
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "End time must be later than start time.",
      });
    }

    // 4. Find Studio
    const studio = await studioCollection.findOne({
      _id: new ObjectId(studioId),
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found.",
      });
    }

    // 5. Check overlapping bookings
    const existingBooking = await bookingCollection.findOne({
      studioId: new ObjectId(studioId),
      bookingDate,
      status: { $in: ["Pending", "Confirmed"] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: "This studio is already booked for this time.",
      });
    }

    // 6. Calculate total price
    const startMinutes =
      Number(startTime.slice(0, 2)) * 60 +
      Number(startTime.slice(3, 5));

    const endMinutes =
      Number(endTime.slice(0, 2)) * 60 +
      Number(endTime.slice(3, 5));

    const totalHours = (endMinutes - startMinutes) / 60;

    const totalPrice = totalHours * studio.hourlyRate;

    // 7. Create Booking Document
    const booking = {
      studioId: new ObjectId(studioId),
      studioTitle: studio.title,

      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,

      ownerEmail: studio.ownerEmail,

      bookingDate,
      startTime,
      endTime,

      totalHours,
      hourlyRate: studio.hourlyRate,
      totalPrice,

      status: "Pending",

      createdAt: new Date(),
    };

    // 8. Save Booking in MongoDB
    const result = await bookingCollection.insertOne(booking);

    res.status(201).json({
      success: true,
      message: "Booking created successfully!",
      bookingId: result.insertedId,
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create booking.",
    });
  }
});

// Get logged-in user's bookings
app.get("/api/bookings", verifyUser, async (req, res) => {
  try {
    const userBookings = await bookingCollection
      .find({
        userId: req.user.id,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      totalBookings: userBookings.length,
      bookings: userBookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings.",
    });
  }
});


// Cancel a booking
app.delete("/api/bookings/:id", verifyUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate booking ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    // Find booking belonging to the logged-in user
    const booking = await bookingCollection.findOne({
      _id: new ObjectId(id),
      userId: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Only Pending bookings can be cancelled
    if (booking.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending bookings can be cancelled.",
      });
    }

    // Update booking status
    await bookingCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "Cancelled",
          cancelledAt: new Date(),
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
    });

  } catch (error) {
    console.error("Cancel booking error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel booking.",
    });
  }
});


app.post("/api/studios", verifyUser, async (req, res) => {
  try {
    const {
  title,
  category,
  hourlyRate,
  securityDeposit,
  maxCapacity,
  location,
  imageUrl,
  images,
  amenities,
  overview,
} = req.body;
    // Validate required fields
    if (
      !title ||
      !category ||
      hourlyRate === undefined ||
      securityDeposit === undefined ||
      maxCapacity === undefined ||
      !location ||
      !imageUrl ||
      !overview
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required studio information.",
      });
    }

    // Validate numeric fields
    const rate = Number(hourlyRate);
    const deposit = Number(securityDeposit);
    const capacity = Number(maxCapacity);

    if (
      !Number.isFinite(rate) ||
      rate <= 0 ||
      !Number.isFinite(deposit) ||
      deposit < 0 ||
      !Number.isInteger(capacity) ||
      capacity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid studio pricing and capacity.",
      });
    }

    // Save studio information
    const newStudio = {
      title: title.trim(),
      category,
      hourlyRate: rate,
      securityDeposit: deposit,
      maxCapacity: capacity,
      location: location.trim(),
      imageUrl: imageUrl.trim(),
      images: Array.isArray(images) ? images : [],
      amenities: Array.isArray(amenities) ? amenities : [],
      overview: overview.trim(),

      // Owner information comes from authenticated session
      ownerName: req.user.name,
      ownerEmail: req.user.email,

      createdAt: new Date(),
    };

    const result = await studioCollection.insertOne(newStudio);

    res.status(201).json({
      success: true,
      message: "Studio added successfully!",
      insertedId: result.insertedId,
    });

  } catch (error) {
    console.error("Add studio error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add studio.",
    });
  }
});


// Get logged-in user's studio listings
app.get("/api/my-listings", verifyUser, async (req, res) => {
  try {
    const myStudios = await studioCollection
      .find({
        ownerEmail: req.user.email,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      totalStudios: myStudios.length,
      studios: myStudios,
    });

  } catch (error) {
    console.error("My listings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch your studio listings.",
    });
  }
});



// Update a studio listing
app.put("/api/studios/:id", verifyUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const {
      title,
      category,
      hourlyRate,
      securityDeposit,
      maxCapacity,
      location,
      imageUrl,
      images,
      amenities,
      overview,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !category ||
      hourlyRate === undefined ||
      securityDeposit === undefined ||
      maxCapacity === undefined ||
      !location ||
      !imageUrl ||
      !overview ||
      !Array.isArray(amenities)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required studio information.",
      });
    }

    const rate = Number(hourlyRate);
    const deposit = Number(securityDeposit);
    const capacity = Number(maxCapacity);

    if (
      !Number.isFinite(rate) ||
      !Number.isFinite(deposit) ||
      !Number.isInteger(capacity) ||
      rate < 0 ||
      deposit < 0 ||
      capacity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid numeric values.",
      });
    }

    const updatedStudio = {
      title,
      category,
      hourlyRate: rate,
      securityDeposit: deposit,
      maxCapacity: capacity,
      location,
      imageUrl,
      amenities,
      overview,
      updatedAt: new Date(),
    };

    const result = await studioCollection.updateOne(
      {
        _id: new ObjectId(id),
        ownerEmail: req.user.email,
      },
      {
        $set: updatedStudio,
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Studio not found or you are not authorized to update it.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Studio updated successfully.",
    });
  } catch (error) {
    console.error("Update studio error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update studio.",
    });
  }
});





// 9. Start Server
async function startServer() {
  try {
    await client.connect();

    console.log("Successfully connected to MongoDB!");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
