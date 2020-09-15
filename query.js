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

if (getNumberOfDays(dateTo - dateFrom) < numberOfDays - 1) {
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
      for (let i = 0; i < offers.length; i++) {
        if (offers[i].readyFrom > dateTo || offers[i].readyTo < dateFrom) {
          continue;
        }

        const avaiableDays = [];
        for (
          var d = new Date(offers[i].readyFrom);
          d <= new Date(offers[i].readyTo);
          d.setDate(d.getDate() + 1)
        ) {
          avaiableDays.push(new Date(d));
        }

        offers[i].reservations.sort((a, b) => a.from - b.from);
        for (let k = 0; k < offers[i].reservations.length; k++) {
          const reservation = offers[i].reservations[k];
          for (let m = 0; m < avaiableDays.length; m++) {
            if (
              avaiableDays[m] >= reservation.from &&
              avaiableDays[m] <= reservation.to
            ) {
              avaiableDays[m] = null;
            }
          }
        }

        for (let k = 0; k < avaiableDays.length; k++) {
          if (avaiableDays[k] < dateFrom || avaiableDays[k] > dateTo) {
            avaiableDays[k] = null;
          }
        }

        let countDays = 1;
        let start = 0;
        while (
          avaiableDays[start] === null &&
          avaiableDays[start] !== undefined
        ) {
          start++;
        }

        loop: for (let h = start + 1; h < avaiableDays.length; h++) {
          if (countDays === numberOfDays) {
            const to = new Date(avaiableDays[start]);
            to.setDate(to.getDate() + numberOfDays - 1);
            selectedOffers.push({
              id: offers[i].id,
              idObject: offers[i].idObject,
              from: avaiableDays[start],
              to: to,
            });
            countDays = 1;
            start++;
            while (
              avaiableDays[start] === null &&
              avaiableDays[start] !== undefined
            ) {
              start++;
            }
            h = start;
            if (avaiableDays[start] === undefined) {
              break loop;
            }
          } else if (avaiableDays[h] === null) {
            countDays = 0;
            start = h;
            while (
              avaiableDays[start] === null &&
              avaiableDays[start] !== undefined
            ) {
              start++;
            }
          } else if (avaiableDays[h] !== null) {
            countDays++;
          }
        }

        if (countDays === numberOfDays) {
          const to = new Date(avaiableDays[start]);
          to.setDate(to.getDate() + numberOfDays - 1);
          selectedOffers.push({
            id: offers[i].id,
            idObject: offers[i].idObject,
            from: avaiableDays[start],
            to
          });
        }
      }
      for (let i = 0; i < selectedOffers.length; i++) {
        console.log(
          `${selectedOffers[i].idObject} ${selectedOffers[i].id} ${formatDate(
            selectedOffers[i].from
          )} ${formatDate(selectedOffers[i].to)}`
        );
      }
      db.close();
    });
});

function getNumberOfDays(miliseconds) {
  return Math.ceil(miliseconds / 86400400);
}

function formatDate(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1}-${date.getDate() < 10 ? "0" + date.getDate() : date.getDate()}`;
}
