const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const sendSuccess = (res, data, message = "OK", meta) => {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(200).json(payload);
};

module.exports = {
  createHttpError,
  sendSuccess,
};
