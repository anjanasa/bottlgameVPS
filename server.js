const io = require("socket.io")(3030, {
  cors: {
    //origin: process.env.CORS_ORIGINE || "http://127.0.0.1:5501",
    //origin:
    //  process.env.CORS_ORIGINE || "https://bottlegame.playislandrush.com/",
    origin: "*",
  },
});
var hiscolorStores = [
  ["yellow", "blue", "green", "cyan", "red"],
  ["blue", "yellow", "cyan", "red", "green"],
  ["green", "red", "blue", "cyan", "yellow"],
  ["blue", "green", "red", "cyan", "yellow"],
  ["red", "green", "cyan", "blue", "yellow"],
];
console.log(hiscolorStores);
var userBetiingHistory = [];
var serverpattern = [];
const mysql = require("mysql");
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS if you're making requests from a different origin

app.use(express.static(path.join(__dirname, "public")));
// Create MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'MAkavindu@1998',
  database: 'nadeera_game', // Adjust according to your database name
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to MySQL database");
});

let BidList = [];
io.on("connection", (socket) => {
  console.log("A user connected: " + socket.id);
  socket.emit("com", socket.id);

  // Event handler for receiving color bids
  socket.on("ColSend", (color_object, Serial, socketId, Username) => {
    // Assuming color_object is an array, push the whole object (not just the first element)
    /*check balance of trader*/
    db.query(
      "SELECT * FROM game_users WHERE Serial = ? AND user_name = ?",
      [Serial, Username],
      (err, result) => {
        if (err) {
          console.error("Error logging in:", err);
          return;
        }
        //console.log(result);
        if (result.length > 0) {
          console.log("balance fetch succsesfull");
          //console.log(result[0].user_name);
          //console.log(result[0].balance);
          //console.log(color_object[0].stake);
          if (result[0].balance < color_object[0].stake) {
            io.to(socketId).emit("bid", "Insufficient balance");
          } else {
            io.to(socketId).emit(
              "bid",
              "bid place succesfull",
              color_object[0].stake
            );
            console.log("bid place succesfull");
            let prebal = parseFloat(result[0].balance);
            let stake = parseFloat(color_object[0].stake);

            userBetiingHistory.push({ name: result[0].user_name, bet: stake });
            if (userBetiingHistory.length > 9) {
              userBetiingHistory.shift();
            }
            socket.emit("guserdata", userBetiingHistory);

            let updatedbalance = prebal - stake;
            console.log(prebal, stake, updatedbalance);
            db.query(
              "UPDATE game_users SET balance = ? WHERE Serial = ?",
              [updatedbalance, Serial],
              (err, result) => {
                if (err) {
                  console.error("Error updating balance:", err);
                  return;
                }
                console.log("Balance updated successfully");
                //console.log(result);
              }
            );
          } /*bid succesfull*/
        } else {
          console.log('can"t get banance failed');
          //io.to(socketId).emit('login', 'Login failed');
        }
      }
    );
    BidList.push(color_object[0]); // If color_object is structured like [{socket: 'xyz', colors: [...] }]
  });
  socket.on("login", (usernamein, passwordin, socket) => {
    console.log(usernamein, passwordin, socket);
    userLogin(usernamein, passwordin, socket);
  });
  socket.on(
    "register",
    (fristname, lastname, phonenumber, username, password, socket) => {
      console.log(username, password, socket);
      userRegister(
        fristname,
        lastname,
        phonenumber,
        username,
        password,
        socket
      );
    }
  );
  socket.on("token", (token, user_id, socket_id) => {
    console.log(
      "token: ",
      token,
      "user_id: ",
      user_id,
      "socket_id: ",
      socket_id
    );

    db.query(
      "UPDATE game_users SET token = ? WHERE user_id = ?",
      [token, user_id],
      (err, result) => {
        if (err) {
          console.error("Error updating token:", err);
          return;
        }
        console.log("Token updated successfully");
      }
    );
  });
});

// Updated payout table with more generous payouts
const PAYOUT_TABLE = {
  0: 0, // 0x (lose entire stake)
  1: 1.5, // 1.5x (+50% profit) - increased from 1x
  2: 3.0, // 3.0x (+200% profit) - increased from 2.5x
  3: 10.0, // 10.0x (+900% profit) - increased from 7.5x
  4: 35.0, // 35.0x (+3400% profit) - increased from 25x
  5: 300.0, // 300.0x (+29900% profit) - increased from 250x
};

