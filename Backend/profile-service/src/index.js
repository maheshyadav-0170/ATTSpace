const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const routes = require("./routes");
const { port } = require("./config");

const app = express();

// Enable CORS for port 5173
app.use(
  cors({
    origin: "http://localhost:5173", // Replace with the actual URL of your frontend if it's different
    methods: ["GET", "POST", "PUT", "DELETE"], // Add more methods if needed
    credentials: true, // If you want to allow cookies and authentication headers
  })
);

app.use(bodyParser.json());
app.use(cookieParser());

app.use("/profile", routes);

app.listen(4003, () => {
  console.log(`Profile Service running on port: ${port}`);
});
