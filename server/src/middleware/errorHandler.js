import { ZodError } from 'zod';
import { errorResponse } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Application Error:', err);

  // Zod validation error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return errorResponse(res, 'Validation error', 400, formattedErrors);
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const target = err.meta?.target || 'Field';
    return errorResponse(res, `A record with this ${target} already exists.`, 409);
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return errorResponse(res, 'Requested record was not found.', 404);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token. Authorization denied.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired. Please log in again.', 401);
  }

  // Default fallback
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return errorResponse(res, message, statusCode);
};

