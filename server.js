const express = require("express");
const app = express();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./key.json');
const session = require("express-session");

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/views"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "hello",
  resave: false,
  saveUninitialized: true
}));

function isAuthenticated(req, res, next) {
  if (req.session.userdata) {
    return next();
  } else {
    res.redirect("/login");
  }
}

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.post("/registersubmit", (req, res) => {
  db.collection("users")
    .where("email", "==", req.body.email)
    .get()
    .then((docs) => {
      if (docs.size > 0) {
        res.render("registration",{errorMessage:"Email already in use"});
      } else {
        db.collection("users")
          .where("name", "==", req.body.name)
          .get()
          .then((docs) => {
            if (docs.size > 0) {
              res.render("registration",{errorMessage:"Username already in use"});
            } else {
              db.collection("users")
                .add({
                  age: req.body.age,
                  annualIncome: req.body.annualIncome,
                  email: req.body.email,
                  maritalStatus: req.body.maritalStatus,
                  name: req.body.name,
                  numChildren: req.body.numChildren,
                  password: req.body.password
                })
                .then(() => {
                  res.redirect("/login");
                });
            }
          });
      }
    });
});

app.post("/loginsubmit", (req, res) => {
  db.collection("users")
    .where("name", "==", req.body.name)
    .where("password", "==", req.body.password)
    .get()
    .then((docs) => {
      if (docs.size > 0) {
        const userdata = docs.docs[0].data();
        const userId=docs.docs[0].id;
        req.session.userdata = {
          id:userId,
          name: userdata.name,
          annualIncome: userdata.annualIncome,
          age: userdata.age,
          maritalStatus: userdata.maritalStatus,
          numChildren: userdata.numChildren,
          email: userdata.email,
          password:userdata.password
        };
        res.redirect("/home");
      } else {
        res.render("login", { errorMessage: "Incorrect username or password" });
        
      }
    });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/registration", (req, res) => {
  res.render("registration");
});

app.get("/about", isAuthenticated, (req, res) => {
  res.render("about");
});

app.get("/home", isAuthenticated, (req, res) => {
  const { name, annualIncome } = req.session.userdata;
  res.render("home", { name1: name, annualIncome });
});

app.get("/contact", isAuthenticated, (req, res) => {
  res.render("contact");
});
app.get("/business",isAuthenticated,(req,res)=>{
  res.render("business");
});
app.get("/government",isAuthenticated,(req,res)=>{
  res.render("government");
});
app.get("/trading",(req,res)=>{
  res.render("trading");
});

app.get("/settings", isAuthenticated, (req, res) => {
  res.render("settings");
});

app.post("/updateUserInfo", isAuthenticated, (req, res) => {
  const { name, email, age} = req.body;
  const userId=req.session.userdata.id;
  db.collection("users")
    .doc(userId)
    .update({
      name: name,
      email: email,
      age: parseInt(age),
    })
    .then(() => {
      req.session.userdata = { ...req.session.userdata, name, email, age, };

      res.redirect("/profile");
    })
    
    .catch((error) => {
      console.error("Error updating user information: ", error);
      res.status(500).send("Error updating user information.");
    });
});
app.post("/changePassword", isAuthenticated, (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.userdata.id;
  
  if (currentPassword === req.session.userdata.password) {
    if (newPassword === confirmPassword) {
      db.collection('users').doc(userId).update({ password: newPassword })
        .then(() => {
          req.session.userdata.password = newPassword;
          res.redirect("/profile");
        })
        
    } 
  } 
});



app.get("/profile", isAuthenticated, (req, res) => {
  const { name, annualIncome, age, maritalStatus, numChildren, email } = req.session.userdata;
  res.render("profile", {
    username: name,
    annualIncome,
    age,
    maritalStatus,
    numChildren,
    email
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.redirect("/home");
    } else {
      res.redirect("/login");
    }
  });
});

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
