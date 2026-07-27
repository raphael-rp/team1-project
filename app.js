const express = require("express");
const mysql = require("mysql2");
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
// MySQL Connection
// ==========================
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "RP738964$",   // Change this to your local MySQL root password
    database: "c270_anthonygoh"   // Change this if your database has another name
});

connection.connect((err) => {
    if (err) {
        console.log(err);
        return;
    }

    console.log("Connected to MySQL!");
});

// Promise wrapper, used for the dashboard route where several
// independent queries need to be awaited together.
const db = connection.promise();

// ==========================
// Middleware
// ==========================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

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
// Dashboard
// ==========================
app.get("/", requireLogin, async (req, res) => {

    const accountId = req.session.account.accountId;
    const calorieGoal = 2200;

    try {

        const [todayMeals] = await db.query(
            `SELECT * FROM meals WHERE accountId=? AND mealDate=CURDATE()`,
            [accountId]
        );

        const [weekMeals] = await db.query(
            `SELECT mealDate, SUM(calories) AS total
             FROM meals
             WHERE accountId=? AND mealDate >= (CURDATE() - INTERVAL 6 DAY)
             GROUP BY mealDate`,
            [accountId]
        );

        const [goalRows] = await db.query(
            `SELECT goalMl FROM water_goal WHERE accountId=?`,
            [accountId]
        );

        const [waterRows] = await db.query(
            `SELECT SUM(amountMl) AS total
             FROM water_log
             WHERE accountId=? AND DATE(loggedAt)=CURDATE()`,
            [accountId]
        );

        const [workoutRows] = await db.query(
            `SELECT SUM(minutes) AS totalMinutes, SUM(caloriesBurned) AS totalCalories
             FROM workouts
             WHERE accountId=? AND workoutDate=CURDATE()`,
            [accountId]
        );

        const [bmiHistory] = await db.query(
            `SELECT * FROM bmi WHERE accountId=? ORDER BY recordDate ASC`,
            [accountId]
        );

        // Build the last 7 calendar days (oldest -> today) with that day's total calories
        const weekCalories = [];

        for (let i = 6; i >= 0; i--) {

            const d = new Date();
            d.setDate(d.getDate() - i);
            const iso = d.toISOString().split("T")[0];

            const match = weekMeals.find((row) => {
                const rowDate = row.mealDate instanceof Date
                    ? row.mealDate.toISOString().split("T")[0]
                    : String(row.mealDate);
                return rowDate === iso;
            });

            weekCalories.push({
                label: i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" }),
                total: match ? Number(match.total) : 0
            });

        }

        const todayCalories = todayMeals.reduce((sum, meal) => sum + Number(meal.calories), 0);
        const waterGoal = goalRows.length > 0 ? goalRows[0].goalMl : 2000;
        const waterConsumed = waterRows[0].total || 0;

        res.render("index", {
            account: req.session.account,
            todayCalories,
            calorieGoal,
            mealsLoggedToday: todayMeals.length,
            waterGoal,
            waterConsumed,
            workoutMinutes: workoutRows[0].totalMinutes || 0,
            workoutCalories: workoutRows[0].totalCalories || 0,
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


app.post("/addMeal", requireLogin, (req, res) => {

    const { mealName, calories, mealDate } = req.body;

    const accountId = req.session.account.accountId;


    const sql = `
        INSERT INTO meals
        (accountId, mealName, calories, mealDate)
        VALUES (?, ?, ?, ?)
    `;


    connection.query(
        sql,
        [
            accountId,
            mealName,
            calories,
            mealDate
        ],

        (err) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }


            res.redirect("/foodhistory");

        }
    );

});

// ==========================
// Food History
// ==========================

app.get("/foodhistory", requireLogin, (req, res) => {

    const sql = `
        SELECT *
        FROM meals
        WHERE accountId = ?
        ORDER BY mealDate DESC
    `;

    connection.query(
        sql,
        [req.session.account.accountId],
        (err, results) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.render("foodhistory", {
                meals: results,
                account: req.session.account
            });

        }
    );

});

// ==========================
// Search Meals
// ==========================

app.get("/searchMeal", requireLogin, (req, res) => {

    const search = req.query.search;


    if (!search) {

        return res.render("searchmeal", {
            meals: [],
            search: "",
            account: req.session.account
        });

    }


    const sql = `
        SELECT *
        FROM meals
        WHERE accountId = ?
        AND mealName LIKE ?
        ORDER BY mealDate DESC
    `;


    connection.query(
        sql,
        [
            req.session.account.accountId,
            `%${search}%`
        ],

        (err, results) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.render("searchmeal", {
                meals: results,
                search: search,
                account: req.session.account
            });

        }
    );

});

// ==========================
// Edit Meals
// ==========================
app.get("/editMeal", requireLogin, (req, res) => {

    const sql = `
        SELECT *
        FROM meals
        WHERE accountId = ?
        ORDER BY mealDate DESC
    `;

    connection.query(
        sql,
        [req.session.account.accountId],
        (err, results) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.render("editmeal", {
                meals: results,
                account: req.session.account
            });

        }
    );

});

