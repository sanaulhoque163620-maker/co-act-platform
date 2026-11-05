"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const userSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    photoUrl: { type: String, required: true },
    password: { type: String, required: true }
});
const User = mongoose_1.default.models.User || mongoose_1.default.model("User", userSchema);
const eventSchema = new mongoose_1.default.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    eventType: { type: String, enum: ["Cleanup", "Plantation", "Donation", "Other"], required: true },
    thumbnailUrl: { type: String, required: true },
    location: { type: String, required: true },
    eventDate: { type: Date, required: true },
    creatorEmail: { type: String, required: true },
    joinedUsers: { type: [String], default: [] }
});
const Event = mongoose_1.default.models.Event || mongoose_1.default.model("Event", eventSchema);
mongoose_1.default.connect(process.env.MONGODB_URI)
    .then(async () => {
    const { auth } = await import("./auth.js");
    app.all(/^\/api\/auth\/.*/, async (req, res) => {
        const response = await auth.handler(req);
        return res.status(response.status).send(await response.json());
    });
    app.listen(PORT, () => { });
})
    .catch(() => { });
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ");
    if (!token) {
        res.status(401).json({ message: "Unauthorized missing token" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token[1] || token[0], process.env.JWT_SECRET);
        if (decoded && decoded.email) {
            req.userEmail = decoded.email;
            next();
        }
        else {
            res.status(403).json({ message: "Forbidden invalid payload" });
        }
    }
    catch {
        res.status(403).json({ message: "Forbidden invalid token" });
    }
};
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, photoUrl, password } = req.body;
        if (!name || !email || !photoUrl || !password) {
            res.status(400).json({ message: "All registration fields are required" });
            return;
        }
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        if (!hasUpper || !hasLower || password.length < 6) {
            res.status(400).json({ message: "Password structural parameters unmet" });
            return;
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "Identity ecosystem records conflict" });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = new User({ name, email, photoUrl, password: hashedPassword });
        await newUser.save();
        const token = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.status(201).json({ token, user: { name, email, photoUrl } });
    }
    catch {
        res.status(500).json({ message: "Server fault sequence" });
    }
});
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: "Authentication matrix mismatch" });
            return;
        }
        const user = await User.findOne({ email });
        if (!user) {
            res.status(400).json({ message: "Profile reference non-existent" });
            return;
        }
        const match = await bcryptjs_1.default.compare(password, user.password);
        if (!match) {
            res.status(400).json({ message: "Credential signature invalid" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: { name: user.name, email: user.email, photoUrl: user.photoUrl } });
    }
    catch {
        res.status(500).json({ message: "Internal architecture runtime fault" });
    }
});
app.put("/api/auth/profile", verifyToken, async (req, res) => {
    try {
        const authReq = req;
        const email = authReq.userEmail;
        const { name, photoUrl } = req.body;
        if (!name || !photoUrl) {
            res.status(400).json({ message: "Profile update values absent" });
            return;
        }
        const updatedUser = await User.findOneAndUpdate({ email }, { name, photoUrl }, { new: true });
        res.json({ user: { name: updatedUser?.name, email: updatedUser?.email, photoUrl: updatedUser?.photoUrl } });
    }
    catch {
        res.status(500).json({ message: "Update execution failed" });
    }
});
app.post("/api/events", verifyToken, async (req, res) => {
    try {
        const authReq = req;
        const creatorEmail = authReq.userEmail;
        const { title, description, eventType, thumbnailUrl, location, eventDate } = req.body;
        if (!title || !description || !eventType || !thumbnailUrl || !location || !eventDate) {
            res.status(400).json({ message: "Missing creation metadata parameters" });
            return;
        }
        if (new Date(eventDate) <= new Date()) {
            res.status(400).json({ message: "Historical limits active: Choose a future date" });
            return;
        }
        const newEvent = new Event({ title, description, eventType, thumbnailUrl, location, eventDate, creatorEmail });
        await newEvent.save();
        res.status(201).json(newEvent);
    }
    catch {
        res.status(500).json({ message: "Data save terminal error" });
    }
});
app.get("/api/events/upcoming-limit", async (_req, res) => {
    try {
        const upcoming = await Event.find({ eventDate: { $gt: new Date() } }).sort({ eventDate: 1 }).limit(6);
        res.json(upcoming);
    }
    catch {
        res.status(500).json({ message: "Data slice array error" });
    }
});
app.get("/api/events/upcoming-all", async (_req, res) => {
    try {
        const allUpcoming = await Event.find({ eventDate: { $gt: new Date() } }).sort({ eventDate: 1 });
        res.json(allUpcoming);
    }
    catch {
        res.status(500).json({ message: "Query processing failure" });
    }
});
app.get("/api/events/details/:id", async (req, res) => {
    try {
        const eventItem = await Event.findById(req.params.id);
        if (!eventItem) {
            res.status(404).json({ message: "Event index missing" });
            return;
        }
        res.json(eventItem);
    }
    catch {
        res.status(500).json({ message: "Index identification system fault" });
    }
});
app.post("/api/events/join/:id", verifyToken, async (req, res) => {
    try {
        const authReq = req;
        const userEmail = authReq.userEmail;
        const eventItem = await Event.findById(req.params.id);
        if (!eventItem) {
            res.status(404).json({ message: "Event trace lost" });
            return;
        }
        if (eventItem.joinedUsers.includes(userEmail)) {
            res.status(400).json({ message: "Allocation map records existing link" });
            return;
        }
        eventItem.joinedUsers.push(userEmail);
        await eventItem.save();
        res.json({ message: "Allocation verified" });
    }
    catch {
        res.status(500).json({ message: "Server mutation fault" });
    }
});
app.get("/api/events/joined-list", verifyToken, async (req, res) => {
    try {
        const authReq = req;
        const userEmail = authReq.userEmail;
        const joined = await Event.find({ joinedUsers: userEmail }).sort({ eventDate: 1 });
        res.json(joined);
    }
    catch {
        res.status(500).json({ message: "Data stack read fault" });
    }
});
app.get("/api/events/manage-list", verifyToken, async (req, res) => {
    try {
        const authReq = req;
        const userEmail = authReq.userEmail;
        const created = await Event.find({ creatorEmail: userEmail });
        res.json(created);
    }
    catch {
        res.status(500).json({ message: "System retrieval layer error" });
    }
});
app.put("/api/events/update/:id", verifyToken, async (req, res) => {
    try {
        const authReq = req;
        const userEmail = authReq.userEmail;
        const { title, description, eventType, thumbnailUrl, location, eventDate } = req.body;
        const eventItem = await Event.findById(req.params.id);
        if (!eventItem) {
            res.status(404).json({ message: "Resource index reference dead" });
            return;
        }
        if (eventItem.creatorEmail !== userEmail) {
            res.status(403).json({ message: "Access denied" });
            return;
        }
        if (!title || !description || !eventType || !thumbnailUrl || !location || !eventDate) {
            res.status(400).json({ message: "Incomplete dataset for update" });
            return;
        }
        if (new Date(eventDate) <= new Date()) {
            res.status(400).json({ message: "Historical limits active: Choose a future date" });
            return;
        }
        Object.assign(eventItem, { title, description, eventType, thumbnailUrl, location, eventDate });
        await eventItem.save();
        res.json({ message: "Update confirmed" });
    }
    catch {
        res.status(500).json({ message: "Database update error" });
    }
});
app.delete("/api/events/delete/:id", verifyToken, async (req, res) => {
    try {
        const authReq = req;
        const userEmail = authReq.userEmail;
        const eventItem = await Event.findById(req.params.id);
        if (!eventItem) {
            res.status(404).json({ message: "Resource target empty" });
            return;
        }
        if (eventItem.creatorEmail !== userEmail) {
            res.status(403).json({ message: "Access segment prohibited" });
            return;
        }
        await eventItem.deleteOne();
        res.json({ message: "Purge routine completed" });
    }
    catch {
        res.status(500).json({ message: "Purge execution hardware fault" });
    }
});
