const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const session = require("express-session");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "fitness_secret_key",
    resave: false,
    saveUninitialized: false
}));

// ==========================
// MongoDB Atlas Connection
// ==========================

const MONGO_URI = process.env.MONGO_URI ||
  "mongodb://25046457_db_user:QAqHBkhz1eC3fDWN@ac-lzycqd1-shard-00-00.0snblv7.mongodb.net:27017,ac-lzycqd1-shard-00-01.0snblv7.mongodb.net:27017,ac-lzycqd1-shard-00-02.0snblv7.mongodb.net:27017/FitnessDashboard?ssl=true&replicaSet=atlas-vb45co-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Fitnessapp";

mongoose.connect(MONGO_URI)
.then(() => console.log("✅ Connected"))
.catch(err => console.error(err));
  

// ==========================
// Mongoose Models
// ==========================

const accountSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String
});
const Account = mongoose.model("Account", accountSchema, "account");

const mealSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    mealName: String,
    calories: Number,
    mealDate: Date
});
const Meal = mongoose.model("Meal", mealSchema, "meals");

const waterGoalSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", unique: true },
    goalMl: Number
});
const WaterGoal = mongoose.model("WaterGoal", waterGoalSchema, "watergoals");

const waterLogSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    amountMl: Number,
    loggedAt: { type: Date, default: Date.now }
});
const WaterLog = mongoose.model("WaterLog", waterLogSchema, "waterlogs");

const workoutSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    activity: String,
    minutes: Number,
    caloriesBurned: Number,
    workoutDate: Date,
    workoutTime: String
});
const Workout = mongoose.model("Workout", workoutSchema, "workout");

const bmiSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    height: Number,
    weight: Number,
    bmi: Number,
    category: String,
    recordDate: { type: Date, default: Date.now }
});
const Bmi = mongoose.model("Bmi", bmiSchema, "bmi");

// ==========================
// Middleware
// ==========================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

// Helper: start of today and end of today
function todayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

// ==========================
// Auth Middleware
// ==========================
function requireLogin(req, res, next) {

    if (!req.session.account) {
        return res.redirect("/login");
    }

    next();

}

