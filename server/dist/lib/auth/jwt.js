// src/lib/auth/jwt.ts
import jwt from "jsonwebtoken";
var hashToken = (data, secretKey, signOptions) => {
  return jwt.sign(data, secretKey, signOptions);
};
var verifyToken = (token, secretKey, verifyOptions) => {
  return jwt.verify(token, secretKey, verifyOptions);
};
var decodeToken = (token, decodeOptions) => {
  return jwt.decode(token, decodeOptions);
};
export {
  decodeToken,
  hashToken,
  verifyToken
};
