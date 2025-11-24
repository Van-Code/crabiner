import logger from "../utils/logger.js";
import { config } from "../config/env.js";

export function errorHandler(err, req, res, next) {
  // Log error details
  logger.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let message = "An unexpected error occurred";

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Invalid input data";
  } else if (err.code === "23505") {
    // PostgreSQL unique violation
    statusCode = 409;
    message = "Resource already exists";
  } else if (err.code === "23503") {
    // PostgreSQL foreign key violation
    statusCode = 404;
    message = "Referenced resource not found";
  }

  // In production, don't leak error details
  const response = {
    error: message,
  };

  if (config.nodeEnv !== "production") {
    response.details = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
