import jwt, { DecodeOptions, SignOptions, VerifyOptions } from "jsonwebtoken";

type Token = object | string;

export const hashToken = <T extends Token>(
  data: T,
  secretKey: string,
  signOptions?: SignOptions
): string => {
  return jwt.sign(data, secretKey, signOptions);
};

export const verifyToken = (
  token: string,
  secretKey: string,
  verifyOptions?: VerifyOptions
) => {
  return jwt.verify(token, secretKey, verifyOptions);
};

export const decodeToken = (token: string, decodeOptions?: DecodeOptions) => {
  return jwt.decode(token, decodeOptions);
};
