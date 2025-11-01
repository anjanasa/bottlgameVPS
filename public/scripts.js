var usernameIn = "anjana111";
var passwordIn = "111";
var bgVol = 5;
var effectsVol = 50;
var color_lst = [
  {
    color: "#FF0000",
    name: "Red",
  },
  {
    color: "#00FF00",
    name: "Green",
  },
  {
    color: "#0000FF",
    name: "Blue",
  },
  {
    color: "#FFFF00",
    name: "Yellow",
  },
  {
    color: "#00FFFF",
    name: "Cyan",
  },
];
var selectorList = [
  {
    color: "0",
    path: "/assets/selectColor/red.png",
    type: "red",
  },
  {
    color: "1",
    path: "/assets/selectColor/green.png",
    type: "green",
  },
  {
    color: "2",
    path: "/assets/selectColor/blue.png",
    type: "blue",
  },
  {
    color: "3",
    path: "/assets/selectColor/cyan.png",
    type: "cyan",
  },
  {
    color: "4",
    path: "/assets/selectColor/yellow.png",
    type: "yellow",
  },
];
var palletclorpaths = [
  {
    color: "0",
    path: "/assets/colorPal/red.png",
    type: "red",
  },
  {
    color: "1",
    path: "/assets/colorPal/green.png",
    type: "green",
  },
  {
    color: "2",
    path: "/assets/colorPal/blue.png",
    type: "blue",
  },
  {
    color: "3",
    path: "/assets/colorPal/cyan.png",
    type: "cyan",
  },
  {
    color: "4",
    path: "/assets/colorPal/yellow.png",
    type: "yellow",
  },
];
var colorObject = [];
var clickedSlot = null;
const socket = io("http://localhost:3000");
//const socket = io("https://bottlegame.playislandrush.com/");

