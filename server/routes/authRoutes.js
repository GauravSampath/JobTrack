const express = require("express");

const {
    registerUser,
    loginUser
} = require("../controllers/authController");

const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/profile", authenticateUser, (req, res) => {
    res.json({
        message: "You are authenticated",
        user: req.user
    });
});

module.exports = router;