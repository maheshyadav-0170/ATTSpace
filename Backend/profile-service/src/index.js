const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const routes = require("./routes");
const { port } = require("./config");

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());

app.use("/profile", routes);

app.listen(4003, () => {
  console.log("Profile Service running on port : " . port);
});
