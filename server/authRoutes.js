
const express = require("express");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

// Create the data folder if it doesn't exist.
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create the users file if it doesn't exist.
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]", "utf8");
}

function readUsers() {
  const data = fs.readFileSync(USERS_FILE, "utf8");
  return JSON.parse(data);
}

function saveUsers(users) {
  const temporaryFile = `${USERS_FILE}.tmp`;

  fs.writeFileSync(
    temporaryFile,
    JSON.stringify(users, null, 2),
    "utf8"
  );

  fs.renameSync(temporaryFile, USERS_FILE);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({
      error: "You must be logged in.",
    });
  }

  next();
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// -------------------------------------
// SIGN UP
// POST /api/auth/signup
// -------------------------------------

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        error: "Name, email, and password are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = normalizeEmail(email);

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        error: "Name must contain 2 to 100 characters.",
      });
    }

    if (
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        error: "Please enter a valid email address.",
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        error: "Password must contain 8 to 72 characters.",
      });
    }

    const users = readUsers();

    const existingUser = users.find(
      (user) => user.email === cleanEmail
    );

    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    // Save the user ID in the session.
    req.session.regenerate((sessionError) => {
      if (sessionError) {
        console.error("Session error:", sessionError);

        return res.status(500).json({
          error: "Account created, but login failed. Please log in.",
        });
      }

      req.session.userId = newUser.id;

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save error:", saveError);

          return res.status(500).json({
            error: "Account created, but login failed. Please log in.",
          });
        }

        return res.status(201).json({
          success: true,
          message: "Account created successfully.",
          user: publicUser(newUser),
        });
      });
    });
  } catch (error) {
    console.error("Sign up error:", error);

    return res.status(500).json({
      error: "Could not create your account.",
    });
  }
});

// -------------------------------------
// LOGIN
// POST /api/auth/login
// -------------------------------------

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const cleanEmail = normalizeEmail(email);
    const users = readUsers();

    const user = users.find(
      (item) => item.email === cleanEmail
    );

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        console.error("Session error:", sessionError);

        return res.status(500).json({
          error: "Could not start your session.",
        });
      }

      req.session.userId = user.id;

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save error:", saveError);

          return res.status(500).json({
            error: "Could not start your session.",
          });
        }

        return res.json({
          success: true,
          message: "Logged in successfully.",
          user: publicUser(user),
        });
      });
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Could not log in.",
    });
  }
});

// -------------------------------------
// CURRENT USER
// GET /api/auth/me
// -------------------------------------

router.get("/me", requireAuth, (req, res) => {
  try {
    const users = readUsers();

    const user = users.find(
      (item) => item.id === req.session.userId
    );

    if (!user) {
      return res.status(401).json({
        error: "Your session is no longer valid.",
      });
    }

    return res.json({
      success: true,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Current user error:", error);

    return res.status(500).json({
      error: "Could not load your account.",
    });
  }
});

// -------------------------------------
// CHANGE PASSWORD
// POST /api/auth/change-password
// -------------------------------------

router.post(
  "/change-password",
  requireAuth,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } =
        req.body || {};

      if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string"
      ) {
        return res.status(400).json({
          error: "Both passwords are required.",
        });
      }

      if (
        newPassword.length < 8 ||
        newPassword.length > 72
      ) {
        return res.status(400).json({
          error: "New password must contain 8 to 72 characters.",
        });
      }

      const users = readUsers();

      const userIndex = users.findIndex(
        (item) => item.id === req.session.userId
      );

      if (userIndex === -1) {
        return res.status(401).json({
          error: "User not found.",
        });
      }

      const user = users[userIndex];

      const validPassword = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!validPassword) {
        return res.status(400).json({
          error: "Current password is incorrect.",
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          error: "New password must be different.",
        });
      }

      users[userIndex].passwordHash =
        await bcrypt.hash(newPassword, 12);

      saveUsers(users);

      return res.json({
        success: true,
        message: "Password changed successfully.",
      });
    } catch (error) {
      console.error("Change password error:", error);

      return res.status(500).json({
        error: "Could not change your password.",
      });
    }
  }
);

// -------------------------------------
// LOGOUT
// POST /api/auth/logout
// -------------------------------------

router.post("/logout", (req, res) => {
  if (!req.session) {
    return res.json({
      success: true,
      message: "Logged out successfully.",
    });
  }

  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);

      return res.status(500).json({
        error: "Could not log out.",
      });
    }

    res.clearCookie("learnquest.sid");

    return res.json({
      success: true,
      message: "Logged out successfully.",
    });
  });
});


router.post("/change-email", requireAuth, async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body || {};

    if (
      typeof newEmail !== "string" ||
      typeof currentPassword !== "string"
    ) {
      return res.status(400).json({
        error: "New email and current password are required.",
      });
    }

    const cleanEmail = normalizeEmail(newEmail);

    if (
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        error: "Please enter a valid email address.",
      });
    }

    const users = readUsers();

    const userIndex = users.findIndex(
      (user) => user.id === req.session.userId
    );

    if (userIndex === -1) {
      return res.status(401).json({
        error: "User not found.",
      });
    }

    const user = users[userIndex];

    const validPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!validPassword) {
      return res.status(400).json({
        error: "Current password is incorrect.",
      });
    }

    if (user.email === cleanEmail) {
      return res.status(400).json({
        error: "This is already your current email.",
      });
    }

    const emailExists = users.some(
      (item) =>
        item.email === cleanEmail &&
        item.id !== user.id
    );

    if (emailExists) {
      return res.status(409).json({
        error: "This email is already registered.",
      });
    }

    users[userIndex].email = cleanEmail;

    saveUsers(users);

    return res.json({
      success: true,
      message: "Email changed successfully.",
      user: publicUser(users[userIndex]),
    });
  } catch (error) {
    console.error("Change email error:", error);

    return res.status(500).json({
      error: "Could not change your email.",
    });
  }
});


module.exports = router;
module.exports.requireAuth = requireAuth;
