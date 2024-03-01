const errorMiddleware = (error, req, res, next) => {
  console.log(error.stack);
  res.status(500).json({
    message: error.message || "Internal Server Error",
  });
};

export default errorMiddleware;
