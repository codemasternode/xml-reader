const MongoClient = require("mongodb").MongoClient,
  url = "mongodb://localhost:27017/";

if (!process.argv[2] || !process.argv[3] || !process.argv[4]) {
  throw new Error(
    "Incorrect format!!! Expect: npm run dev [dataOd] [dataDo] [liczbaDni]"
  );
}

const dateFrom = new Date(process.argv[2]);
const dateTo = new Date(process.argv[3]);
const numberOfDays = Number(process.argv[4]);

if (getNumberOfDays(dateTo - dateFrom) < numberOfDays) {
  throw new Error(
    "Number of days is smaller than difference between dateFrom and dateTo"
  );
}

MongoClient.connect(url, { useUnifiedTopology: true }, async (err, db) => {
  if (err) throw err;
  const dbo = db.db("reservations");

  dbo
    .collection("offers")
    .find({})
    .toArray(function (err, offers) {
      const selectedOffers = [];
      console.log(dateFrom, dateTo, numberOfDays);
      for (let i = 0; i < offers.length; i++) {
        if (
          (offers[i].readyFrom > dateFrom && offers[i].readyTo > dateFrom) ||
          offers[i].readyTo < dateFrom ||
          (offers[i].readyFrom <= dateFrom &&
            offers[i].readyTo < dateTo &&
            getNumberOfDays(offers[i].readyTo - dateFrom) < numberOfDays) ||
          (offers[i].readyFrom > dateTo &&
            offers[i].readyTo > dateTo &&
            getNumberOfDays(dateTo - offers[i].readyFrom) < numberOfDays)
        ) {
          continue;
        }

        const avaiableDays = [];
        for (
          var d = new Date(dateFrom);
          d <= new Date(dateTo);
          d.setDate(d.getDate() + 1)
        ) {
          avaiableDays.push(new Date(d));
        }
        //console.log(avaiableDays);

        offers[i].reservations.sort((a, b) => a.from - b.from);
        for (let k = 0; k < offers[i].reservations.length; k++) {
          const reservation = offers[i].reservations[k];
          for (let m = 0; m < avaiableDays.length; m++) {
            if (
              avaiableDays[m] >= reservation.from &&
              avaiableDays[m] <= reservation.to
            ) {
              avaiableDays.splice(m, 1);
              m--;
            }
          }
        }
        let countDays = 0;
        let startPoint = avaiableDays[0];
        for (let k = 1; k < avaiableDays.length; k++) {
          if (getNumberOfDays(avaiableDays[k] - avaiableDays[k - 1]) === 1) {
            countDays++;
            if (countDays === numberOfDays) {
              countDays = 0;
              selectedOffers.push({
                id: offers[i].id,
                idObject: offers[i].idObject,
                from: startPoint,
                to: avaiableDays[k],
              });
              startPoint = avaiableDays[k];
            }
          } else {
            countDays = 0;
          }
        }
        if (offers[i].id === "393eb535-a2d5-4093-9681-e0f6a100fa4c") {
          console.log(selectedOffers);
        }
      }

      db.close();
    });
});

function getNumberOfDays(miliseconds) {
  return Math.ceil(miliseconds / 86400400);
}