socket.on("connect", () => {
  console.log("Connected to the server");
  socket.emit("com", "socket");

  /*tryining to loging*/
  //socket.emit("login", usernameIn, passwordIn, socket.id);
  //console.log("trying to login", usernameIn, passwordIn, socket.id);

  //show login screen
  const loginContainer = document.getElementById("loginContainer");
  const waitScreen = document.getElementById("waitScreen");
  loginContainer.style.display = "flex";
  waitScreen.style.display = "none";
});
socket.on("com", (data) => {
  //console.log("welcome: "+data);
});
const colhiscontainer = document.getElementById("colhiscontainer");
const hiscolorchiles = colhiscontainer.querySelectorAll(".hiscolor");
socket.on("hiscolors", (data) => {
  colhiscontainer.innerHTML = "";
  //console.log(data);
  for (let i = 0; i < data.length; i++) {
    const element = data[i];
    //console.log(element);
    const subdiv = document.createElement("div");
    subdiv.classList.add("hiscolor");
    colhiscontainer.appendChild(subdiv);
    //console.log(hiscolorchiles);
    for (let j = 0; j < element.length; j++) {
      const element2 = element[j];
      //console.log(getPathByColor(element2));
      const botdiv = document.createElement("div");
      botdiv.classList.add("hiscolorbottle");
      botdiv.innerHTML = `<img src="${getPathByColor(
        element2
      )}" alt="" class="hiscolorbottle">`;
      subdiv.appendChild(botdiv);
    }
    if (i == 4) {
      subdiv.classList.add("glow");
      bounce(subdiv);
    }
  }
  async function bounce(element) {
    element.classList.add("bounce");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    element.classList.remove("bounce");
  }
});
var serverpattern = null;
socket.on("bestPattern", (pattern) => {
  //console.log("server genarated patern: ",pattern);
  serverpattern = pattern;
  BottleShow();
});
var loggedUser = null;
socket.on("login", (msg, data) => {
  //console.log(msg, data);
  let loginContainer = document.getElementById("loginContainer");
  const waitScreen = document.getElementById("waitScreen");
  if (msg == "Login successful") {
    //console.log(msg, data);
    loggedUser = data;
    loginContainer.style.display = "none";
    waitScreen.style.display = "none";
    const balvalue = document.getElementById("balvalue");
    balvalue.innerHTML = data.balance;
    alert("Login successful", "type");
    show(); //show pallette after loggin succsess

    //shof info
    const infoContainer = document.getElementById("infoContainer");
    infoContainer.style.display = "flex";
    const token = generateToken();
    /*console.log(
      "token: ",
      token,
      "loggedUser.id: ",
      loggedUser.user_id,
      socket.id
    );*/
    loggedUser.token = token;
    socket.emit("token", token, loggedUser.user_id, socket.id);
  }
  if (msg == "Login failed") {
    //console.log(msg);
  }
});
socket.on("updateUserInformation", (userdata) => {
  loggedUser = userdata;
  const balvalue = document.getElementById("balvalue");
  balvalue.innerHTML = userdata.balance;
  upUSData();
});
socket.on("registered", (msg, user, pass, userdata) => {
  console.log(msg, user, pass, userdata);
});
socket.on("current state", (msg, state) => {
  //console.log(msg, state);
  const stateShowContainer = document.getElementById("stateShowContainer");
  if (state == "bs") {
    //stateShowContainer.innerHTML = "Contest Close in: " + msg;
    stateShowContainer.innerHTML = msg;
    if (msg <= 5) {
      tick_tick.play();
    }
  }
  if (state == "ss") {
    //stateShowContainer.innerHTML = "Contest Start in: " + msg;
    stateShowContainer.innerHTML = msg;
    if (msg <= 5) {
      tick_tick.play();
    }
    const getReadyContainer = document.getElementById("getReadyContainer");
    const getReadyText = document.getElementById("getReadyText");
    if (msg <= 5) {
      getReadyText.innerHTML = `Get Ready For Next Round! <br><span id="getreadyCountDown">${msg}</span>`;
      getReadyContainer.style.display = "flex";
    }
    if (msg == 1) {
      getReadyText.innerHTML = "Start Now!";
    }
    if (msg == 0) {
      getReadyContainer.style.display = "none";
      show();
    }
  }
});
socket.on("guserdata", (data) => {
  //console.log(data);
  if (loggedUser != null) {
    function maskNames(data) {
      return data.map((item) => {
        let name = item.name;
        let maskedName =
          name.length > 3
            ? name.substring(0, 3) + "*".repeat(name.length - 3)
            : name; // If name is 3 or fewer characters, keep it unchanged

        return { ...item, name: maskedName };
      });
    }

    let maskedUsers = maskNames(data);
    //console.log(maskedUsers);

    const currunt_trade_container = document.getElementById(
      "currunt-trade-container"
    );
    currunt_trade_container.innerHTML = "";
    for (let i = 0; i < maskedUsers.length; i++) {
      const user = maskedUsers[i];
      const getmy = data[i];
      let subDiv = document.createElement("div");
      subDiv.innerHTML = `
              <div>${user.name + " :"}</div>
              <div>${user.bet.toFixed(2)}</div></div>
          `;
      if (getmy.name == loggedUser.user_name) {
        subDiv.classList.add("trade-item-my");
      } else {
        subDiv.classList.add("trade-item");
      }
      currunt_trade_container.appendChild(subDiv);
    }
  }
});
socket.on("state", (msg) => {
  //console.log(msg);
  if (msg == "bidding Start") {
    //reset color selector to default gray
    for (let j = 0; j < colorSelectChilds.length; j++) {
      const element = colorSelectChilds[j];
      element.src = "/assets/selectColor/gray.png";
    }
    BottleHide();
    createCirlce();
    //hide();
    const waitmsg = document.getElementById("waitmsg");
    waitmsg.style.display = "none";
    const cancel = document.getElementById("cancel");
    cancel.style.display = "flex";
    const submit = document.getElementById("submit");
    submit.style.display = "flex";
    currunt_Selected_Color = null;
    currunt_Selected_Color_pallet_item = null;
  } else {
    const waitmsg = document.getElementById("waitmsg");
    waitmsg.style.display = "flex";
    const cancel = document.getElementById("cancel");
    cancel.style.display = "none";
    const submit = document.getElementById("submit");
    submit.style.display = "none";
    //console.log(msg);
    //BottleShow()
  }
});
socket.on("bid", (msg, stake) => {
  if (msg == "bid place succesfull") {
    //console.log(msg);
    const balvalue = document.getElementById("balvalue");
    const newBalance = loggedUser.balance - stake;
    balvalue.innerHTML = newBalance.toFixed(2);
    loggedUser.balance = newBalance;
    const waitmsg = document.getElementById("waitmsg");
    waitmsg.style.display = "flex";
    const cancel = document.getElementById("cancel");
    cancel.style.display = "none";
    const submit = document.getElementById("submit");
    submit.style.display = "none";

    const bid_placed_alertDiv = document.getElementById("bid_placed_alertDiv");
    async function bid_placed_alert() {
      bid_placed_alertDiv.style.display = "flex";
      await new Promise((resolve) => setTimeout(resolve, 2000));
      bid_placed_alertDiv.style.display = "none";
    }
    bid_placed_alert();
  }
  if (msg == "Insufficient balance") {
    alert(
      "Insufficient balance please click on wallet icon to deposit!",
      "type"
    );
  }
});
socket.on("profitLossResult", (result) => {
  console.log("=== Profit/Loss Result Details ===");
  console.log("Result Object:", result);
  console.log("Is Win:", result.isWin);
  console.log("Profit/Loss Amount:", result.profitLoss);
  console.log("Number of Matches:", result.matches);
  console.log("Return Percentage:", result.returnPercentage);
  console.log("Payout Amount:", result.payout);

  // Request updated balance from server
  socket.emit("getUpdatedBalance", loggedUser.Serial);

  // Show results using existing HTML structure
  setTimeout(() => {
    const proftlossShow = document.getElementById("proftlossShow");
    const resultmsg = document.getElementById("resultmsg");
    const plstatus = document.getElementById("plstatus");
    const earned = document.getElementById("earned");

    proftlossShow.style.display = "flex";

    if (result.isWin) {
      console.log("=== Win Details ===");
      console.log("Win Amount:", result.profitLoss);
      console.log("Multiplier Used:", result.returnPercentage + "x");

      // Play winning sound
      if (effectsVol > 0) {
        const winSound = new Audio("/assets/sounds/win.mp3");
        winSound.volume = effectsVol / 100;
        winSound.play();
        console.log("Playing win sound at volume:", effectsVol / 100);
      }

      resultmsg.innerHTML = "Congratulations You Won!";
      plstatus.innerHTML = "WON";
      earned.innerHTML = `+${result.profitLoss}`;
      plstatus.style.color = "#4CAF50"; // Green color for win
    } else {
      console.log("=== Loss Details ===");
      console.log("Loss Amount:", Math.abs(result.profitLoss));
      console.log("Number of Matches:", result.matches);

      resultmsg.innerHTML = "Better Luck Next Time";
      plstatus.innerHTML = "LOST";
      earned.innerHTML = `-${Math.abs(result.profitLoss)}`;
      plstatus.style.color = "#f44336"; // Red color for loss
    }

    // Add matches and multiplier info
    /*
    const matchesInfo = document.createElement("div");
    matchesInfo.className = "matches-info";
    matchesInfo.innerHTML = `
      <p>Matches: ${result.matches}</p>
      ${result.isWin ? `<p>Multiplier: ${result.returnPercentage}x</p>` : ""}
    `;
    proftlossShow.appendChild(matchesInfo);
    */

    // Hide after 5 seconds
    setTimeout(() => {
      proftlossShow.style.display = "none";
      // Remove the matches info
      const matchesInfo = proftlossShow.querySelector(".matches-info");
      if (matchesInfo) {
        matchesInfo.remove();
      }
    }, 5000);
  }, 5000);
});

