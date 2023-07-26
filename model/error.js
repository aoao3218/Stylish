class NotFoundError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "NotFoundError";
    this.status = status || 404;
  }
}

export default NotFoundError;
