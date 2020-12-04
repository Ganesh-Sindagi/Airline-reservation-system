const express = require('express')
const bodyParser = require('body-parser')
const ejs = require("ejs");
const cors = require("cors");
const app = express()
const port = process.env.PORT || 5000

app.set('view engine', 'ejs');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json());
app.use(express.static("public"));

// Postgres 
// const { Pool } = require('pg');
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

const { Client } = require('pg');
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

// var connectionString = "postgres://postgres:ganesh@localhost:5432/airline";
// const client = new Client({
//     connectionString: connectionString
// });

client.connect()


// Home route
app.get("/", (req, res) => {
    res.render('home')
})

app.get('/db', async (req, res) => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM test_table');
      const results = { 'results': (result) ? result.rows : null};
      res.render('pages/db', results );
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })

// Login route
app.get("/login", (req, res) => {
    res.render('login')
})


app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    client.query('SELECT password,user_id,username FROM airline.user WHERE email = $1', [username], function (error, results) {
            console.log(results.rows)
            if (!error){
                if(password === results.rows[0].password) {
                    console.log("Login Success!!");
                    user_id = results.rows[0].user_id;
                    user_name = results.rows[0].username;
                    console.log(user_id)
                    res.render("search", {user_name: user_name, user_id: user_id});
                } else {
                    res.render('error')
                    console.log("Failure")
                }
            }
      });
})


// signup route
app.get("/signup", (req, res) => {
    res.render('signup')
})

app.post("/signup", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;

    client.query('INSERT INTO airline.user (username, password, email) VALUES ($1, $2, $3)', [username, password, email], function (error, results) {
            if (error) {
                res.render('error')
            }
            else {
                res.render('login');
                console.log("SignUp Success")
            }
      });
})


// Search route
app.get("/search", (req, res) => {
    res.render('search');
})

app.post("/search", (req, res) => {
    var source = req.body.source;
    var date = req.body.date;
    var destination = req.body.destination;
    var user_name = req.body.user_name;
    var user_id = req.body.user_id;

    console.log(req.body);
    console.log(user_name);
    client.query("SELECT * FROM airline.flights WHERE source = $1 AND destination = $2 AND date = $3", [source, destination, date],  function (error, results) {
        if (error) {
            res.render('error');
        } else {
            console.log(results.rows);
            res.render('flights', {results: results.rows, user_name: user_name, user_id:user_id});
        }
            
    });
})


// new_flights route
app.get('/flights', (req, res) => {
    res.render('flights')
})

app.post('/flights', (req, res) => {
    var flight = req.body.bookbtn;
    var user_name = req.body.user_name;
    var user_id = req.body.user_id;

    console.log(flight);
    const query = "SELECT * FROM airline.seats WHERE flight_id = $1 AND status = 'available'"
    client.query(query, [flight], function (error, results) {
        if (error) {
            res.render('error')
        } else {
            console.log(results.rows)
            res.render('seats', {results: results.rows, user_name: user_name, flight_id:flight, user_id:user_id})
        }
        
    });
})


//Routes for seats
app.post("/seats", (req, res) => {
    var user_name = req.body.user_name;
    var user_id = req.body.user_id;
    var flight_id = req.body.flight_id;
    const seats = req.body.selectedseat;
    
    if(seats.length === 1) {
        console.log(seats);
        console.log(flight_id);
        const query = "SELECT fare FROM airline.seats WHERE seat_no = $1 AND flight_id = $2"
        client.query(query, [seats, flight_id], function (error, results) {
            if (error) throw error;
            console.log(results.rows[0].fare)
            var f = [];
            f.push(results.rows[0].fare)
            res.render('checkout', {user_id: user_id, user_name: user_name, flight_id: flight_id, seats: seats, fare:f})
        })
    }
    else {
        var new_seats = [];
        seats.map((seat) => {
            new_seats.push(parseInt(seat))
        })

        console.log(new_seats)
        var fares = [];
        const query = "SELECT fare FROM airline.seats WHERE seat_no = ANY ($1) AND flight_id = $2"
        client.query(query, [new_seats, flight_id], function (error, results) {
        if (error) throw error;
            const new_fares = results.rows.map(result => {
                fares.push(result.fare);
            })
            console.log(fares)
            res.render('checkout', {user_id: user_id, user_name: user_name, flight_id: flight_id, seats: seats, fare: fares})
        }) 
    }
})