// Add new socket event listener for updated balance
socket.on("updatedBalance", (newBalance) => {
  console.log("Received updated balance from server:", newBalance);
  const balvalue = document.getElementById("balvalue");
  balvalue.innerHTML = newBalance.toFixed(2);
  loggedUser.balance = newBalance;
});

function upUSData() {
  console.log("updates user data passed");
  const balvalue = document.getElementById("balvalue");
  balvalue.innerHTML = data.balance;
}
const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  //console.log(username, password);
  socket.emit("login", username, password, socket.id);
});
const registerForm = document.getElementById("registerForm");
registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fristname = document.getElementById("registerFristname").value;
  const lastname = document.getElementById("registerLastname").value;
  const phonenumber = document.getElementById("phonenumber").value;
  const username = document.getElementById("registerUsername").value;
  const password = document.getElementById("registerPassword").value;
  console.log(fristname, lastname, phonenumber, username, password);
  if (phonenumber.length < 9) {
    alert("Please enter a valid phone number");
  }
  socket.emit(
    "register",
    fristname,
    lastname,
    phonenumber,
    username,
    password,
    socket.id
  );
});

const loginPage = document.getElementById("loginPage");
loginPage.addEventListener("click", () => {
  const registerInputContainer = document.getElementById(
    "registerInputContainer"
  );
  const loginInputContainer = document.getElementById("loginInputContainer");

  registerInputContainer.classList.add("regloghide");
  registerInputContainer.classList.remove("registerInputContainer");

  loginInputContainer.classList.add("loginInputContainer");
  loginInputContainer.classList.remove("regloghide");
});

