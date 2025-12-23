import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";
const bootstrapMode = process.env.BOOTSTRAP_MODE === "true";

if (nodeEnv === "production" && bootstrapMode) {
  throw new Error("BOOTSTRAP_MODE is not allowed in production");
}

export const env = {
  NODE_ENV: nodeEnv,
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  // TODO EPIC5: utiliser BOOTSTRAP_PLATFORM_SECRET pour signer tokens bootstrap
  BOOTSTRAP_PLATFORM_SECRET: process.env.BOOTSTRAP_PLATFORM_SECRET ?? "",
  BOOTSTRAP_MODE: bootstrapMode,
};
