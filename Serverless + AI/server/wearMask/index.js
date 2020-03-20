"use strict";
const serverless = require("serverless-http");
const Koa = require("koa");
const cors = require("koa2-cors");
const bodyParser = require("koa-bodyparser");
const wearMask = require("./wearMask");
const app = new Koa();

app.use(cors());
app.use(bodyParser({ formLimit: "20mb" }));

app.use(async ctx => {
  const { image } = ctx.request.body;

  if (!image) throw "No Image";

  const resultBuffer = await wearMask(image);

  ctx.body = { code: 0, image: resultBuffer.toString("base64") };
});

exports.main_handler = serverless(app);