const registerPage = document.getElementById("registerPage");
registerPage.addEventListener("click", () => {
  const registerInputContainer = document.getElementById(
    "registerInputContainer"
  );
  const loginInputContainer = document.getElementById("loginInputContainer");

  registerInputContainer.classList.add("registerInputContainer");
  registerInputContainer.classList.remove("regloghide");

  loginInputContainer.classList.add("regloghide");
  loginInputContainer.classList.remove("loginInputContainer");
});

function createCirlce() {
  const palette = document.getElementById("palette");
  //console.log(palette)
  palette.innerHTML = `
  <img src="/assets/colorPal/red.png" class="circle color1" alt="0" style="transform: translate(60px, 0px); opacity: 1;">
  <img src="/assets/colorPal/green.png" class="circle color2" alt="1" style="transform: translate(18.541px, 57.0634px); opacity: 1;">
  <img src="/assets/colorPal/blue.png" class="circle color3" alt="2" style="transform: translate(-48.541px, 35.2671px); opacity: 1;">
  <img src="/assets/colorPal/cyan.png" class="circle color4" alt="3" style="transform: translate(-48.541px, -35.2671px); opacity: 1;">
  <img src="/assets/colorPal/yellow.png" class="circle color5" alt="4" style="transform: translate(18.541px, -57.0634px); opacity: 1;">
 `;
  //console.log(palette.innerHTML)
  show();
}
var currunt_Selected_Color = null;
var currunt_Selected_Color_pallet_item = null;
function show() {
  const circles = document.querySelectorAll(".circle");
  const radius = 60; // Radius of the circular arrangement
  const centerX = 100; // Center of the container (half of palette width)
  const centerY = 100;

  // Arrange images in a circular pattern and listen click events
  circles.forEach((circle, index) => {
    const angle = (index / circles.length) * (2 * Math.PI); // Divide 360 degrees into equal parts
    const x = centerX + radius * Math.cos(angle); // X-coordinate
    const y = centerY + radius * Math.sin(angle); // Y-coordinate
    circle.style.transform = `translate(${x - centerX}px, ${y - centerY}px)`;
    circle.style.opacity = 1; // Make visible
    circle.addEventListener("click", () => {
      buttonPressed3.play();
      //console.log(`Circle ${index} clicked`);
      const path = circle.getAttribute("src");
      //console.log(path);
      //get selected color
      for (let k = 0; k < palletclorpaths.length; k++) {
        const element = palletclorpaths[k];
        if (element.path == path) {
          //here is the selected color
          currunt_Selected_Color = element.type;
          currunt_Selected_Color_pallet_item = circle;
          //console.log(currunt_Selected_Color,currunt_Selected_Color_pallet_item);
          //currunt_Selected_Color_pallet_item.remove();
        }
      }
    });
  });
}
function hide() {
  const circles = document.querySelectorAll(".circle");

  // Reset the circles to the center and hide them
  circles.forEach((circle) => {
    circle.style.transform = `translate(-50%, -50%)`;
    circle.style.opacity = 0; // Make invisible
  });
}
//cancel submit button actions
const buttonsChilds = document
  .getElementById("buttonContainer")
  .querySelectorAll("div");