// ==========================
// Update Meal
// ==========================
app.post("/editMeal/:id", requireLogin, (req, res) => {

    const { mealName, calories, mealDate } = req.body;

    const sql = `
        UPDATE meals
        SET mealName=?, calories=?, mealDate=?
        WHERE mealId=?
        AND accountId=?
    `;

    connection.query(
        sql,
        [
            mealName,
            calories,
            mealDate,
            req.params.id,
            req.session.account.accountId
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.redirect("/editMeal");

        }
    );

});

// ==========================
// Delete Meal
// ==========================
app.post("/deleteMeal/:id", requireLogin, (req, res) => {

    const sql = `
        DELETE FROM meals
        WHERE mealId=?
        AND accountId=?
    `;

    connection.query(
        sql,
        [
            req.params.id,
            req.session.account.accountId
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.redirect("/editMeal");

        }
    );

});

// ==========================
// Water Dashboard
// ==========================

app.get("/water", requireLogin, (req, res) => {

    const accountId = req.session.account.accountId;

    const goalSQL = `
        SELECT goalMl
        FROM water_goal
        WHERE accountId=?
    `;

    connection.query(goalSQL, [accountId], (err, goalResult) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        let goal = 2000;

        if (goalResult.length > 0) {
            goal = goalResult[0].goalMl;
        }

        const logSQL = `
            SELECT *
            FROM water_log
            WHERE accountId=?
            AND DATE(loggedAt)=CURDATE()
            ORDER BY loggedAt DESC
        `;

        connection.query(logSQL, [accountId], (err, logs) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            let consumed = 0;

            logs.forEach(log => {
                consumed += log.amountMl;
            });

            const remaining = Math.max(goal - consumed, 0);

            const pct = Math.min(
                Math.round((consumed / goal) * 100),
                100
            );

            res.render("water", {
                goal,
                consumed,
                remaining,
                pct,
                logs,
                account: req.session.account
            });

        });

    });

});

// ==========================
// Add Water
// ==========================

app.get("/water-add", requireLogin, (req, res) => {

    const accountId = req.session.account.accountId;

    const goalSQL = `
        SELECT goalMl
        FROM water_goal
        WHERE accountId=?
    `;

    connection.query(goalSQL, [accountId], (err, goalResult) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        let goal = 2000;

        if (goalResult.length > 0) {
            goal = goalResult[0].goalMl;
        }

        const waterSQL = `
            SELECT SUM(amountMl) AS total
            FROM water_log
            WHERE accountId=?
            AND DATE(loggedAt)=CURDATE()
        `;

        connection.query(waterSQL, [accountId], (err, results) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            const consumed = results[0].total || 0;

            res.render("addwater", {
                goal,
                consumed,
                account: req.session.account
            });

        });

    });

});

app.post("/water-add", requireLogin, (req, res) => {

    const accountId = req.session.account.accountId;

    const amount = parseInt(req.body.amount);

    if (!amount || amount <= 0) {
        return res.redirect("/water");
    }

    const sql = `
        INSERT INTO water_log
        (accountId, amountMl)
        VALUES (?, ?)
    `;

    connection.query(sql, [accountId, amount], (err) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        res.redirect("/water");

    });

});

// ==========================
// Water History
// ==========================

