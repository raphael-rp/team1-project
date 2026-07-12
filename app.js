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