var isallselect = false;
for (let i = 0; i < buttonsChilds.length; i++) {
  const element = buttonsChilds[i];
  element.addEventListener("click", () => {
    if (element.id == "submit") {
      buttonPressed3.play();
      isallselect = true;
      //console.log('submit clicked');

      let color_lst = [];
      const colorSelectChilds = document.querySelectorAll(".colorSelect");
      for (let k = 0; k < colorSelectChilds.length; k++) {
        const element = colorSelectChilds[k];
        let pathname = new URL(element.src).pathname;
        //console.log(element.src);
        /*check if there epmty slot*/
        if (pathname == "/assets/selectColor/gray.png") {
          isallselect = false;
        }
        for (let l = 0; l < selectorList.length; l++) {
          const element = selectorList[l];
          if (element.path == pathname) {
            color_lst.push(element.type);
          }
        }
      }
      console.log(color_lst);
      let stakeInput = document.getElementById("stakeInput").value;
      colorObject = [
        {
          stake: stakeInput,
          socket: socket.id,
          colors: color_lst,
          user_name: loggedUser.user_name,
          Serial: loggedUser.Serial,
        },
      ];
      //console.log(colorObject, isallselect);
      if (isallselect == true) {
        if (stakeInput < 10) {
          alert("please enter stake greater than 10", "type");
        } else {
          //console.log('submit check passed');
          //console.log(loggedUser);
          socket.emit(
            "ColSend",
            colorObject,
            loggedUser.Serial,
            socket.id,
            loggedUser.user_name
          );
          hide();
        }
      } else {
        alert("Please select all colors");
      }
      //socket.emit('submit', selectorList, clickedSlot);
    } else if (element.id == "cancel") {
      buttonPressed3.play();
      //console.log('cancel clicked');
      createCirlce();
      for (let j = 0; j < colorSelectChilds.length; j++) {
        const element = colorSelectChilds[j];
        element.src = "/assets/selectColor/gray.png";
      }
    }
  });
}
//colorSelect section
const colorSelectChilds = document.querySelectorAll(".colorSelect");
for (let i = 0; i < colorSelectChilds.length; i++) {
  const element = colorSelectChilds[i];
  element.addEventListener("click", () => {
    //console.log(element.attributes.src.value);
    //clickedSlot = element.attributes.name.value;
    buttonPressed.play();
    //console.log(element);
    if (element.attributes.src.value == "/assets/selectColor/gray.png") {
      if (currunt_Selected_Color == null) {
        alert("Please select a color first");
      } else {
        for (let l = 0; l < selectorList.length; l++) {
          const element2 = selectorList[l];
          if (currunt_Selected_Color == element2.type) {
            //console.log(element2.path);
            element.attributes.src.value = element2.path;
          }
        }
        currunt_Selected_Color = null;
        currunt_Selected_Color_pallet_item.remove();
        show();
      }
    } else {
      alert("Please select a Empty slot");
    }
  });
}
var buttonPressed = new Howl({
  src: ["assets/Sound_Effects/button-202966.mp3"],
  volume: effectsVol / 10,
  html5: false,
  /*onend: function() {
      console.log('Sound finished playing!');
    },
    onplay: function() {
      console.log('Sound started playing!');
    },
    onpause: function() {
      console.log('Sound paused!');
    },
    onstop: function() {
      console.log('Sound stopped!');
    },
    onseek: function() {
      console.log('Sound seeked!');
    },*/
  loop: false,
});
var buttonPressed2 = new Howl({
  src: ["assets/Sound_Effects/button-124476.mp3"],
  volume: effectsVol / 10,
  html5: false,
  /*onend: function() {
      console.log('Sound finished playing!');
    },
    onplay: function() {
      console.log('Sound started playing!');
    },
    onpause: function() {
      console.log('Sound paused!');
    },
    onstop: function() {
      console.log('Sound stopped!');
    },
    onseek: function() {
      console.log('Sound seeked!');
    },*/
  loop: false,
});
var buttonPressed3 = new Howl({
  src: ["assets/Sound_Effects/button-9-88354.mp3"],
  volume: effectsVol / 10,
  html5: false,
  /*onend: function() {
      console.log('Sound finished playing!');
    },
    onplay: function() {
      console.log('Sound started playing!');
    },
    onpause: function() {
      console.log('Sound paused!');
    },
    onstop: function() {
      console.log('Sound stopped!');
    },
    onseek: function() {
      console.log('Sound seeked!');
    },*/
  loop: false,
});
var bgSoundTrack = new Howl({
  src: ["assets/Sound_Effects/funk-casino-163105.mp3"],
  volume: bgVol / 10,
  html5: false,
  loop: true,
});
bgSoundTrack.play();

