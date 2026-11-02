
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { client, db } from "./db.js";

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),

  emailAndPassword: {
  enabled: true,
  minPasswordLength: 6,
},
  trustedOrigins: ["http://localhost:3000"],
});