app.post('/checkout', (req, res) => {
    const user_name = req.body.user_name;
    const passenger_id = req.body.user_id;
    const flight_id = req.body.flight_id;
    
    const name = req.body.name;
    const age = req.body.age;
    const email = req.body.email;
    const phone = req.body.phone;
    const payment_type = req.body.payment;

    var seatnumbers = [];
    seatnumbers = req.body.seatnumber.split(",");

    if(seatnumbers.length === 1) {
        client.query("INSERT INTO airline.booking (passenger_id, flight_id, seat_no, name, age, email, phone, payment_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [passenger_id, flight_id, parseInt(seatnumbers[0]), name, age, email, phone, payment_type] , function (error, results) {
            if (error) throw error;
            console.log(results.rows);
            res.render('success', {user_id: passenger_id, user_name: user_name});
        });

        const sq = "UPDATE airline.seats SET status = 'booked' WHERE seat_no = $1"
        client.query(sq, [parseInt(seatnumbers[0])], function (error, answers) {
            if(error) throw error;
        });
    } else {
        for (var i = 0; i < seatnumbers.length; i++) {
            var j = i;
            client.query("INSERT INTO airline.booking (passenger_id, flight_id, seat_no, name, age, email, phone, payment_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [passenger_id, flight_id, parseInt(seatnumbers[i]), name[i], age[i], email[i], phone[i], payment_type] , function (error, results) {
                if (error) throw error;
                console.log(results.rows);
            });
            const sq2 = "UPDATE airline.seats SET status = 'booked' WHERE seat_no = $1"
            client.query(sq2, [parseInt(seatnumbers[i])], function (error, answers) {
                if(error) throw error;
            });
        }
        res.render('success', {user_id: passenger_id, user_name: user_name});
    }
    
});


app.get('/success', (req, res)=> {
    res.render('success')
})

app.get('/bookings', (req, res)=> {
    var user_id = req.query.uid;
    var user_name = req.query.user;
    const query = "SELECT b.booking_id, b.name, b.seat_no, b.name as user_name, b.age, b.email, b.phone, s.seat_type, s.class, s.fare, f.name, f.source, f.destination, f.date, f.dep_time, f.arr_time, b.payment_type FROM airline.booking b, airline.seats s, airline.flights f WHERE b.passenger_id = $1 AND b.flight_id = f.flight_id and b.seat_no = s.seat_no and b.flight_id = s.flight_id"
    client.query(query, [user_id], function (error, results) {
        if (error) {
            res.render('error')
        } else {
            console.log(results.rows);
            res.render('bookings', {user_id:user_id, user_name:user_name, bookings: results.rows})
        }
    })
   
})

app.post('/bookings', (req, res) => {
    var booking_id = req.body.cancelbtn;
    var user_id = req.body.user_id;
    var user_name = req.body.user_name;
    console.log(booking_id)

    const sq = "SELECT seat_no FROM airline.booking WHERE booking_id = $1"
    client.query(sq, [booking_id], function (error, answers) {
        if(error) throw error;
        console.log(answers.rows);
        const sq2 = "UPDATE airline.seats SET status = 'available' WHERE seat_no = $1"
        client.query(sq2, [answers.rows[0].seat_no],function (error, answers2) {
        if(error) throw error;
        console.log(answers2.rows);
         });
    });

    const query = "DELETE FROM airline.booking WHERE booking_id = $1"
    client.query(query, [booking_id],function (error, results) {
        if (error) throw error;
        console.log(results.rows);
        res.render('bookings', {user_id:user_id, user_name:user_name, bookings: results.rows});
    })

})

//checkout
app.get("/checkout", (req, res) => {
    res.render('checkout')
})

//error route

app.get("/error", (req, res) => {
    res.render('error')
})


app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`)
  })