var tick_tick = new Howl({
  src: ["assets/Sound_Effects/beepd-86247.mp3"],
  volume: effectsVol / 10,
  html5: false,
  loop: false,
});

async function alert(text, type) {
  const alertBox = document.getElementById("alertBox");
  const notyText = document.getElementById("notyText");

  notyText.innerHTML = text;

  alertBox.style.display = "flex";
  alertBox.classList.remove("alterbox_hide");
  alertBox.classList.add("alterbox_show");

  await new Promise((resolve) => setTimeout(resolve, 3000));
  alertBox.classList.remove("alterbox_show");
  alertBox.classList.add("alterbox_hide");

  await new Promise((resolve) => setTimeout(resolve, 1000));
  alertBox.style.display = "none";
}
const bottleColorArray = [
  { color: "red", path: "/assets/bottles/red.png" },
  { color: "green", path: "/assets/bottles/green.png" },
  { color: "blue", path: "/assets/bottles/blue.png" },
  { color: "cyan", path: "/assets/bottles/cyan.png" },
  { color: "yellow", path: "/assets/bottles/yellow.png" },
];
function getPathByColor(color) {
  const bottle = bottleColorArray.find((bottle) => bottle.color === color);
  return bottle ? bottle.path : "";
}
BottleHide();
// Show gray bottles one by one
function BottleShow() {
  const bottleImages = document.querySelectorAll(".bottleReavel");
  bottleImages.forEach((img, index) => {
    setTimeout(() => {
      //console.log('showing bottle: ' + index);
      const newColorPath = getPathByColor(serverpattern[index]); // Get the color path
      img.style.animation = "hideBounce 1s ease-in forwards"; // Animate hide
      setTimeout(() => {
        img.src = newColorPath; // Replace with colored bottle
        img.style.animation = "revealBounce 1s ease-out forwards"; // Animate reveal
        img.classList.remove("hidden");
      }, 1000); // Wait for hide animation to finish
    }, index * 1000); // Delay for sequential animation
  });
}
// Hide colored bottles one by one
function BottleHide() {
  const bottleImages = document.querySelectorAll(".bottleReavel");
  [...bottleImages].reverse().forEach((img, index) => {
    setTimeout(() => {
      const grayBottlePath = "/assets/bottles/graybottle.png"; // Get gray bottle path
      img.style.animation = "hideBounce 1s ease-in forwards"; // Animate hide
      setTimeout(() => {
        img.src = grayBottlePath; // Replace with gray bottle
        img.style.animation = "revealBounce 1s ease-out forwards"; // Animate reveal
        img.classList.remove("hidden");
      }, 1000); // Wait for hide animation to finish
    }, index * 1000); // Delay for sequential animation
  });
}