//updated advanced stratergy
// Constants
const COLORS = ["red", "green", "blue", "cyan", "yellow"];

// Add loss protection system
const playerStats = new Map(); // Store player statistics

// Constants for loss protection
const LOSS_PROTECTION = {
  MAX_CONSECUTIVE_LOSSES: 3,
  BASE_WIN_CHANCE: 0.4, // Increased from 0.3 to 0.4 (40% base win chance)
  MAX_WIN_CHANCE: 0.8, // Increased from 0.6 to 0.8 (80% max win chance)
  WIN_CHANCE_INCREMENT: 0.15, // Increased from 0.1 to 0.15
  PROTECTION_DECAY: 0.05,
  MIN_PLATFORM_PROFIT_PERCENT: 0.05, // Minimum 5% platform profit
  MAX_PLATFORM_PROFIT_PERCENT: 0.2, // Maximum 20% platform profit
};

function bidList_Processing2(BidList) {
  console.log("Processing Bid List:", BidList);

  // 1. Input Processing
  const refinedUserBids = Object.values(
    BidList.reduce((acc, obj) => {
      acc[obj.socket] = obj; // Unique by socket
      return acc;
    }, {})
  );
  console.log("Refined User Bids:", refinedUserBids);

  // 2. Pattern Determination
  if (refinedUserBids.length > 0) {
    // Generate all possible patterns
    const allPatterns = getPermutations(COLORS);
    const totalStake = refinedUserBids.reduce(
      (sum, user) => sum + parseFloat(user.stake),
      0
    );

    // Find most profitable pattern
    const { chosenPattern, maxProfit } = findMostProfitablePattern(
      refinedUserBids,
      allPatterns,
      totalStake
    );

    console.log(
      "Selected Pattern:",
      chosenPattern,
      "Projected Profit:",
      maxProfit
    );

    // 3. Result Processing
    updatePatternHistory(chosenPattern);
    broadcastResults(chosenPattern);
  } else {
    // No bets - random pattern
    const randomPattern = getRandomOrder();
    console.log("Generated Random Pattern:", randomPattern);

    updatePatternHistory(randomPattern);
    broadcastResults(randomPattern);
  }

  // 4. Profit Calculation
  pl_show_save(refinedUserBids);
}

// Helper Functions

function getPermutations(arr) {
  if (arr.length <= 1) return [arr];
  const permutations = [];

  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const remainingPerms = getPermutations(remaining);

    for (const perm of remainingPerms) {
      permutations.push([current, ...perm]);
    }
  }

  return permutations;
}

// Function to update player statistics
function updatePlayerStats(socketId, isWin, stake, payout) {
  if (!playerStats.has(socketId)) {
    playerStats.set(socketId, {
      consecutiveLosses: 0,
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      totalStake: 0,
      totalPayout: 0,
      winChance: LOSS_PROTECTION.BASE_WIN_CHANCE,
    });
  }

  const stats = playerStats.get(socketId);
  stats.totalGames++;
  stats.totalStake += stake;
  stats.totalPayout += payout;

  if (isWin) {
    stats.consecutiveLosses = 0;
    stats.totalWins++;
    // Decay win chance after a win
    stats.winChance = Math.max(
      LOSS_PROTECTION.BASE_WIN_CHANCE,
      stats.winChance - LOSS_PROTECTION.PROTECTION_DECAY
    );
  } else {
    stats.consecutiveLosses++;
    stats.totalLosses++;
    // Increase win chance after consecutive losses
    if (stats.consecutiveLosses >= LOSS_PROTECTION.MAX_CONSECUTIVE_LOSSES) {
      stats.winChance = Math.min(
        LOSS_PROTECTION.MAX_WIN_CHANCE,
        stats.winChance + LOSS_PROTECTION.WIN_CHANCE_INCREMENT
      );
    }
  }

  playerStats.set(socketId, stats);
}

