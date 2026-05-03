import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  const statusCode = message.includes("not found") ? 404 : 400;

  res.status(statusCode).json({
    error: message,
  });
};