// ==========================
// Dashboardw
// ==========================
app.get("/", requireLogin, async (req, res) => {

    const accountId = req.session.account._id;
    const calorieGoal = 2200;

    try {

        const { start, end } = todayRange();

        const todayMeals = await Meal.find({
            accountId,
            mealDate: { $gte: start, $lte: end }
        }).lean();

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);

        const weekMealsRaw = await Meal.find({
            accountId,
            mealDate: { $gte: weekStart }
        }).lean();

        // Group by day and sum calories
        const weekMap = {};
        weekMealsRaw.forEach(meal => {
            const iso = new Date(meal.mealDate).toISOString().split("T")[0];
            if (!weekMap[iso]) weekMap[iso] = 0;
            weekMap[iso] += Number(meal.calories);
        });

        const goalDoc = await WaterGoal.findOne({ accountId }).lean();
        const waterGoal = goalDoc ? goalDoc.goalMl : 2000;

        const waterLogs = await WaterLog.find({
            accountId,
            loggedAt: { $gte: start, $lte: end }
        }).lean();
        const waterConsumed = waterLogs.reduce((sum, log) => sum + Number(log.amountMl), 0);

        const workouts = await Workout.find({
            accountId,
            workoutDate: { $gte: start, $lte: end }
        }).lean();
        const workoutMinutes = workouts.reduce((s, w) => s + Number(w.minutes), 0);
        const workoutCalories = workouts.reduce((s, w) => s + Number(w.caloriesBurned), 0);

        const bmiHistory = await Bmi.find({ accountId }).sort({ recordDate: 1 }).lean();

        // Build the last 7 calendar days (oldest -> today) with that day's total calories
        const weekCalories = [];

        for (let i = 6; i >= 0; i--) {

            const d = new Date();
            d.setDate(d.getDate() - i);
            const iso = d.toISOString().split("T")[0];

            weekCalories.push({
                label: i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" }),
                total: weekMap[iso] || 0
            });

        }

        const todayCalories = todayMeals.reduce((sum, meal) => sum + Number(meal.calories), 0);

        res.render("index", {
            account: req.session.account,
            todayCalories,
            calorieGoal,
            mealsLoggedToday: todayMeals.length,
            waterGoal,
            waterConsumed,
            workoutMinutes,
            workoutCalories,
            latestBmi: bmiHistory.length > 0 ? bmiHistory[bmiHistory.length - 1] : null,
            bmiTrend: bmiHistory.slice(-6),
            weekCalories
        });

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Calorie Home
// ==========================
app.get("/calorie", requireLogin, (req, res) => {

    res.render("calorie", {
        account: req.session.account
    });

});

// ==========================
// Add Meal
// ==========================

app.get("/addMeal", requireLogin, (req, res) => {

    res.render("addmeal", {
        account: req.session.account
    });

});


app.post("/addMeal", requireLogin, async (req, res) => {

    const { mealName, calories, mealDate } = req.body;

    try {

        await Meal.create({
            accountId: req.session.account._id,
            mealName,
            calories: Number(calories),
            mealDate: new Date(mealDate)
        });

        res.redirect("/foodhistory");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Food History
// ==========================

app.get("/foodhistory", requireLogin, async (req, res) => {

    try {

        const meals = await Meal
            .find({ accountId: req.session.account._id })
            .sort({ mealDate: -1 })
            .lean();

        res.render("foodhistory", {
            meals,
            account: req.session.account
        });

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Search Meals
// ==========================

app.get("/searchMeal", requireLogin, async (req, res) => {

    const search = req.query.search;

    if (!search) {

        return res.render("searchmeal", {
            meals: [],
            search: "",
            account: req.session.account
        });

    }

    try {

        const meals = await Meal
            .find({
                accountId: req.session.account._id,
                mealName: { $regex: search, $options: "i" }
            })
            .sort({ mealDate: -1 })
            .lean();

        res.render("searchmeal", {
            meals,
            search,
            account: req.session.account
        });

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Edit Meals
// ==========================
app.get("/editMeal", requireLogin, async (req, res) => {

    try {

        const meals = await Meal
            .find({ accountId: req.session.account._id })
            .sort({ mealDate: -1 })
            .lean();

        res.render("editmeal", {
            meals,
            account: req.session.account
        });

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Update Meal
// ==========================
app.post("/editMeal/:id", requireLogin, async (req, res) => {

    const { mealName, calories, mealDate } = req.body;

    try {

        await Meal.updateOne(
            { _id: req.params.id, accountId: req.session.account._id },
            {
                mealName,
                calories: Number(calories),
                mealDate: new Date(mealDate)
            }
        );

        res.redirect("/editMeal");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Delete Meal
// ==========================
app.post("/deleteMeal/:id", requireLogin, async (req, res) => {

    try {

        await Meal.deleteOne({
            _id: req.params.id,
            accountId: req.session.account._id
        });

        res.redirect("/editMeal");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Water Dashboard
// ==========================

app.get("/water", requireLogin, async (req, res) => {

    const accountId = req.session.account._id;

    try {

        const { start, end } = todayRange();

        const goalDoc = await WaterGoal.findOne({ accountId }).lean();
        const goal = goalDoc ? goalDoc.goalMl : 2000;

        const logs = await WaterLog
            .find({
                accountId,
                loggedAt: { $gte: start, $lte: end }
            })
            .sort({ loggedAt: -1 })
            .lean();

        const consumed = logs.reduce((sum, log) => sum + Number(log.amountMl), 0);
        const remaining = Math.max(goal - consumed, 0);
        const pct = Math.min(Math.round((consumed / goal) * 100), 100);

        res.render("water", {
            goal,
            consumed,
            remaining,
            pct,
            logs,
            account: req.session.account
        });

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Add Water
// ==========================

app.get("/water-add", requireLogin, async (req, res) => {

    const accountId = req.session.account._id;

    try {

        const { start, end } = todayRange();

        const goalDoc = await WaterGoal.findOne({ accountId }).lean();
        const goal = goalDoc ? goalDoc.goalMl : 2000;

        const logs = await WaterLog.find({
            accountId,
            loggedAt: { $gte: start, $lte: end }
        }).lean();

        const consumed = logs.reduce((sum, log) => sum + Number(log.amountMl), 0);

        res.render("addwater", {
            goal,
            consumed,
            account: req.session.account
        });

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

app.post("/water-add", requireLogin, async (req, res) => {

    const amount = parseInt(req.body.amount);

    if (!amount || amount <= 0) {
        return res.redirect("/water");
    }

    try {

        await WaterLog.create({
            accountId: req.session.account._id,
            amountMl: amount
        });

        res.redirect("/water");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Water History
// ==========================

app.get("/water-history", requireLogin, async (req, res) => {

    const accountId = req.session.account._id;

    try {

        const goalDoc = await WaterGoal.findOne({ accountId }).lean();
        const goal = goalDoc ? goalDoc.goalMl : 2000;

        const logs = await WaterLog.find({ accountId }).sort({ loggedAt: -1 }).lean();

        // Group by day
        const dayMap = {};
        logs.forEach(log => {
            const iso = new Date(log.loggedAt).toISOString().split("T")[0];
            if (!dayMap[iso]) dayMap[iso] = 0;
            dayMap[iso] += Number(log.amountMl);
        });

        const days = Object.keys(dayMap)
            .sort((a, b) => new Date(b) - new Date(a))
            .map(iso => ({ logDate: iso, total: dayMap[iso] }));

        res.render("waterhistory", {
            days,
            goal,
            account: req.session.account
        });

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Delete Water
// ==========================

app.post("/water-delete/:id", requireLogin, async (req, res) => {

    try {

        await WaterLog.deleteOne({
            _id: req.params.id,
            accountId: req.session.account._id
        });

        res.redirect("/water");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Update Water Goal
// ==========================

app.post("/water-goal", requireLogin, async (req, res) => {

    const accountId = req.session.account._id;
    const goalMl = parseInt(req.body.goalMl);

    if (!goalMl || goalMl < 250) {
        return res.redirect("/water");
    }

    try {

        await WaterGoal.updateOne(
            { accountId },
            { goalMl },
            { upsert: true }
        );

        res.redirect("/water");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Add Workout
// ==========================

app.get("/addWorkout", requireLogin, (req, res) => {

    res.render("addworkout", {
        account: req.session.account
    });

});

app.post("/addWorkout", requireLogin, async (req, res) => {

    const {
        activity,
        minutes,
        caloriesBurned,
        workoutDate,
        workoutTime
    } = req.body;

    try {

        await Workout.create({
            accountId: req.session.account._id,
            activity,
            minutes: Number(minutes),
            caloriesBurned: Number(caloriesBurned),
            workoutDate: new Date(workoutDate),
            workoutTime
        });

        res.redirect("/exerciseHistory");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Exercise History
// ==========================

app.get("/exerciseHistory", requireLogin, async (req, res) => {

    try {

        const workouts = await Workout
            .find({ accountId: req.session.account._id })
            .sort({ workoutDate: -1, workoutTime: -1 })
            .lean();

        res.render("excercisehistory", {
            workouts,
            account: req.session.account
        });

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Edit Workout
// ==========================

app.get("/editWorkout/:id", requireLogin, async (req, res) => {

    try {

        const workout = await Workout.findOne({
            _id: req.params.id,
            accountId: req.session.account._id
        }).lean();

        if (!workout) {
            return res.redirect("/exerciseHistory");
        }

        res.render("editworkout", {
            workout,
            account: req.session.account
        });

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Update Workout
// ==========================

app.post("/editWorkout/:id", requireLogin, async (req, res) => {

    const {
        activity,
        minutes,
        caloriesBurned,
        workoutDate,
        workoutTime
    } = req.body;

    try {

        await Workout.updateOne(
            { _id: req.params.id, accountId: req.session.account._id },
            {
                activity,
                minutes: Number(minutes),
                caloriesBurned: Number(caloriesBurned),
                workoutDate: new Date(workoutDate),
                workoutTime
            }
        );

        res.redirect("/exerciseHistory");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Delete Workout
// ==========================

app.post("/deleteWorkout/:id", requireLogin, async (req, res) => {

    try {

        await Workout.deleteOne({
            _id: req.params.id,
            accountId: req.session.account._id
        });

        res.redirect("/exerciseHistory");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// BMI Tracker
// ==========================

app.get("/bmi", requireLogin, async (req, res) => {

    try {

        const history = await Bmi
            .find({ accountId: req.session.account._id })
            .sort({ recordDate: 1 })
            .lean();

        res.render("bmi", {
            history,
            account: req.session.account
        });

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Save BMI
// ==========================

app.post("/bmi", requireLogin, async (req, res) => {

    const { height, weight, bmi, category } = req.body;

    try {

        await Bmi.create({
            accountId: req.session.account._id,
            height: Number(height),
            weight: Number(weight),
            bmi: Number(bmi),
            category,
            recordDate: new Date()
        });

        res.redirect("/bmi");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Delete BMI
// ==========================

app.post("/deleteBMI/:id", requireLogin, async (req, res) => {

    try {

        await Bmi.deleteOne({
            _id: req.params.id,
            accountId: req.session.account._id
        });

        res.redirect("/bmi");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }

});

// ==========================
// Gamification / Quest Zone
// ==========================

app.get("/gamification", requireLogin, (req, res) => {

    res.render("gamification", {
        account: req.session.account
    });

});

// ==========================
// Login
// ==========================
app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {

        const account = await Account.findOne({
            email: email.toLowerCase()
        }).lean();

        if (!account) {
            return res.render("login", {
                error: "Invalid email or password."
            });
        }

        if (password !== account.password) {
            return res.render("login", {
                error: "Invalid email or password."
            });
        }

        req.session.account = account;
        res.redirect("/");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }
});

// ==========================
// Signup
// ==========================
app.get("/signup", (req, res) => {
    res.render("signup", { error: null });
});

app.post("/signup", async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
        return res.render("signup", {
            error: "Please fill all fields!"
        });
    }

    if (password !== confirmPassword) {
        return res.render("signup", {
            error: "Passwords do not match!"
        });
    }

    try {

        const existing = await Account.findOne({
            email: email.toLowerCase()
        }).lean();

        if (existing) {
            return res.render("signup", {
                error: "Email already exists."
            });
        }

        await Account.create({
            username,
            email: email.toLowerCase(),
            password
        });

        res.redirect("/login");

    } catch (err) {
        console.log(err);
        return res.send("Database Error");
    }
});

// ==========================
// Logout
// ==========================
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// ==========================
// Start Server
// ==========================
const PORT = 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
