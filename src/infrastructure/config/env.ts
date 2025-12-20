import dotenv from "dotenv";

dotenv.config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  BOOTSTRAP_PLATFORM_SECRET: process.env.BOOTSTRAP_PLATFORM_SECRET ?? "",
};
