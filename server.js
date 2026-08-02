require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 3000;


mongoose.connect(process.env.MONGODB_URI)
.then(() => {

    console.log("✅ Connected");

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

})
.catch(err => console.error(err));