const walletIcon = document.getElementById("walletIcon");
walletIcon.addEventListener("click", walletgo);
const walletIconimg = document.getElementById("walletIconimg");
walletIcon.addEventListener("click", walletgo);

function walletgo() {
  //console.log("calling sun");
  /*window.location.href =
    "https://playislandrush.com/wallet/index.php?user_id=170&token=a40c733bfeaddecfb16f09c9628fda2cebee5ff62518eea97188a9e0b975bedb";
    */
  console.log(
    `https://playislandrush.com/wallet/index.php?user_id=${loggedUser.user_id}&token=${loggedUser.token}`
  );
  //window.location.href = `https://playislandrush.com/wallet/index.php?user_id=${loggedUser.user_id}&token=${loggedUser.token}`;
}

/*
const bgVolPlus = document.getElementById("bgVolPlus");
const bgVolPresentage = document.getElementById("bgVolPresentage");
bgVolPlus.addEventListener("click", bgvolup);
function bgvolup() {
  bgVol = bgVol + 5;
  bgVolPresentage.innerHTML = bgVol + "%";
  bgSoundTrack.unload();
  bgSoundTrack = new Howl({
    src: ["assets/Sound_Effects/funk-casino-163105.mp3"],
    volume: bgVol / 10,
    html5: false,
    loop: true,
  });
  bgSoundTrack.play();
  console.log(bgVol);
}
const bgVolMinus = document.getElementById("bgVolMinus");
bgVolMinus.addEventListener("click", bgvolDown);
function bgvolDown() {
  bgVol = bgVol - 5;
  bgVolPresentage.innerHTML = bgVol + "%";
  bgSoundTrack.unload();
  bgSoundTrack = new Howl({
    src: ["assets/Sound_Effects/funk-casino-163105.mp3"],
    volume: bgVol / 10,
    html5: false,
    loop: true,
  });
  bgSoundTrack.play();
  console.log(bgVol);
}

const effectsVolPresentage = document.getElementById("effectsVolPresentage");
const effectsVolPlus = document.getElementById("effectsVolPlus");
effectsVolPlus.addEventListener("click", effectup);
function effectup() {
  effectsVol = effectsVol + 5;
  if (effectsVol <= 0) {
    effectsVol = 0;
  }
  effectsVolPresentage.innerHTML = effectsVol + "%";
  tick_tick.unload();
  tick_tick = new Howl({
    src: ["assets/Sound_Effects/beepd-86247.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
  buttonPressed3.unload();
  buttonPressed3 = new Howl({
    src: ["assets/Sound_Effects/button-9-88354.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
  buttonPressed2.unload();
  buttonPressed2 = new Howl({
    src: ["assets/Sound_Effects/button-124476.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
  buttonPressed.unload();
  buttonPressed = new Howl({
    src: ["assets/Sound_Effects/button-202966.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
}
const effectsVolMinus = document.getElementById("effectsVolMinus");
effectsVolMinus.addEventListener("click", effectDown);
function effectDown() {
  effectsVol = effectsVol - 5;
  if (effectsVol <= 0) {
    effectsVol = 0;
  }
  effectsVolPresentage.innerHTML = effectsVol + "%";
  tick_tick.unload();
  tick_tick = new Howl({
    src: ["assets/Sound_Effects/beepd-86247.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
  buttonPressed3.unload();
  buttonPressed3 = new Howl({
    src: ["assets/Sound_Effects/button-9-88354.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
  buttonPressed2.unload();
  buttonPressed2 = new Howl({
    src: ["assets/Sound_Effects/button-124476.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
  buttonPressed.unload();
  buttonPressed = new Howl({
    src: ["assets/Sound_Effects/button-202966.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
}
*/
const SettingsIcon = document.getElementById("SettingsIcon");
const settingsContainer = document.getElementById("settingsContainer");
SettingsIcon.addEventListener("click", settingsClick);
function settingsClick() {
  if (settingsContainer.style.display == "flex") {
    settingsContainer.style.display = "none";
  } else {
    settingsContainer.style.display = "flex";
  }
  //console.log(settingsContainer.style.display);
}