app.get("/water-history", requireLogin, (req, res) => {

    const accountId = req.session.account.accountId;

    const goalSQL = `
        SELECT goalMl
        FROM water_goal
        WHERE accountId=?
    `;

    connection.query(goalSQL, [accountId], (err, goalResult) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        let goal = 2000;

        if (goalResult.length > 0) {
            goal = goalResult[0].goalMl;
        }

        const sql = `
            SELECT
                DATE(loggedAt) AS logDate,
                SUM(amountMl) AS total
            FROM water_log
            WHERE accountId=?
            GROUP BY DATE(loggedAt)
            ORDER BY logDate DESC
        `;

        connection.query(sql, [accountId], (err, results) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.render("waterhistory", {
                days: results,
                goal,
                account: req.session.account
            });

        });

    });

});

// ==========================
// Delete Water
// ==========================

app.post("/water-delete/:id", requireLogin, (req, res) => {

    const sql = `
        DELETE FROM water_log
        WHERE waterId=?
        AND accountId=?
    `;

    connection.query(
        sql,
        [req.params.id, req.session.account.accountId],
        (err) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.redirect("/water");

        }
    );

});

// ==========================
// Update Water Goal
// ==========================

app.post("/water-goal", requireLogin, (req, res) => {

    const accountId = req.session.account.accountId;

    const goalMl = parseInt(req.body.goalMl);

    if (!goalMl || goalMl < 250) {
        return res.redirect("/water");
    }

    const sql = `
        INSERT INTO water_goal
        (accountId, goalMl)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
        goalMl = VALUES(goalMl)
    `;

    connection.query(sql, [accountId, goalMl], (err) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        res.redirect("/water");

    });

});

// ==========================
// Add Workout
// ==========================

app.get("/addWorkout", requireLogin, (req, res) => {

    res.render("addWorkout", {
        account: req.session.account
    });

});

