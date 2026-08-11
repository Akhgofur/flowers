import mongoose from "mongoose";
import { env } from "@/lib/env";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var __nafisFlowersMongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.__nafisFlowersMongooseCache ?? {
  connection: null,
  promise: null,
};

if (!globalThis.__nafisFlowersMongooseCache) {
  globalThis.__nafisFlowersMongooseCache = cached;
}

const connectionOptions = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 8_000,
  maxPoolSize: 10,
};

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.connection) return cached.connection;

  if (!cached.promise) {
    cached.promise = mongoose.connect(env.MONGODB_URI, connectionOptions);
  }

  try {
    cached.connection = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.connection;
}
