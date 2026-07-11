// GAMIFICATION.JS — Handles XP, Levels, and Streaks
// REQUIRES auth.js to be loaded first to know who is logged in

// Get current user profile
function getGamificationData() {
    let allData = JSON.parse(localStorage.getItem("gamification")) || {};
    let currentUser = getCurrentUser(); // auth.js from authentication branch
    
    if (!currentUser) return null;

    // create new profile if user no profile 
    if (!allData[currentUser]) {
        allData[currentUser] = {
            xp: 0,
            level: 1,
            streak: 0,
            lastDate: null
        };
    }
    return allData;
}

// 2. save profile 
function saveGamificationData(data) {
    localStorage.setItem("gamification", JSON.stringify(data));
}

// update streak
function updateStreak(stats) {
    let today = new Date().toISOString().split("T")[0];
    
    if (stats.lastDate) {
        let lastDate = new Date(stats.lastDate);
        let currentDate = new Date(today);
        let diffDays = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            stats.streak += 1; // streak grows per day if logged
        } else if (diffDays > 1) {
            stats.streak = 1;  // miss day = lose streak
        }
    } else {
        stats.streak = 1; // streak start for first timers
    }
    stats.lastDate = today;
}

// main engine (to call from other branches)
function addXP(amount, actionName) {
    let currentUser = getCurrentUser();
    if (!currentUser) return; // no exp if not logged in

    let data = getGamificationData();
    let stats = data[currentUser];

    updateStreak(stats);

    stats.xp += amount;
    let leveledUp = false;

    //lvl up(100XP)
    while (stats.xp >= stats.level * 100) {
        stats.xp -= (stats.level * 100);
        stats.level += 1;
        leveledUp = true;
    }

    saveGamificationData(data);

    // visual alert
    let msg = `⭐ +${amount} XP for ${actionName}!`;
    if (leveledUp) {
        msg += `\n🎉YOU'VE LEVELED UP! Congratulations you are now Level ${stats.level}! 🎉`;
    }
    alert(msg);
}
