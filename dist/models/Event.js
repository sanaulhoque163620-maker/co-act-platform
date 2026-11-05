"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const mongoose_1 = require("mongoose");
const eventSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    eventType: { type: String, enum: ["Cleanup", "Plantation", "Donation", "Other"], required: true },
    thumbnailUrl: { type: String, required: true },
    location: { type: String, required: true },
    eventDate: { type: Date, required: true },
    creatorEmail: { type: String, required: true },
    joinedUsers: { type: [String], default: [] }
});
exports.Event = (0, mongoose_1.model)("Event", eventSchema);
