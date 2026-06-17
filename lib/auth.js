const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: EXPIRES_IN });

const verifyToken = (token) => jwt.verify(token, SECRET);

const checkPassword = (plain, hashed) => bcrypt.compareSync(plain, hashed);
const hashPassword = (plain) => bcrypt.hashSync(plain, 10);

// Wrap async route handlers so rejected promises become clean 500s.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { signToken, verifyToken, checkPassword, hashPassword, asyncHandler };
