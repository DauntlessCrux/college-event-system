// Custom error type controllers/services can throw with an explicit
// HTTP status code, e.g. `throw new ApiError(409, 'Already registered')`
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Must be registered LAST, after all routes.
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  // Postgres unique_violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'This record already exists (duplicate entry).' });
  }

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: err.message || 'Internal server error',
  });
}

module.exports = { ApiError, notFound, errorHandler };
