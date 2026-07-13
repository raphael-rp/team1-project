CREATE DATABASE IF NOT EXISTS `c270_anthonygoh` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `c270_anthonygoh`;

-- ==========================
-- Accounts
-- ==========================

DROP TABLE IF EXISTS `account`;
CREATE TABLE `account` (
  `accountId` int NOT NULL AUTO_INCREMENT,
  `username` varchar(45) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`accountId`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `account` (`accountId`, `username`, `email`, `password`) VALUES
(1,'Anthony','anthony@gmail.com','123456'),
(2,'John','john@gmail.com','password'),
(3,'Mary','mary@gmail.com','qwerty');

-- ==========================
-- Meals
-- ==========================

DROP TABLE IF EXISTS `meals`;
CREATE TABLE `meals` (
  `mealId` int NOT NULL AUTO_INCREMENT,
  `accountId` int NOT NULL,
  `mealName` varchar(100) NOT NULL,
  `calories` int NOT NULL,
  `mealDate` date NOT NULL,
  PRIMARY KEY (`mealId`),
  KEY `accountId` (`accountId`),
  CONSTRAINT `meals_ibfk_1` FOREIGN KEY (`accountId`) REFERENCES `account` (`accountId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `meals` (`mealId`, `accountId`, `mealName`, `calories`, `mealDate`) VALUES
(1,1,'Chicken Rice',650,'2026-07-11'),
(2,1,'Milo',180,'2026-07-11'),
(3,1,'Nasi Lemak',720,'2026-07-12'),
(4,1,'Caesar Salad',320,'2026-07-13'),
(5,2,'Burger',780,'2026-07-11'),
(6,2,'French Fries',420,'2026-07-11'),
(7,3,'Sushi',450,'2026-07-12'),
(8,3,'Apple',95,'2026-07-13');

-- ==========================
-- Workouts
-- ==========================

DROP TABLE IF EXISTS `workouts`;
CREATE TABLE `workouts` (
  `workoutId` int NOT NULL AUTO_INCREMENT,
  `accountId` int NOT NULL,
  `activity` varchar(100) NOT NULL,
  `minutes` int NOT NULL,
  `caloriesBurned` int NOT NULL,
  `workoutDate` date NOT NULL,
  `workoutTime` time NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`workoutId`),
  KEY `accountId` (`accountId`),
  CONSTRAINT `workouts_ibfk_1` FOREIGN KEY (`accountId`) REFERENCES `account` (`accountId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ==========================
-- BMI
-- ==========================

DROP TABLE IF EXISTS `bmi`;
CREATE TABLE `bmi` (
  `bmiId` int NOT NULL AUTO_INCREMENT,
  `accountId` int NOT NULL,
  `height` decimal(5,2) NOT NULL,
  `weight` decimal(5,2) NOT NULL,
  `bmi` decimal(4,2) NOT NULL,
  `category` varchar(30) NOT NULL,
  `recordDate` date NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`bmiId`),
  KEY `accountId` (`accountId`),
  CONSTRAINT `bmi_ibfk_1` FOREIGN KEY (`accountId`) REFERENCES `account` (`accountId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ==========================
-- Water Log + Goal
-- (referenced by app.js but never included in any teammate's SQL dump)
-- ==========================

DROP TABLE IF EXISTS `water_log`;
CREATE TABLE `water_log` (
  `waterId` int NOT NULL AUTO_INCREMENT,
  `accountId` int NOT NULL,
  `amountMl` int NOT NULL,
  `loggedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`waterId`),
  KEY `accountId` (`accountId`),
  CONSTRAINT `water_log_ibfk_1` FOREIGN KEY (`accountId`) REFERENCES `account` (`accountId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `water_goal`;
CREATE TABLE `water_goal` (
  `accountId` int NOT NULL,
  `goalMl` int NOT NULL DEFAULT 2000,
  PRIMARY KEY (`accountId`),
  CONSTRAINT `water_goal_ibfk_1` FOREIGN KEY (`accountId`) REFERENCES `account` (`accountId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
