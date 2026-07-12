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

// TEMPORARY - FOR LOCAL TESTING ONLY - REMOVE BEFORE COMMITTING
app.use((req, res, next) => {
  if (!req.session.account) {
    req.session.account = { accountId: 1, username: "Anthony", email: "anthony@gmail.com" };
  }
  next();
});


app.use(express.static(path.join(__dirname, "public")));
// ==========================
// MySQL Connection
// ==========================
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "FxBRAK428Z?1",   // Change this
    database: "c270_anthonygoh"   // Change this if your database has another name
});

connection.connect((err) => {
    if (err) {
        console.log(err);
        return;
    }

    console.log("Connected to MySQL!");
});

// ==========================
// Middleware
// ==========================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// ==========================
// Dashboard
// ==========================
function requireLogin(req, res, next) {

    if (!req.session.account) {
        return res.redirect("/login");
    }

    next();

}


app.get("/", requireLogin, (req, res) => {

    res.render("index", {
        account: req.session.account
    });

});
// ==========================
// Calorie Home
// ==========================
app.get("/calorie", requireLogin, (req, res) => {
    res.render("Calorie");
});

// ==========================
// Add Meal
// ==========================

app.get("/addMeal", requireLogin, (req, res) => {

    res.render("addMeal", {
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

        return res.render("searchMeal", {
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


            if(err){

                console.log(err);
                return res.send("Database Error");

            }


            res.render("searchMeal", {

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

            if(err){
                console.log(err);
                return res.send("Database Error");
            }

            res.render("editMeal", {
                meals: results,
                account: req.session.account
            });

        }
    );

});

// ==========================
// Update Meal
// ==========================
app.post("/editMeal/:id", requireLogin, (req,res)=>{

    const {mealName, calories, mealDate} = req.body;

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
        (err)=>{

            if(err){
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
app.post("/deleteMeal/:id", requireLogin, (req,res)=>{

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
        (err)=>{

            if(err){
                console.log(err);
                return res.send("Database Error");
            }

            res.redirect("/editMeal");

        }
    );

});

// Paste this whole block into app.js, anywhere among the other app.get/app.post
// routes (e.g. right after the "Delete Meal" section, before "Login").
// It follows the exact same requireLogin + connection.query pattern already used
// for meals.

// ==========================
// Water Intake - Dashboard
// ==========================
app.get("/water", requireLogin, (req, res) => {
    const accountId = req.session.account.accountId;

    const goalSql = `SELECT goalMl FROM water_goals WHERE accountId = ?`;
    connection.query(goalSql, [accountId], (err, goalResults) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        const goal = goalResults.length > 0 ? goalResults[0].goalMl : 2000;

        const logsSql = `
            SELECT * FROM water_logs
            WHERE accountId = ?
            AND DATE(loggedAt) = CURDATE()
            ORDER BY loggedAt DESC
        `;

        connection.query(logsSql, [accountId], (err, logs) => {
            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            const consumed = logs.reduce((sum, row) => sum + row.amountMl, 0);
            const pct = Math.max(0, Math.min(100, Math.round((consumed / goal) * 100)));

            res.render("water", {
                account: req.session.account,
                logs: logs,
                goal: goal,
                consumed: consumed,
                pct: pct,
                remaining: Math.max(0, goal - consumed)
            });
        });
    });
});

// ==========================
// Water Intake - Update Goal
// ==========================
app.post("/water-goal", requireLogin, (req, res) => {
    const accountId = req.session.account.accountId;
    const goalMl = parseInt(req.body.goalMl, 10);

    const sql = `
        INSERT INTO water_goals (accountId, goalMl)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE goalMl = ?
    `;

    connection.query(sql, [accountId, goalMl, goalMl], (err) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        res.redirect("/water");
    });
});

// ==========================
// Water Intake - Add page
// ==========================
app.get("/water-add", requireLogin, (req, res) => {
    const accountId = req.session.account.accountId;

    const goalSql = `SELECT goalMl FROM water_goals WHERE accountId = ?`;
    connection.query(goalSql, [accountId], (err, goalResults) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        const goal = goalResults.length > 0 ? goalResults[0].goalMl : 2000;

        const logsSql = `
            SELECT * FROM water_logs
            WHERE accountId = ?
            AND DATE(loggedAt) = CURDATE()
        `;
        connection.query(logsSql, [accountId], (err, logs) => {
            if (err) {
                console.log(err);
                return res.send("Database Error");
            }
            const consumed = logs.reduce((sum, row) => sum + row.amountMl, 0);

            res.render("add", {
                account: req.session.account,
                consumed: consumed,
                goal: goal
            });
        });
    });
});

app.post("/water-add", requireLogin, (req, res) => {
    const accountId = req.session.account.accountId;
    const amountMl = parseInt(req.body.amount, 10);

    if (!amountMl || amountMl <= 0) {
        return res.redirect("/water-add");
    }

    const sql = `INSERT INTO water_logs (accountId, amountMl) VALUES (?, ?)`;

    connection.query(sql, [accountId, amountMl], (err) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        res.redirect("/water-add");
    });
});

// ==========================
// Water Intake - Delete a log
// ==========================
app.post("/water-delete/:id", requireLogin, (req, res) => {
    const sql = `
        DELETE FROM water_logs
        WHERE waterId = ?
        AND accountId = ?
    `;

    connection.query(sql, [req.params.id, req.session.account.accountId], (err) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        res.redirect("/water");
    });
});

// ==========================
// Water Intake - History
// ==========================
app.get("/water-history", requireLogin, (req, res) => {
    const accountId = req.session.account.accountId;

    const goalSql = `SELECT goalMl FROM water_goals WHERE accountId = ?`;
    connection.query(goalSql, [accountId], (err, goalResults) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        const goal = goalResults.length > 0 ? goalResults[0].goalMl : 2000;

        const sql = `
            SELECT DATE(loggedAt) AS logDate, SUM(amountMl) AS total
            FROM water_logs
            WHERE accountId = ?
            AND DATE(loggedAt) != CURDATE()
            GROUP BY DATE(loggedAt)
            ORDER BY logDate DESC
        `;

        connection.query(sql, [accountId], (err, days) => {
            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            res.render("history", {
                account: req.session.account,
                days: days,
                goal: goal
            });
        });
    });
});




// ==========================
// Login
// ==========================
app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    console.log("Email entered:", email);
    console.log("Password entered:", password);

    connection.query(
        "SELECT * FROM account WHERE email = ?",
        [email.toLowerCase()],
        (err, results) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            console.log(results);

            if (results.length === 0) {
                console.log("Email not found");
                return res.render("login", {
                    error: "Invalid email or password."
                });
            }

            const account = results[0];

            console.log(account);

            if (password !== account.password) {
                console.log("Password incorrect");
                return res.render("login", {
                    error: "Invalid email or password."
                });
            }

            console.log("Login successful");

            req.session.account = account;

            res.redirect("/");
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


            if(err){

                console.log(err);
                return res.send("Database Error");

            }


            if(results.length > 0){

                return res.render("signup", {
                    error:"Email already exists."
                });

            }


            connection.query(

                "INSERT INTO account (username, email, password) VALUES (?, ?, ?)",

                [
                    username,
                    email.toLowerCase(),
                    password
                ],

                (err)=>{


                    if(err){

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

