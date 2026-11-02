
import { MongoClient } from "mongodb";
import "dotenv/config";

const client = new MongoClient(process.env.mongodb_url);

const db = client.db("studioSpaceDB");

export { client, db };