app.post("/addWorkout", requireLogin, (req, res) => {

    const {
        activity,
        minutes,
        caloriesBurned,
        workoutDate,
        workoutTime
    } = req.body;

    const sql = `
        INSERT INTO workouts
        (
            accountId,
            activity,
            minutes,
            caloriesBurned,
            workoutDate,
            workoutTime
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    connection.query(
        sql,
        [
            req.session.account.accountId,
            activity,
            minutes,
            caloriesBurned,
            workoutDate,
            workoutTime
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.redirect("/exerciseHistory");

        }
    );

});

// ==========================
// Exercise History
// ==========================

app.get("/exerciseHistory", requireLogin, (req, res) => {

    const sql = `
        SELECT *
        FROM workouts
        WHERE accountId = ?
        ORDER BY workoutDate DESC, workoutTime DESC
    `;

    connection.query(
        sql,
        [req.session.account.accountId],
        (err, results) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.render("excercisehistory", {
                workouts: results,
                account: req.session.account
            });

        }
    );

});

// ==========================
// Edit Workout
// ==========================

app.get("/editWorkout/:id", requireLogin, (req, res) => {

    const sql = `
        SELECT *
        FROM workouts
        WHERE workoutId = ?
        AND accountId = ?
    `;

    connection.query(
        sql,
        [req.params.id, req.session.account.accountId],
        (err, results) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            if (results.length === 0) {
                return res.redirect("/exerciseHistory");
            }

            res.render("editWorkout", {
                workout: results[0],
                account: req.session.account
            });

        }
    );

});

// ==========================
// Update Workout
// ==========================

app.post("/editWorkout/:id", requireLogin, (req, res) => {

    const {
        activity,
        minutes,
        caloriesBurned,
        workoutDate,
        workoutTime
    } = req.body;

    const sql = `
        UPDATE workouts
        SET
            activity = ?,
            minutes = ?,
            caloriesBurned = ?,
            workoutDate = ?,
            workoutTime = ?
        WHERE workoutId = ?
        AND accountId = ?
    `;

    connection.query(
        sql,
        [
            activity,
            minutes,
            caloriesBurned,
            workoutDate,
            workoutTime,
            req.params.id,
            req.session.account.accountId
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.redirect("/exerciseHistory");

        }
    );

});

// ==========================
// Delete Workout
// ==========================

app.post("/deleteWorkout/:id", requireLogin, (req, res) => {

    const sql = `
        DELETE FROM workouts
        WHERE workoutId = ?
        AND accountId = ?
    `;

    connection.query(
        sql,
        [req.params.id, req.session.account.accountId],
        (err) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.redirect("/exerciseHistory");

        }
    );

});

// ==========================
// BMI Tracker
// ==========================

app.get("/bmi", requireLogin, (req, res) => {

    const sql = `
        SELECT *
        FROM bmi
        WHERE accountId = ?
        ORDER BY recordDate ASC
    `;

    connection.query(
        sql,
        [req.session.account.accountId],
        (err, results) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.render("bmi", {
                history: results,
                account: req.session.account
            });

        }
    );

});

// ==========================
// Save BMI
// ==========================

app.post("/bmi", requireLogin, (req, res) => {

    const { height, weight, bmi, category } = req.body;

    const sql = `
        INSERT INTO bmi
        (
            accountId,
            height,
            weight,
            bmi,
            category,
            recordDate
        )
        VALUES (?, ?, ?, ?, ?, CURDATE())
    `;

    connection.query(
        sql,
        [
            req.session.account.accountId,
            height,
            weight,
            bmi,
            category
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.redirect("/bmi");

        }
    );

});

// ==========================
// Delete BMI
// ==========================

app.post("/deleteBMI/:id", requireLogin, (req, res) => {

    const sql = `
        DELETE FROM bmi
        WHERE bmiId = ?
        AND accountId = ?
    `;

    connection.query(
        sql,
        [req.params.id, req.session.account.accountId],
        (err) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.redirect("/bmi");

        }
    );

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
    res.render("login", {
        error: null,
        success: req.query.reset === "success"
            ? "Password updated! You can now log in with your new password."
            : null
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    connection.query(
        "SELECT * FROM account WHERE email = ? AND password = SHA2(?, 256)",
        [email.toLowerCase(), password],
        (err, results) => {
            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            if (results.length === 0) {
                return res.render("login", {
                    error: "Invalid email or password."
                });
            }

            req.session.account = results[0];
            res.redirect("/");
        }
    );
});

// ==========================
// Forgot Password
// ==========================
app.get("/forgot-password", (req, res) => {
    res.render("forgot-password", { error: null, success: null });
});

app.post("/forgot-password", (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
        return res.render("forgot-password", {
            error: "Please fill all fields!",
            success: null
        });
    }

    if (newPassword !== confirmPassword) {
        return res.render("forgot-password", {
            error: "Passwords do not match!",
            success: null
        });
    }

    if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword)) {
        return res.render("forgot-password", {
            error: "Password must be at least 8 characters and include one uppercase and one lowercase letter.",
            success: null
        });
    }

    connection.query(
        "SELECT * FROM account WHERE email = ?",
        [email.toLowerCase()],
        (err, results) => {
            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            if (results.length === 0) {
                return res.render("forgot-password", {
                    error: "No account found with that email.",
                    success: null
                });
            }

            connection.query(
                "SELECT * FROM account WHERE email = ? AND password = SHA2(?, 256)",
                [email.toLowerCase(), newPassword],
                (err, sameResults) => {
                    if (err) {
                        console.log(err);
                        return res.send("Database Error");
                    }

                    if (sameResults.length > 0) {
                        return res.render("forgot-password", {
                            error: "New password must be different from your current password.",
                            success: null
                        });
                    }

                    connection.query(
                        "UPDATE account SET password = SHA2(?, 256) WHERE email = ?",
                        [newPassword, email.toLowerCase()],
                        (err) => {
                            if (err) {
                                console.log(err);
                                return res.send("Database Error");
                            }

                            res.redirect("/login?reset=success");
                        }
                    );
                }
            );
        }
    );
});

// ==========================
// Signup
// ==========================
app.get("/signup", (req, res) => {
    res.render("signup", { error: null });
});

app.post("/signup", (req, res) => {
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

    connection.query(
        "SELECT * FROM account WHERE email = ?",
        [email.toLowerCase()],
        (err, results) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }
            if (results.length > 0) {
                return res.render("signup", {
                    error: "Email already exists."
                }); 
            }
            connection.query(
                "INSERT INTO account (username, email, password) VALUES (?, ?, SHA2(?, 256))",
                [username, email.toLowerCase(), password],
                (err) => {
                    if (err) {
                        console.log(err);
                        return res.send("Database Error");
                    }

                    res.redirect("/login");
                }
            );
        }
    );
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
