import { validationResult } from "express-validator";

export function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
}

// Additional custom validators
export const validators = {
  isValidLocation: (value) => {
    const forbidden = ["<", ">", "script", "javascript:"];
    return !forbidden.some((word) => value.toLowerCase().includes(word));
  },
};
