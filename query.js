const MongoClient = require("mongodb").MongoClient,
  url = "mongodb://localhost:27017/";

if (!process.argv[2] || !process.argv[3] || !process.argv[4]) {
  throw new Error("[dataOd] [dataDo] [liczbaDni]");
}

const dateFrom = new Date(process.argv[2]);
const dateTo = new Date(process.argv[3]);
const daysToSearch = Number(process.argv[4]);

if (Math.ceil((dateTo - dateFrom) / 86400400) < daysToSearch - 1) {
  throw new Error(
    "Liczba dni wyszukiwanych jest mniejsza niż różnica pomiędzy jedną a drugą dataą"
  );
}

MongoClient.connect(url, { useUnifiedTopology: true }, async (err, db) => {
  if (err) throw err;
  const dbo = db.db("database");
  dbo
    .collection("offers")
    .find({})
    .toArray(function (err, offers) {
      const selectedOffers = [];
      offers.forEach((offer) => {
        if (offer.readyFrom > dateTo || offer.readyTo < dateFrom) {
          return;
        }

        const days = [];
        for (
          var d = new Date(offer.readyFrom);
          d <= new Date(offer.readyTo);
          d.setDate(d.getDate() + 1)
        ) {
          days.push(new Date(d));
        }

        offer.reservations.sort((a, b) => a.from - b.from);
        offer.reservations.forEach((reservation) => {
          days.forEach((day) => {
            if (day >= reservation.from && day <= reservation.to) {
              day = null;
            }
          });
        });

        days.map((day) => {
          if (day < dateFrom || day > dateTo) {
            day = null;
          }
        });

        let count = 1;
        let startIndex = 0;
        while (days[startIndex] === null && days[startIndex] !== undefined) {
          startIndex++;
        }

        loop: for (let h = startIndex + 1; h < days.length; h++) {
          if (count === daysToSearch) {
            const to = new Date(days[startIndex]);
            to.setDate(to.getDate() + daysToSearch - 1);
            selectedOffers.push({
              id: offer.id,
              idObject: offer.idObject,
              from: days[startIndex],
              to: to,
            });
            count = 1;
            startIndex++;
            while (
              days[startIndex] === null &&
              days[startIndex] !== undefined
            ) {
              startIndex++;
            }
            h = startIndex;
            if (days[startIndex] === undefined) {
              break loop;
            }
          } else if (days[h] === null) {
            count = 0;
            startIndex = h;
            while (
              days[startIndex] === null &&
              days[startIndex] !== undefined
            ) {
              startIndex++;
            }
          } else if (days[h] !== null) {
            count++;
          }
        }

        if (count === daysToSearch) {
          const to = new Date(days[startIndex]);
          to.setDate(to.getDate() + daysToSearch - 1);
          selectedOffers.push({
            id: offer.id,
            idObject: offer.idObject,
            from: days[startIndex],
            to,
          });
        }
      });
      selectedOffers.forEach((offer) => {
        console.log(
          `${offer.idObject} ${offer.id} ${dateToYYYYMMDD(
            offer.from
          )} ${dateToYYYYMMDD(offer.to)}`
        );
      });
      db.close();
    });
});

function dateToYYYYMMDD(date) {
  var d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
}
