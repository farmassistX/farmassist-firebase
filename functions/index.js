const alertConfig = require("./config/alert-config.json");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendAlertNotification = functions.database
  .ref("/telemetry_data/{uid}/{dataType}/{timestamp}")
  .onCreate(async (snapshot, context) => {
    const uid = context.params.uid;
    const dataType = context.params.dataType;
    const value = parseFloat(snapshot.val());
    const { lowerThreshold, upperThreshold } = alertConfig[dataType];

    let sendAlert = false;
    let description;
    let direction;
    let threshold;

    if (value < lowerThreshold) {
      sendAlert = true;
      description = "Low";
      direction = "below";
      threshold = lowerThreshold;
    } else if (value > upperThreshold) {
      sendAlert = true;
      description = "High";
      direction = "above";
      threshold = upperThreshold;
    }

    if (sendAlert) {
      const { name, unit } = alertConfig[dataType];

      return admin
        .firestore()
        .collection("users")
        .doc(`${uid}`)
        .get()
        .then(snapshot => {
          let tokens = snapshot.get("tokens");

          return admin.messaging().sendToDevice(
            tokens,
            {
              notification: {
                title: `${description} ${name}`,
                body: `Alert: Reading is ${direction} ${threshold}${unit}!`,
              },
            },
            {
              contentAvailable: true,
              priority: "high",
            }
          );
        });
    } else {
      return Promise.resolve(100);
    }
  });
