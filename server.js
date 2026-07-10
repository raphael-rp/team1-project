const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public')); // Serves your frontend files

// CONNECT TO SQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',      
    password: '',      
    database: 'launchlab_db'
});

// User statistics
app.get('/api/gamification/:userId', (req, res) => {
    const userId = req.params.userId;
    db.query('SELECT * FROM user_gamification WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || { xp: 0, level: 1, streak: 0 });
    });
});

// Add XP / Level Up
app.post('/api/gamification/add-xp', (req, res) => {
    const { userId, xpGained } = req.body;
    
    db.query('SELECT * FROM user_gamification WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "User not found" });

        let newXp = results[0].xp + xpGained;
        let newLevel = results[0].level;
        let newStreak = results[0].streak + 1; 

        // Level UP
        if (newXp >= 100) {
            newXp -= 100;
            newLevel += 1;
        }

        db.query(
            'UPDATE user_gamification SET xp = ?, level = ?, streak = ? WHERE user_id = ?',
            [newXp, newLevel, newStreak, userId],
            (updateErr) => {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ success: true, xp: newXp, level: newLevel, streak: newStreak });
            }
        );
    });
});

app.listen(PORT, () => {
    console.log(`🚀 LaunchLab engine running at http://localhost:${PORT}`);
});
