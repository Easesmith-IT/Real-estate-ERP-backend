const jwt = require("jsonwebtoken");

const { createHttpError } = require("../utils/http");
const { getUserById, getRolePermissions } = require("../services/erp.service");

const DEMO_JWT_SECRET = process.env.JWT_SECRET || "real-estate-erp-demo-secret";

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    designation: user.designation,
    permissions: getRolePermissions(user.role),
  };
};

const signDemoToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    DEMO_JWT_SECRET,
    { expiresIn: "7d" },
  );

const resolveTokenUser = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, DEMO_JWT_SECRET);
    return getUserById(decoded.sub);
  } catch (error) {
    return null;
  }
};

const attachCurrentUser = (req, res, next) => {
  const explicitDemoUserId = req.headers["x-demo-user-id"];
  const tokenUser = resolveTokenUser(req);
  const fallbackUser = getUserById(explicitDemoUserId) || tokenUser || getUserById("user-manager");

  if (!fallbackUser) {
    return next(createHttpError(401, "No active ERP session could be resolved"));
  }

  req.user = sanitizeUser(fallbackUser);
  return next();
};

const requirePermission = (permission) => (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(createHttpError(401, "Authentication required"));
  }

  if (user.permissions.includes("*") || user.permissions.includes(permission)) {
    return next();
  }

  return next(createHttpError(403, `Permission denied for ${permission}`));
};

module.exports = {
  attachCurrentUser,
  requirePermission,
  sanitizeUser,
  signDemoToken,
};
