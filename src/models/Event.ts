import { Schema, model } from "mongoose";

const eventSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  eventType: { type: String, enum: ["Cleanup", "Plantation", "Donation", "Other"], required: true },
  thumbnailUrl: { type: String, required: true },
  location: { type: String, required: true },
  eventDate: { type: Date, required: true },
  creatorEmail: { type: String, required: true },
  joinedUsers: { type: [String], default: [] }
});

export const Event = model("Event", eventSchema);