//bg music off on functions
const bgMuteBtn = document.getElementById("bgMuteBtn");
const bgmusicSt = document.getElementById("bgmusicSt");
bgMuteBtn.addEventListener("click", bgMute);
function bgMute() {
  if (bgSoundTrack.playing()) {
    document
      .getElementById("bgMuteBtn")
      .style.setProperty("--translateX", "0px");
    bgmusicSt.innerHTML = "OFF";
    bgmusicSt.classList.remove("bgmusicSt_right");
    bgmusicSt.classList.add("bgmusicSt_left");
    bgMuteBtn.style.backgroundColor = "#787878";
    bgSoundTrack.pause();
  } else {
    bgSoundTrack.play();
    document
      .getElementById("bgMuteBtn")
      .style.setProperty("--translateX", "-45px");
    bgmusicSt.innerHTML = "ON";
    bgmusicSt.classList.remove("bgmusicSt_left");
    bgmusicSt.classList.add("bgmusicSt_right");
    bgMuteBtn.style.backgroundColor = "#01a2ff";
  } // Use 'input' instead of 'change'
}

//effects off on functions
const efMuteBtn = document.getElementById("efMuteBtn");
const efmusicSt = document.getElementById("efmusicSt");
efMuteBtn.addEventListener("click", efMute);
function efMute() {
  if (efmusicSt.innerHTML == "ON") {
    document
      .getElementById("efMuteBtn")
      .style.setProperty("--translateX", "0px");
    efmusicSt.innerHTML = "OFF";
    efmusicSt.classList.remove("bgmusicSt_right");
    efmusicSt.classList.add("bgmusicSt_left");
    efMuteBtn.style.backgroundColor = "#787878";
    effectsVol = 0;
  } else {
    effectsVol = 50;
    document
      .getElementById("efMuteBtn")
      .style.setProperty("--translateX", "-45px");
    efmusicSt.innerHTML = "ON";
    efmusicSt.classList.remove("bgmusicSt_left");
    efmusicSt.classList.add("bgmusicSt_right");
    efMuteBtn.style.backgroundColor = "#01a2ff";
  } // Use 'input' instead of 'change'
  tick_tick.unload();
  tick_tick = new Howl({
    src: ["assets/Sound_Effects/beepd-86247.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
  buttonPressed3.unload();
  buttonPressed3 = new Howl({
    src: ["assets/Sound_Effects/button-9-88354.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
  buttonPressed2.unload();
  buttonPressed2 = new Howl({
    src: ["assets/Sound_Effects/button-124476.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
  buttonPressed.unload();
  buttonPressed = new Howl({
    src: ["assets/Sound_Effects/button-202966.mp3"],
    volume: effectsVol / 10,
    html5: false,
    loop: false,
  });
}

const infocloseBtn = document.getElementById("infocloseBtn");
infocloseBtn.addEventListener("click", infoclose);
function infoclose() {
  document.getElementById("infoContainer").style.display = "none";
}

//token genarattion functions
function generateToken() {
  // Create a Uint8Array with 32 random values (256 bits)
  const randomValues = new Uint8Array(32);

  // Fill it with cryptographically strong random values
  crypto.getRandomValues(randomValues);

  // Convert to hexadecimal string
  return Array.from(randomValues)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Example usage:
//console.log(generateToken()); // e.g. "a40c733bfeaddecfb16f09c9628fda2cebee5ff62518eea97188a9e0b975bedb"
//console.log(generateToken()); // Different token each time
