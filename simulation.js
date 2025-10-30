const io = require("socket.io-client");
const socket = io("http://localhost:3030");

// Configuration
const TOTAL_SIMULATIONS = 1000;
const COLORS = ["red", "green", "blue", "cyan", "yellow"];
const STAKE_RANGE = { min: 100, max: 1000 };
const TEST_USER = {
  username: "test_user",
  password: "test_pass",
  serial: "1234567890",
};

// Logging utility
const logger = {
  info: (message) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  warn: (message) =>
    console.log(`[WARN] ${new Date().toISOString()} - ${message}`),
  error: (message) =>
    console.log(`[ERROR] ${new Date().toISOString()} - ${message}`),
  debug: (message) =>
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`),
  bet: (message) =>
    console.log(`[BET] ${new Date().toISOString()} - ${message}`),
  result: (message) =>
    console.log(`[RESULT] ${new Date().toISOString()} - ${message}`),
  stats: (message) =>
    console.log(`[STATS] ${new Date().toISOString()} - ${message}`),
};

// Statistics tracking
let stats = {
  totalBets: 0,
  totalStakes: 0,
  totalPayouts: 0,
  platformProfit: 0,
  winDistribution: {
    0: 0, // No matches
    1: 0, // 1 match
    2: 0, // 2 matches
    3: 0, // 3 matches
    4: 0, // 4 matches
    5: 0, // 5 matches
  },
  profitDistribution: {
    positive: 0,
    negative: 0,
    zero: 0,
  },
  averageStake: 0,
  averagePayout: 0,
  maxPayout: 0,
  minPayout: 0,
  maxProfit: 0,
  minProfit: 0,
  betHistory: [], // Store detailed bet history
};

let isLoggedIn = false;
let userData = null;
let canPlaceBet = false;
let pendingBet = null; // Add variable to store pending bet

// Helper function to generate random stake
function getRandomStake() {
  const stake =
    Math.floor(Math.random() * (STAKE_RANGE.max - STAKE_RANGE.min + 1)) +
    STAKE_RANGE.min;
  logger.debug(`Generated random stake: ${stake}`);
  return stake;
}

// Helper function to generate random color pattern
function getRandomPattern() {
  const shuffled = [...COLORS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  logger.debug(`Generated random pattern: ${shuffled.join(", ")}`);
  return shuffled;
}

// Registration function
function register() {
  return new Promise((resolve, reject) => {
    logger.info("Attempting to register test user...");
    socket.emit(
      "register",
      "Test",
      "User",
      "1234567890",
      TEST_USER.username,
      TEST_USER.password,
      socket.id
    );

    socket.once("registered", (msg, username, password) => {
      if (msg === "User registered successfully") {
        logger.info("Registration successful");
        resolve();
      } else if (msg === "User name already exists") {
        logger.info("User already exists, proceeding with login");
        resolve();
      } else {
        logger.error(`Registration failed: ${msg}`);
        reject(new Error(`Registration failed: ${msg}`));
      }
    });
  });
}

// Login function
function login() {
  return new Promise((resolve, reject) => {
    logger.info("Attempting to login...");
    socket.emit("login", TEST_USER.username, TEST_USER.password, socket.id);

    socket.once("login", (msg, data) => {
      if (msg === "Login successful") {
        logger.info("Login successful");
        logger.debug(`User data received: ${JSON.stringify(data)}`);

        if (!data || !data.balance) {
          logger.error("Login successful but no user data received");
          reject(new Error("No user data received"));
          return;
        }

        isLoggedIn = true;
        userData = data;
        logger.info(`User balance: ${data.balance}`);
        resolve(data);
      } else {
        logger.error("Login failed");
        reject(new Error("Login failed"));
      }
    });
  });
}

// Simulate a single bet
async function simulateBet() {
  if (!isLoggedIn) {
    throw new Error("Not logged in");
  }

  return new Promise((resolve) => {
    const stake = getRandomStake();
    const colors = getRandomPattern();

    // Store the bet details
    pendingBet = { stake, colors, resolve };

    // If we're already in betting stage, place the bet immediately
    if (canPlaceBet) {
      logger.debug("Already in betting stage, placing bet immediately");
      placeBet(stake, colors, resolve);
      pendingBet = null;
    } else {
      logger.debug("Waiting for betting stage...");
    }
  });
}

// Helper function to place a bet
function placeBet(stake, colors, resolve) {
  logger.bet(`Placing bet - Stake: ${stake}, Colors: ${colors.join(", ")}`);

  // Simulate bet placement with correct format
  socket.emit(
    "ColSend",
    [
      {
        socket: socket.id,
        colors: colors,
        stake: stake,
        username: TEST_USER.username, // Add username to match server's query
        serial: TEST_USER.serial, // Add serial to match server's query
      },
    ],
    TEST_USER.serial,
    socket.id,
    TEST_USER.username
  );

  // Listen for bid response
  socket.once("bid", (msg, stake) => {
    if (msg === "Insufficient balance") {
      logger.warn("Insufficient balance for bet");
      canPlaceBet = false; // Reset betting flag
      resolve();
      return;
    }

    logger.debug(`Bet placed successfully: ${msg}`);
    canPlaceBet = false; // Reset betting flag after placing bet

    // Listen for profit/loss result
    socket.once("profitLossResult", (result) => {
      logger.result(`Received result:`);
      logger.result(`- Matches: ${result.matches}`);
      logger.result(`- Stake: ${result.stake}`);
      logger.result(`- Payout: ${result.payout}`);
      logger.result(`- Profit/Loss: ${result.profitLoss}`);

      // Store bet history
      stats.betHistory.push({
        stake: parseFloat(result.stake),
        colors,
        matches: result.matches,
        payout: parseFloat(result.payout),
        profitLoss: parseFloat(result.profitLoss),
        timestamp: new Date().toISOString(),
      });

      // Update statistics
      stats.totalBets++;
      stats.totalStakes += parseFloat(result.stake);
      stats.totalPayouts += parseFloat(result.payout);
      stats.platformProfit +=
        parseFloat(result.stake) - parseFloat(result.payout);

      // Update win distribution
      stats.winDistribution[result.matches]++;

      // Update profit distribution
      const profit = parseFloat(result.profitLoss);
      if (profit > 0) stats.profitDistribution.positive++;
      else if (profit < 0) stats.profitDistribution.negative++;
      else stats.profitDistribution.zero++;

      // Update min/max values
      stats.maxPayout = Math.max(stats.maxPayout, parseFloat(result.payout));
      stats.minPayout = Math.min(stats.minPayout, parseFloat(result.payout));
      stats.maxProfit = Math.max(stats.maxProfit, profit);
      stats.minProfit = Math.min(stats.minProfit, profit);

      // Log running statistics
      logger.stats(`Running totals after bet ${stats.totalBets}:`);
      logger.stats(`- Total Stakes: ${stats.totalStakes.toFixed(2)}`);
      logger.stats(`- Total Payouts: ${stats.totalPayouts.toFixed(2)}`);
      logger.stats(`- Platform Profit: ${stats.platformProfit.toFixed(2)}`);

      resolve();
    });
  });
}

// Main simulation function
async function runSimulation() {
  logger.info("Starting simulation...");
  logger.info(
    `Configuration: ${TOTAL_SIMULATIONS} simulations, Stake range: ${STAKE_RANGE.min}-${STAKE_RANGE.max}`
  );

  try {
    // Connect to server
    socket.on("connect", async () => {
      logger.info("Connected to server successfully");

      // Single state event handler
      socket.on("state", (msg) => {
        if (msg === "bidding Start") {
          logger.debug("Betting stage started");
          canPlaceBet = true;

          // If we have a pending bet, place it now
          if (pendingBet) {
            logger.debug("Placing pending bet");
            placeBet(pendingBet.stake, pendingBet.colors, pendingBet.resolve);
            pendingBet = null;
          }
        } else if (msg === "resut Start") {
          logger.debug("Results stage started");
          canPlaceBet = false;
        }
      });

      try {
        // Try to register first, then login
        await register();
        await login();

        // Run simulations
        for (let i = 0; i < TOTAL_SIMULATIONS; i++) {
          logger.info(`Starting simulation ${i + 1}/${TOTAL_SIMULATIONS}`);
          await simulateBet();

          if ((i + 1) % 100 === 0) {
            logger.info(`Completed ${i + 1} simulations...`);
            // Log intermediate statistics
            logger.stats(`Intermediate Statistics at ${i + 1} simulations:`);
            logger.stats(
              `- Average Stake: ${(stats.totalStakes / (i + 1)).toFixed(2)}`
            );
            logger.stats(
              `- Average Payout: ${(stats.totalPayouts / (i + 1)).toFixed(2)}`
            );
            logger.stats(
              `- Current Platform Profit: ${stats.platformProfit.toFixed(2)}`
            );
          }
        }

        // Calculate final statistics
        stats.averageStake = stats.totalStakes / stats.totalBets;
        stats.averagePayout = stats.totalPayouts / stats.totalBets;

        logger.info("All simulations completed. Generating final report...");

        // Generate report
        generateReport();

        // Save detailed bet history to file
        const fs = require("fs");
        fs.writeFileSync(
          "bet_history.json",
          JSON.stringify(stats.betHistory, null, 2)
        );
        logger.info("Bet history saved to bet_history.json");

        // Disconnect
        socket.disconnect();
        logger.info("Disconnected from server");
      } catch (error) {
        logger.error(`Simulation error: ${error.message}`);
        socket.disconnect();
      }
    });

    socket.on("error", (error) => {
      logger.error(`Socket error: ${error.message}`);
    });

    socket.on("disconnect", () => {
      logger.warn("Disconnected from server");
    });
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Generate detailed report
function generateReport() {
  logger.info("Generating final simulation report...");

  console.log("\n=== SIMULATION REPORT ===");
  console.log(`Total Simulations: ${TOTAL_SIMULATIONS}`);
  console.log("\n=== Financial Statistics ===");
  console.log(`Total Stakes: ${stats.totalStakes.toFixed(2)}`);
  console.log(`Total Payouts: ${stats.totalPayouts.toFixed(2)}`);
  console.log(`Platform Profit: ${stats.platformProfit.toFixed(2)}`);
  console.log(`Average Stake: ${stats.averageStake.toFixed(2)}`);
  console.log(`Average Payout: ${stats.averagePayout.toFixed(2)}`);
  console.log(`Maximum Payout: ${stats.maxPayout.toFixed(2)}`);
  console.log(`Minimum Payout: ${stats.minPayout.toFixed(2)}`);
  console.log(`Maximum Profit: ${stats.maxProfit.toFixed(2)}`);
  console.log(`Minimum Profit: ${stats.minProfit.toFixed(2)}`);

  console.log("\n=== Win Distribution ===");
  Object.entries(stats.winDistribution).forEach(([matches, count]) => {
    const percentage = ((count / TOTAL_SIMULATIONS) * 100).toFixed(2);
    console.log(`${matches} matches: ${count} (${percentage}%)`);
  });

  console.log("\n=== Profit Distribution ===");
  console.log(
    `Positive Profits: ${stats.profitDistribution.positive} (${(
      (stats.profitDistribution.positive / TOTAL_SIMULATIONS) *
      100
    ).toFixed(2)}%)`
  );
  console.log(
    `Negative Profits: ${stats.profitDistribution.negative} (${(
      (stats.profitDistribution.negative / TOTAL_SIMULATIONS) *
      100
    ).toFixed(2)}%)`
  );
  console.log(
    `Zero Profits: ${stats.profitDistribution.zero} (${(
      (stats.profitDistribution.zero / TOTAL_SIMULATIONS) *
      100
    ).toFixed(2)}%)`
  );

  // Algorithm Analysis
  console.log("\n=== Algorithm Analysis ===");
  const winRate = (
    (stats.profitDistribution.positive / TOTAL_SIMULATIONS) *
    100
  ).toFixed(2);
  const houseEdge = ((stats.platformProfit / stats.totalStakes) * 100).toFixed(
    2
  );
  console.log(`Player Win Rate: ${winRate}%`);
  console.log(`House Edge: ${houseEdge}%`);

  // Identify potential issues
  console.log("\n=== Potential Issues ===");
  if (stats.platformProfit < 0) {
    logger.warn("WARNING: Platform is losing money!");
    console.log("WARNING: Platform is losing money!");
  }
  if (stats.winDistribution[5] > TOTAL_SIMULATIONS * 0.1) {
    logger.warn("WARNING: High frequency of perfect matches!");
    console.log("WARNING: High frequency of perfect matches!");
  }
  if (stats.averagePayout > stats.averageStake * 3) {
    logger.warn("WARNING: Average payout is too high!");
    console.log("WARNING: Average payout is too high!");
  }

  // Additional analysis
  console.log("\n=== Additional Analysis ===");
  const consecutiveWins = analyzeConsecutiveWins(stats.betHistory);
  console.log(`Maximum Consecutive Wins: ${consecutiveWins.max}`);
  console.log(`Maximum Consecutive Losses: ${consecutiveWins.maxLosses}`);

  // Pattern analysis
  const patternAnalysis = analyzePatterns(stats.betHistory);
  console.log("\n=== Pattern Analysis ===");
  console.log(
    `Most Common Winning Pattern: ${patternAnalysis.mostCommonWinningPattern.join(
      ", "
    )}`
  );
  console.log(
    `Least Common Winning Pattern: ${patternAnalysis.leastCommonWinningPattern.join(
      ", "
    )}`
  );
}

// Helper function to analyze consecutive wins/losses
function analyzeConsecutiveWins(betHistory) {
  let currentStreak = 0;
  let maxStreak = 0;
  let currentLossStreak = 0;
  let maxLossStreak = 0;

  betHistory.forEach((bet) => {
    if (bet.profitLoss > 0) {
      currentStreak++;
      currentLossStreak = 0;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (bet.profitLoss < 0) {
      currentLossStreak++;
      currentStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    } else {
      currentStreak = 0;
      currentLossStreak = 0;
    }
  });

  return { max: maxStreak, maxLosses: maxLossStreak };
}

// Helper function to analyze patterns
function analyzePatterns(betHistory) {
  const winningPatterns = betHistory
    .filter((bet) => bet.profitLoss > 0)
    .map((bet) => bet.colors.join(","));

  const patternCounts = winningPatterns.reduce((acc, pattern) => {
    acc[pattern] = (acc[pattern] || 0) + 1;
    return acc;
  }, {});

  const sortedPatterns = Object.entries(patternCounts).sort(
    (a, b) => b[1] - a[1]
  );

  return {
    mostCommonWinningPattern: sortedPatterns[0]
      ? sortedPatterns[0][0].split(",")
      : [],
    leastCommonWinningPattern: sortedPatterns[sortedPatterns.length - 1]
      ? sortedPatterns[sortedPatterns.length - 1][0].split(",")
      : [],
  };
}

// Run the simulation
runSimulation();
