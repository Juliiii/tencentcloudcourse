const Capi = require("qcloudapi-sdk");
const config = require("./config");
const sharp = require("sharp");
const util = require("util");
const fs = require("fs");
const path = require("path");

module.exports = async function(image) {
  // new a Capi client
  const capi = new Capi({
    SecretId: config.secretId,
    SecretKey: config.secretKey,
    serviceType: "iai",
    baseHost: "tencentcloudapi.com",
    path: "/",
    signatureMethod: "sha256"
  });

  // promiseify capi.request, in order to use async await
  const capiRequestAsync = util.promisify(capi.request.bind(capi));

  // call DetectFace Tencentcloud Api, to get the face info of the image
  const faceInfo = await capiRequestAsync({
    Region: "ap-guangzhou",
    Action: "AnalyzeFace",
    Version: "2018-03-01",
    Image: image,
    SignatureMethod: "TC2-HmacSHA256"
  });

  // if error, throw it
  if (faceInfo.Response.Error) throw faceInfo.Response.Error;

  // pick the first face info of the result
  const { FaceProfile, Nose } = faceInfo.Response.FaceShapeSet[0];

  const LeftFacePoint = FaceProfile[2];
  const RightFacePoint = FaceProfile[18];
  const BottomFacePoint = FaceProfile[10];
  const CenterNodePoint = Nose[0];

  const maskWidth = Math.floor(
    Math.sqrt(
      Math.pow(LeftFacePoint.X - RightFacePoint.X, 2) +
        Math.pow(Math.abs(LeftFacePoint.Y - RightFacePoint.Y), 2)
    )
  );
  const maskHeight = Math.floor(
    Math.sqrt(
      Math.pow(CenterNodePoint.Y - BottomFacePoint.Y, 2) +
        Math.pow(CenterNodePoint.X - BottomFacePoint.X, 2)
    )
  );

  const angle =
    Math.atan(
      Math.abs(LeftFacePoint.Y - RightFacePoint.Y) /
        Math.abs(LeftFacePoint.X - RightFacePoint.X)
    ) /
    (Math.PI / 180);

  const persionImage = await sharp(Buffer.from(image, "base64"));

  const mask = await sharp(
    fs.readFileSync(path.resolve(__dirname, "mask.jpg"))
  );

  return persionImage
    .composite([
      {
        input: await mask
          .rotate(LeftFacePoint.Y > RightFacePoint.Y ? 0 - angle : angle, {
            background: {
              r: 0,
              g: 0,
              b: 0,
              alpha: 0
            }
          })
          .resize(maskWidth, maskHeight)
          .toBuffer(),
        top: CenterNodePoint.Y - 10,
        left: Math.floor(
          LeftFacePoint.X -
            (LeftFacePoint.Y > RightFacePoint.Y
              ? 0 - maskHeight * Math.tan((angle * Math.PI) / 180)
              : maskHeight * Math.tan((angle * Math.PI) / 180))
        )
      }
    ])
    .toBuffer();
};