// Modify findMostProfitablePattern for better win distribution
function findMostProfitablePattern(bids, patterns, totalStake) {
  let bestPattern = patterns[0];
  let maxScore = -Infinity;
  let maxPlayerWins = 0;

  // Calculate average stake per player
  const avgStake = totalStake / bids.length;

  // Calculate target win rate based on number of players
  const targetWinRate = calculateTargetWinRate(bids.length);

  // Calculate target platform profit range
  const minProfit = totalStake * LOSS_PROTECTION.MIN_PLATFORM_PROFIT_PERCENT;
  const maxProfit = totalStake * LOSS_PROTECTION.MAX_PLATFORM_PROFIT_PERCENT;

  // Log initial calculations
  console.log(`Average stake per player: ${avgStake.toFixed(2)}`);
  console.log(`Total stake: ${totalStake.toFixed(2)}`);
  console.log(`Number of players: ${bids.length}`);

  patterns.forEach((pattern) => {
    let totalPayout = 0;
    let playerWins = 0;
    let totalMatches = 0;
    let protectedWins = 0;
    let highStakeWins = 0;
    let totalHighStakes = 0;

    // First pass: calculate basic metrics
    bids.forEach((user) => {
      const matches = user.colors.reduce(
        (count, color, i) => count + (pattern[i] === color ? 1 : 0),
        0
      );
      totalMatches += matches;

      const stake = parseFloat(user.stake);
      const payout = stake * PAYOUT_TABLE[matches];
      totalPayout += payout;

      const isWin = payout > stake;
      if (isWin) {
        playerWins++;
        // Track high stake wins
        if (stake > avgStake * 1.5) {
          highStakeWins++;
          totalHighStakes += stake;
        }
      }

      // Check for protected wins
      const stats = playerStats.get(user.socket);
      if (
        stats &&
        stats.consecutiveLosses >= LOSS_PROTECTION.MAX_CONSECUTIVE_LOSSES &&
        isWin
      ) {
        protectedWins++;
      }
    });

    const profit = totalStake - totalPayout;
    const winRate = playerWins / bids.length;
    const matchRate = totalMatches / (bids.length * 5);

    // Skip patterns that don't meet minimum platform profit
    if (profit < minProfit) return;

    // Calculate various scoring components
    const profitScore = calculateProfitScore(profit, minProfit, maxProfit);
    const winRateScore = calculateWinRateScore(winRate, targetWinRate);
    const protectionScore = protectedWins * 0.3;
    const highStakeScore = highStakeWins * 0.2;
    const matchRateScore = matchRate * 0.2;

    // Combined score with adjusted weights
    const score =
      profitScore * 0.3 + // 30% weight to profit
      winRateScore * 0.4 + // 40% weight to win rate
      protectionScore * 0.15 + // 15% weight to protected wins
      highStakeScore * 0.1 + // 10% weight to high stake wins
      matchRateScore * 0.05; // 5% weight to match rate

    if (score > maxScore) {
      maxScore = score;
      bestPattern = pattern;
      maxPlayerWins = playerWins;
    }
  });

  // Log detailed selection criteria
  console.log(`Pattern Selection Details:`);
  console.log(`Total Players: ${bids.length}`);
  console.log(`Target Win Rate: ${(targetWinRate * 100).toFixed(2)}%`);
  console.log(
    `Selected Pattern Win Rate: ${((maxPlayerWins / bids.length) * 100).toFixed(
      2
    )}%`
  );
  console.log(
    `Platform Profit Target: ${minProfit.toFixed(2)} - ${maxProfit.toFixed(2)}`
  );

  return { chosenPattern: bestPattern, maxProfit: maxScore };
}

// Helper function to calculate target win rate based on number of players
function calculateTargetWinRate(playerCount) {
  if (playerCount <= 2) return 0.5; // 50% win rate for 1-2 players
  if (playerCount <= 5) return 0.6; // 60% win rate for 3-5 players
  if (playerCount <= 10) return 0.7; // 70% win rate for 6-10 players
  return 0.8; // 80% win rate for more than 10 players
}

// Helper function to calculate profit score
function calculateProfitScore(profit, minProfit, maxProfit) {
  if (profit < minProfit) return 0;
  if (profit > maxProfit) return 1;
  return (profit - minProfit) / (maxProfit - minProfit);
}

// Helper function to calculate win rate score
function calculateWinRateScore(winRate, targetWinRate) {
  const deviation = Math.abs(winRate - targetWinRate);
  return 1 - deviation * 2; // Penalize deviation from target win rate
}

