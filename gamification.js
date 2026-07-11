// GAMIFICATION.JS — shared XP, Levels, Badges, Streaks, and Challenges logic.


// 1. profile management
function getGamificationData() {
    let allData = JSON.parse(localStorage.getItem("gamification")) || {};
    let currentUser = getCurrentUser(); // from auth.js 
    
    if (!currentUser) return null;

    if (!allData[currentUser]) {
        // Initialize a brand new user profile
        allData[currentUser] = {
    xp: 0,
    level: 1,

    streak: 0,
    lastDate: null,

    meals: 0,
    workouts: 0,
    waterGoals: 0,
    bmiUpdates: 0,

    unlockedBadges: [],
    completedChallenges: [],

    lastQuestReset: new Date().toISOString().split("T")[0]
};

function saveGamificationData(data) {
    localStorage.setItem("gamification", JSON.stringify(data));
}

function resetDailyQuests(stats) {

    let today = new Date().toISOString().split("T")[0];
    if (stats.lastQuestReset !== today) {
        stats.completedChallenges = [];
        stats.lastQuestReset = today;
    }
}

// 2. Streaks Calculator
function updateStreak(stats) {
    let today = new Date().toISOString().split("T")[0];
    
    if (stats.lastDate) {
        let lastDate = new Date(stats.lastDate);
        let currentDate = new Date(today);
        let diffTime = currentDate - lastDate;
        let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            stats.streak += 1;
        } else if (diffDays > 1) {
            stats.streak = 1; // streak is broken - reset to 0
        }
    } else {
        stats.streak = 1; // first day streak 
    }
    stats.lastDate = today;
}

// 3.badge(checks and unlocks milestones)
const AVAILABLE_BADGES = [
    { id: "first_workout", name: "🏅 First Step", desc: "Log your first workout activity", xp: 50 },
    { id: "streak_3", name: "🔥 Consistent", desc: "Maintain a 3-day workout streak", xp: 150 },
    { id: "streak_7", name: "⚡ One Week Strong", desc: "Maintain a 7-day workout streak", xp: 200 },
    { id: "level_5", name: "👑 Elite Athlete", desc: "Reach Level 5 in The Quest Zone", xp: 250 },
    { id: "level_10", name: "🏆 Fitness Legend", desc: "Reach Level 10 in The Quest Zone", xp: 300  },
    { id: "calorie_cadet", name: "🍎 Calorie Cadet", desc: "Log your first meal in the tracker", xp: 50 },
    { id: "meal_master", name: "🥗 Meal Master", desc: "Log 50 meals", xp: 100 },
    { id: "nutrition_ninja", name: "🥑 Nutrition Ninja", desc: "Log 100 meals", xp: 250 },
];

const DAILY_QUESTS = [
    { id: "quest_workout", title: "Complete any workout", reward: 40, action: "completing a workout" },
    { id: "quest_calorie", title: "Log a daily healthy meal", reward: 25, action: "logging a meal" },
    { id: "quest_water", title: "Hit your daily hydration goal", reward: 20, action: "drinking enough water" }
];

function checkAndUnlockBadges(stats) {
    let unlockedAny = false;
    let newBadges = [];
    
    // First Workout
    if (stats.streak >= 1 && !stats.unlockedBadges.includes("first_workout")) {
        stats.unlockedBadges.push("first_workout");
        stats.xp += 50;
        newBadges.push("🏅 First Step");
        unlockedAny = true;
    }

    // 3-Day Streak
    if (stats.streak >= 3 && !stats.unlockedBadges.includes("streak_3")) {
        stats.unlockedBadges.push("streak_3");
        stats.xp += 150;
        newBadges.push("🔥 Consistent");
        unlockedAny = true;
    }

    // 7-Day Streak
    if (stats.streak >= 7 && !stats.unlockedBadges.includes("streak_7")) {
        stats.unlockedBadges.push("streak_7");
        stats.xp += 200;
        newBadges.push("⚡ One Week Strong");
        unlockedAny = true;
    }

    // Level 5
    if (stats.level >= 5 && !stats.unlockedBadges.includes("level_5")) {
        stats.unlockedBadges.push("level_5");
        stats.xp += 250;
        newBadges.push("👑 Elite Athlete");
        unlockedAny = true;
    }

    // Level 10
    if (stats.level >= 10 && !stats.unlockedBadges.includes("level_10")) {
        stats.unlockedBadges.push("level_10");
        stats.xp += 300;
        newBadges.push("🏆 Fitness Legend");
        unlockedAny = true;
    }

    // First Meal Logged
    if (stats.meals >= 1 && !stats.unlockedBadges.includes("calorie_cadet")) {
        stats.unlockedBadges.push("calorie_cadet");
        stats.xp += 50;
        newBadges.push("🍎 Calorie Cadet");
        unlockedAny = true;
    }

    // 50 Meals Logged
    if (stats.meals >= 50 && !stats.unlockedBadges.includes("meal_master")) {
        stats.unlockedBadges.push("meal_master");
        stats.xp += 100;
        newBadges.push("🥗 Meal Master");
        unlockedAny = true;
    }

    // 100 Meals Logged
    if (stats.meals >= 100 && !stats.unlockedBadges.includes("nutrition_ninja")) {
        stats.unlockedBadges.push("nutrition_ninja");
        stats.xp += 250;
        newBadges.push("🥑 Nutrition Ninja");
        unlockedAny = true;
    }

    return { unlockedAny, newBadges };
}

// 4. MAIN ACTION TRIGGER: Call this from teammates' scripts to award points
function addXP(amount, actionName) {
    let currentUser = getCurrentUser();
    if (!currentUser) return;

    let data = getGamificationData();
    let stats = data[currentUser];
    resetDailyQuests(stats);

    updateStreak(stats);
    stats.xp += amount;
    
    let leveledUp = false;
    let targetXP = stats.level * 100; // Formula: Level 1 needs 100XP, Level 2 needs 200XP, etc.

    while (stats.xp >= targetXP) {
        stats.xp -= targetXP;
        stats.level += 1;
        targetXP = stats.level * 100;
        leveledUp = true;
    }

    // Run badge audit
    let badgeReport = checkAndUnlockBadges(stats);
    saveGamificationData(data);

    // Build notification message instead of using default alert()
    let toastMsg = `⭐ +${amount} XP for ${actionName}!`;
    if (leveledUp) {
        toastMsg += `<br><strong>🎉YOU'VE LEVELD UP! Congratulations! you reached Level ${stats.level}!</strong>`;
    }
    if (badgeReport.unlockedAny) {
        toastMsg += `<br><strong>🏆 Achievement Unlocked: ${badgeReport.newBadges.join(", ")}!</strong>`;
    }

    // Dispatch custom event to update UI dynamically if open
    window.dispatchEvent(new CustomEvent('xpUpdated'));
    showToast(toastMsg);
}

// 6. Live Leaderboard Compiler (Reads actual user list + fallbacks fr demo)
function getLiveLeaderboard() {
    let registeredUsers = JSON.parse(localStorage.getItem("users")) || [];
    let gamificationDb = JSON.parse(localStorage.getItem("gamification")) || {};
    
    let leaderboard = [];

    // compile active scores from all registered users
    registeredUsers.forEach(user => {
        let email = user.email;
        let stats = gamificationDb[email] || { xp: 0, level: 1, streak: 0 };
        
        // Calculate cumulative total XP
        let totalXP = 0;
        for (let i = 1; i < stats.level; i++) {
            totalXP += i * 100;
        }
        totalXP += stats.xp;

        leaderboard.push({
            name: email.split("@")[0], // Use email handle as name
            email: email,
            level: stats.level,
            totalXP: totalXP,
            isLiveUser: true
        });
    });

    // Fallback peer competitors to populate empty slots during demonstration
    const fallbackPeers = [
        { name: "Raphael_Secure", level: 3, totalXP: 250, isLiveUser: false },
        { name: "WeiHan_BMIMaster", level: 2, totalXP: 180, isLiveUser: false },
        { name: "Matt_CaloriePro", level: 2, totalXP: 130, isLiveUser: false },
        { name: "Akmal_Hydrate", level: 1, totalXP: 45, isLiveUser: false }
    ];

    // Filter out bots with names overlapping existing live users
    fallbackPeers.forEach(bot => {
        if (!leaderboard.some(user => user.name.toLowerCase() === bot.name.toLowerCase())) {
            leaderboard.push(bot);
        }
    });

    // Sort leaderboard desc by overall XP
    leaderboard.sort((a, b) => b.totalXP - a.totalXP);
    return leaderboard;
}

// Quest System Claim Logic
function claimDailyQuest(questId) {
    let currentUser = getCurrentUser();
    if (!currentUser) return;

    let data = getGamificationData();
    let stats = data[currentUser];

    if (!stats.completedChallenges) {
        stats.completedChallenges = [];
    }

    if (stats.completedChallenges.includes(questId)) return; // claimed already

    let quest = DAILY_QUESTS.find(q => q.id === questId);
    if (!quest) return;

    stats.completedChallenges.push(questId);
    saveGamificationData(data);

    addXP(quest.reward, quest.action);
}

// Shared Toast Notification UI Builder
function showToast(message) {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.style.position = "fixed";
        container.style.bottom = "20px";
        container.style.right = "20px";
        container.style.zIndex = "1000";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "10px";
        document.body.appendChild(container);
    }

    let toast = document.createElement("div");
    toast.style.background = "#1e293b";
    toast.style.color = "#f8fafc";
    toast.style.borderLeft = "4px solid #22c55e";
    toast.style.padding = "16px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.3)";
    toast.style.fontSize = "14px";
    toast.style.minWidth = "250px";
    toast.style.animation = "slideIn 0.3s ease";
    toast.innerHTML = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.5s ease";
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
