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
// Require Login Middleware
// ==========================

function requireLogin(req, res, next) {

    if (!req.session.account) {
        return res.redirect("/login");
    }

    next();

}

// ==========================
// Home
// ==========================

app.get("/", requireLogin, (req, res) => {
    res.redirect("/water");
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

    connection.query(

        goalSQL,

        [accountId],

        (err, goalResult) => {

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

            connection.query(

                logSQL,

                [accountId],

                (err, logs) => {

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

                }

            );

        }

    );

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

    connection.query(
        goalSQL,
        [accountId],
        (err, goalResult) => {

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

            connection.query(
                waterSQL,
                [accountId],
                (err, results) => {

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

                }
            );

        }
    );

});

app.post("/water-add", requireLogin, (req, res) => {

    const accountId = req.session.account.accountId;

    const amount = parseInt(req.body.amount);

    if (!amount || amount <= 0) {
        return res.redirect("/water-add");
    }

    const sql = `
        INSERT INTO water_log
        (accountId, amountMl)
        VALUES (?, ?)
    `;

    connection.query(
        sql,
        [
            accountId,
            amount
        ],
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
        [
            req.params.id,
            req.session.account.accountId
        ],
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

    connection.query(
        sql,
        [
            accountId,
            goalMl
        ],
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