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

    // First activity ever
    if (!stats.lastDate) {
        stats.streak = 1;
        stats.lastDate = today;
        return;
    }

    // Already counted today
    if (stats.lastDate === today) {
        return;
    }
    let last = new Date(stats.lastDate);
    let now = new Date(today);

    let diffDays = Math.floor(
        (now - last) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
        stats.streak++;
    } else {
        stats.streak = 1;
    }
    stats.lastDate = today;
}

// 3.badge(checks and unlocks milestones)
const AVAILABLE_BADGES = [
    { id: "first_workout", name: "🏅First Step", desc: "Complete your first workout" },
    { id: "workout_10", name: "💪Workout Warrior", desc: "Complete 10 workouts" },
    { id: "workout_50", name: "🏃Fitness Fanatic", desc: "Complete 50 workouts" },
    { id: "calorie_cadet", name: "🍎Calorie Cadet", desc: "Log your first meal" },
    { id: "meal_master", name: "🥗Meal Master", desc: "Log 50 meals" },
    { id: "nutrition_ninja", name: "🥑Nutrition Ninja", desc: "Log 100 meals" },
    { id: "water_7", name: "💧Hydration Hero", desc: "Reach your water goal 7 times" },
    { id: "bmi_tracker", name: "⚖BMI Beginner", desc: "Save your BMI once" },

    { id: "streak_3", name: "🔥Consistent", desc: "Maintain a 3-day streak" },
    { id: "streak_7", name: "⚡One Week Strong", desc: "Maintain a 7-day streak" },
    { id: "streak_30", name: "🌟Unstoppable", desc: "Maintain a 30-day streak" },

    { id: "level_5", name: "👑Elite Athlete", desc: "Reach Level 5" },
    { id: "level_10", name: "🏆Fitness Legend", desc: "Reach Level 10" },
    { id: "level_20", name: "🚀Quest Master", desc: "Reach Level 20" }
];

const DAILY_QUESTS = [
    { id: "quest_workout", title: "Complete any workout", reward: 40, action: "completing a workout" },
    { id: "quest_calorie", title: "Log a daily healthy meal", reward: 25, action: "logging a meal" },
    { id: "quest_water", title: "Hit your daily hydration goal", reward: 20, action: "drinking enough water" }
];

function checkAndUnlockBadges(stats) {

    let unlockedAny = false;
    let newBadges = [];

    function unlock(id, name) {
        if (!stats.unlockedBadges.includes(id)) {
            stats.unlockedBadges.push(id);
            stats.xp += 100;      // Bonus XP for every badge
            newBadges.push(name);
            unlockedAny = true;
        }
    }

    // Workout Badges
    if (stats.workouts >= 1) unlock("first_workout", "🏅 First Step");
    if (stats.workouts >= 10) unlock("workout_10", "💪 Workout Warrior");
    if (stats.workouts >= 50) unlock("workout_50", "🏃 Fitness Fanatic");
    // Meal Badges
    if (stats.meals >= 1) unlock("calorie_cadet", "🍎 Calorie Cadet");
    if (stats.meals >= 50) unlock("meal_master", "🥗 Meal Master");
    if (stats.meals >= 100) unlock("nutrition_ninja", "🥑 Nutrition Ninja");
    // Water Badge
    if (stats.waterGoals >= 7) unlock("water_7", "💧 Hydration Hero");
    // BMI Badge
    if (stats.bmiUpdates >= 1) unlock("bmi_tracker", "⚖ BMI Beginner");
    // Streak Badges
    if (stats.streak >= 3) unlock("streak_3", "🔥 Consistent");
    if (stats.streak >= 7) unlock("streak_7", "⚡ One Week Strong");
    if (stats.streak >= 30) unlock("streak_30", "🌟 Unstoppable");
    // Level Badges
    if (stats.level >= 5) unlock("level_5", "👑 Elite Athlete");
    if (stats.level >= 10) unlock("level_10", "🏆 Fitness Legend");
    if (stats.level >= 20) unlock("level_20", "🚀 Quest Master");

    return {
        unlockedAny,
        newBadges
    };
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
        { name: "Raphael", level: 3, totalXP: 250, isLiveUser: false },
        { name: "WeiHan", level: 2, totalXP: 180, isLiveUser: false },
        { name: "Mattew", level: 2, totalXP: 130, isLiveUser: false },
        { name: "ZiYing", level: 1, totalXP: 100, isLiveUser: false },
        { name: "Akmal", level: 1, totalXP: 90, isLiveUser: false },
        { name: "YongEn", level: 1, totalXP: 50, isLiveUser: false }
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

// ===============================
// TEAMMATE INTEGRATION FUNCTIONS
// ===============================

// Call this after a workout is successfully saved
function recordWorkout() {
    let data = getGamificationData();
    let user = getCurrentUser();

    if (!user) return;

    data[user].workouts++;
    saveGamificationData(data);

    addXP(30, "completing a workout");
}

// Call this after a meal is logged
function recordMeal() {
    let data = getGamificationData();
    let user = getCurrentUser();

    if (!user) return;

    data[user].meals++;
    saveGamificationData(data);

    addXP(15, "logging a meal");
}

// Call this when today's water goal is completed
function recordWaterGoal() {
    let data = getGamificationData();
    let user = getCurrentUser();

    if (!user) return;

    data[user].waterGoals++;
    saveGamificationData(data);

    addXP(20, "reaching today's water goal");
}

// Call this whenever BMI is updated
function recordBMI() {
    let data = getGamificationData();
    let user = getCurrentUser();

    if (!user) return;

    data[user].bmiUpdates++;
    saveGamificationData(data);

    addXP(10, "updating BMI");
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