function getRandomOrder() {
  const shuffled = [...COLORS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function updatePatternHistory(pattern) {
  hiscolorStores.push(pattern);
  if (hiscolorStores.length > 5) hiscolorStores.shift();
  serverpattern = pattern;
}

function broadcastResults(pattern) {
  io.emit("bestPattern", pattern);
  BidList = []; // Clear bids after processing
}

// Modify pl_show_save to update player stats
function pl_show_save(array) {
  console.log("pl function got this", array);
  function calculateProfitLoss(bidList, platformColorOrder) {
    let totalWins = 0;
    let totalStake = 0;
    let totalPayout = 0;
    let protectedWins = 0;

    bidList.forEach((user) => {
      let matches = 0;

      user.colors.forEach((color, index) => {
        if (platformColorOrder[index] === color) {
          matches++;
        }
      });

      const stake = parseFloat(user.stake);
      const payout = stake * PAYOUT_TABLE[matches];
      const profitLoss = payout - stake;
      const isWin = profitLoss > 0;

      // Update player statistics
      updatePlayerStats(user.socket, isWin, stake, payout);

      // Get updated stats for logging
      const stats = playerStats.get(user.socket);
      if (
        stats &&
        stats.consecutiveLosses >= LOSS_PROTECTION.MAX_CONSECUTIVE_LOSSES &&
        isWin
      ) {
        protectedWins++;
      }

      totalStake += stake;
      totalPayout += payout;
      if (isWin) totalWins++;

      // Send enhanced result to client
      io.to(user.socket).emit("profitLossResult", {
        socket: user.socket,
        profitLoss: profitLoss.toFixed(2),
        payout: payout.toFixed(2),
        matches: matches,
        isWin: isWin,
        stake: stake.toFixed(2),
        returnPercentage: PAYOUT_TABLE[matches],
        consecutiveLosses: stats ? stats.consecutiveLosses : 0,
        winChance: stats ? stats.winChance : LOSS_PROTECTION.BASE_WIN_CHANCE,
        totalGames: stats ? stats.totalGames : 0,
        totalWins: stats ? stats.totalWins : 0,
      });

      console.log(`Socket: ${user.socket}`);
      console.log(`Stake: ${stake}`);
      console.log(`Payout: ${payout.toFixed(2)}`);
      console.log(`Profit/Loss: ${profitLoss.toFixed(2)}`);
      console.log(`Matches: ${matches}`);
      console.log(`Is Win: ${isWin}`);
      if (stats) {
        console.log(`Consecutive Losses: ${stats.consecutiveLosses}`);
        console.log(`Win Chance: ${(stats.winChance * 100).toFixed(2)}%`);
      }
    });

    // Log enhanced session statistics
    console.log(`Session Statistics:`);
    console.log(`Total Players: ${bidList.length}`);
    console.log(`Winning Players: ${totalWins}`);
    console.log(`Protected Wins: ${protectedWins}`);
    console.log(
      `Win Rate: ${((totalWins / bidList.length) * 100).toFixed(2)}%`
    );
    console.log(`Total Stake: ${totalStake.toFixed(2)}`);
    console.log(`Total Payout: ${totalPayout.toFixed(2)}`);
    console.log(`Platform Profit: ${(totalStake - totalPayout).toFixed(2)}`);
  }

  calculateProfitLoss(array, serverpattern);
}

//user login
var loggedUsers = {};
function userLogin(user_name, password, socketId) {
  //console.log('Login attempt:', user_name, password);
  db.query(
    "SELECT * FROM game_users WHERE user_name = ? AND password = ?",
    [user_name, password],
    (err, result) => {
      if (err) {
        console.error("Error logging in:", err);
        return;
      }
      if (result.length > 0) {
        loggedUsers = result[0];
        console.log("Login successful", result[0].user_name);
        io.to(socketId).emit("login", "Login successful", result[0]);
        io.to(socketId).emit("hiscolors", hiscolorStores);
        /*updateLastLoginTime(socketId)*/
      } else {
        console.log("Login failed");
        io.to(socketId).emit("login", "Login failed");
      }
    }
  );
}

function userRegister(
  fristname,
  lastname,
  phonenumber,
  username,
  password,
  socketId
) {
  var serial = generateRandomTenDigitNumber();
  function generateRandomTenDigitNumber() {
    // Generate a random number between 0 and 9999999999
    const randomNumber = Math.floor(Math.random() * 10000000000);
    // Ensure the number is 10 digits by padding with leading zeros if necessary
    return String(randomNumber).padStart(10, "0");
  }
  //check serial
  console.log("genarated serial", serial);
  db.query(
    "SELECT * FROM game_users WHERE Serial = ?",
    [serial],
    (err, result) => {
      if (err) {
        console.error("Error checking if serial exists:", err);
        return;
      }
      if (result.length == 0) {
        console.log("serial does not exist ", serial);
        //check user name
        db.query(
          "SELECT * FROM game_users WHERE user_name = ?",
          [username],
          (err, data) => {
            if (err) {
              console.error("Error checking if user exists:", err);
              return;
            }
            if (data.length > 0) {
              console.log("User already exists");
              io.to(socketId).emit("registered", "User name already exists");
              return;
            } else {
              console.log("User does not exist");
              // create lottery game user
              const sql =
                "INSERT INTO game_users (`Serial`, `first_name`, `last_name`, `password`, `phone_number`, `register_Date`, `user_name`) VALUES (?, ?, ?, ?, ?, NOW(), ?)";
              db.query(
                sql,
                [serial, fristname, lastname, password, phonenumber, username],
                (err, result) => {
                  if (err) {
                    console.error("Error registering user:", err);
                    return;
                  }
                  console.log("User registered successfully");
                  io.to(socketId).emit(
                    "registered",
                    "User registered successfully",
                    username,
                    password
                  );
                  //updateUserInformation(socketId)
                }
              );
            }
          }
        );
      } else if (result.length > 0) {
        console.log("serial already exists ", serial);
        io.to(socketId).emit("registered", "serial already exists", serial);
        return;
      }
    }
  );
}
function updateUserInformation(socketId) {
  io.to(socketId).emit("updateUserInformation", loggedUsers);
  console.log("updateUserInformation sended");
}

//modules
function getCurrentDateTime() {
  var now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-based, so add 1
  const day = String(now.getDate()).padStart(2, "0");

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  //console.log(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function startCountdownLoop() {
  const firstStageDuration = 45; // Duration for the first countdown stage in seconds
  const secondStageDuration = 10; // Duration for the second countdown stage in seconds

  while (true) {
    // Infinite loop
    // First countdown stage from firstStageDuration to 0
    for (let i = firstStageDuration; i >= 0; i--) {
      await new Promise((resolve) => {
        setTimeout(resolve, 1000); // Wait 1 second between updates
      });
      io.emit("current state", i, "bs");
      if (i == 0) {
        io.emit("state", "resut Start");
        console.log("BidList", BidList);
        bidList_Processing2(BidList);
      }
    }

    // Immediately start post-countdown updates after the first countdown ends
    for (let i = secondStageDuration; i >= 0; i--) {
      await new Promise((resolve) => {
        setTimeout(resolve, 1000); // Wait 1 second between updates
      });

      io.emit("current state", i, "ss");
      if (i == 0) {
        io.emit("state", "bidding Start");
        BidList = [];
        io.emit("hiscolors", hiscolorStores);
      }
    }
  }
}

startCountdownLoop();

function userdataUpdate(serial) {
  db.query(
    "SELECT * FROM game_users WHERE Serial = ?",
    [serial],
    (err, result) => {
      if (err) {
        console.error("Error logging in:", err);
        return;
      }
      //console.log(result);
      if (result.length > 0) {
        console.log("data fetch succsesfull");
        console.log(result[0].user_name);
        io.to(socketId).emit("userdata", "Login successful", result[0]);
      } else {
        console.log("Login failed");
        io.to(socketId).emit("userdata", "Login failed");
      }
    }
  );
}
async function generate_users() {
  while (true) {
    fetch("https://randomuser.me/api/")
      .then((response) => response.json()) // Parse the JSON response
      .then((data) => {
        // Access the user details from the API response
        const user = data.results[0];
        const fullName = `${user.name.first} ${user.name.last}`;
        const country = user.location.country;
        userBetiingHistory.push({
          name: user.name.first,
          bet: generateRandomValue(),
        });
        if (userBetiingHistory.length > 9) {
          userBetiingHistory.shift();
        }
        console.log(`Name: ${fullName}, Country: ${country}`);
        io.emit("guserdata", userBetiingHistory);
      })
      .catch((error) => console.error("Error fetching user data:", error));
    // Wait for a random time between 1 to 10 seconds
    const delay = Math.floor(Math.random() * (10 - 1 + 1)) + 1; // Random delay between 1 and 10 seconds
    await new Promise((resolve) => setTimeout(resolve, delay * 1000));
  }
  function generateRandomValue() {
    return Math.floor(Math.random() * (999 - 100 + 1)) + 100;
  }
}
// Start generating users
generate_users();
