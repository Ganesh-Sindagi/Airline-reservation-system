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

// var mysql      = require('mysql');
// const e = require('express');
// var connection = mysql.createConnection({
//   host     : 'localhost',
//   user     : 'root',
//   password : '',
//   database : 'airline_mini'
// });
 
// connection.connect();

// Postgres 
const { Client } = require('pg');

var connectionString = "postgres://postgres:ganesh@localhost:5432/airline";
const client = new Client({
    connectionString: connectionString
});

client.connect()

// app.get('/', function (req, res, next) {
//     client.query("SELECT * FROM airline.user WHERE user_id = $1", [6001], function (err, result) {
//         if (err) {
//             console.log(err);
//         } else {
//             console.log(result.rows)
//         }
        
//     });
// });




// Home route
app.get("/", (req, res) => {
    res.render('home')
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
    console.log(req.body)
    const user_name = req.body.user_name;
    const passenger_id = req.body.user_id;
    const flight_id = req.body.flight_id;
    const seatnumbers = req.body.seatnumber.split(",");
    const name = req.body.name;
    const age = req.body.age;
    const email = req.body.email;
    const phone = req.body.phone;
    const payment_type = req.body.payment;

    console.log(name, age, email, phone, payment_type);

    if(seatnumbers.length === 1) {
        client.query("INSERT INTO airline.booking (passenger_id, flight_id, seat_no, name, age, email, phone, payment_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [passenger_id, flight_id, seatnumbers, name, age, email, phone, payment_type] , function (error, results, fields) {
            if (error) throw error;
            console.log(results.rows);
            res.render('success', {user_id: passenger_id, user_name: user_name});
            const sq = "UPDATE airline.seats SET status = 'booked' WHERE seat_no = $1"
            connection.query(sq, [seatnumbers], function (error, answers) {
                if(error) throw error;
            });
        });
    } else {
        for (var i = 0; i < seatnumbers.length; i++) {
            var j = i;
            client.query("INSERT INTO airline.booking (passenger_id, flight_id, seat_no, name, age, email, phone, payment_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [passenger_id, flight_id, seatnumbers[i], name[i], age[i], email[i], phone[i], payment_type] , function (error, results) {
                if (error) throw error;
                console.log(results.rows);
                console.log("Seat Numbers are : ", seatnumbers[j])
            });
            const sq2 = "UPDATE airline.seats SET status = 'booked' WHERE seat_no = $1"
            client.query(sq2, [seatnumbers[j]], function (error, answers) {
                if(error) throw error;
            });
        }
        res.render('success', {user_id: passenger_id, user_name: user_name});
    }
})


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


// // Admin Route
// app.get("/admin_login", (req, res) => {
//     res.render('admin_login')
// })

// app.post("/admin_login", (req, res) => {
//     console.log(req.body)
//     const username = req.body.username;
//     const password = req.body.password;
//     connection.query({
//         sql: 'SELECT password,admin_id,username FROM `admin` WHERE `username` = ?',
//         timeout: 40000, // 40s
//         values: [username]
//       }, function (error, results, fields) {
//             if (!error){
//                 if(password === results[0].password) {
//                     console.log("Login Success!!");
//                     user_id = results[0].user_id;
//                     user_name = results[0].username;
//                     console.log(user_id)
//                     res.render("admin_view", {user_name: user_name, user_id: user_id});
//                 } else {
//                     res.render('error')
//                     console.log("Failure")
//                 }
//             }
//       });
// })




// MySQL BEGIN HERE
// var user_id;
// var user_name;

// app.post("/login", (req, res) => {
//     const username = req.body.username;
//     const password = req.body.password;

//     connection.query({
//         sql: 'SELECT password,user_id,username FROM `user` WHERE `email` = ?',
//         timeout: 40000, // 40s
//         values: [username]
//       }, function (error, results, fields) {
//             if (!error){
//                 if(password === results[0].password) {
//                     console.log("Login Success!!");
//                     user_id = results[0].user_id;
//                     user_name = results[0].username;
//                     console.log(user_id)
//                     res.render("search", {user_name: user_name, user_id: user_id});
//                 } else {
//                     res.render('error')
//                     console.log("Failure")
//                 }
//             }
//       });
// })


// // signup route
// app.get("/signup", (req, res) => {
//     res.render('signup')
// })

// app.post("/signup", (req, res) => {
//     const username = req.body.username;
//     const password = req.body.password;
//     const email = req.body.email;

//     connection.query({
//         sql: 'INSERT INTO `user`(username, password, email) VALUES (?, ?, ?)',
//         timeout: 40000, // 40s
//         values: [username, password, email]
//       }, function (error, results, fields) {
//             if (error) {
//                 res.render('error')
//             }
//             else {
//                 res.render('login');
//                 console.log("SignUp Success")
//             }
//       });
// })


// // Search route
// app.get("/search", (req, res) => {
//     res.render('search');
// })

// app.post("/search", (req, res) => {
//     var source = req.body.source;
//     var date = req.body.date;
//     var destination = req.body.destination;
//     var user_name = req.body.user_name;
//     var user_id = req.body.user_id;

//     console.log(req.body);
//     console.log(user_name);
//     connection.query("SELECT * FROM `flights` WHERE `source` = '" + source + "' AND `destination`= '" + destination + "'AND `date`= '" + date + "'", function (error, results, fields) {
//             if (error) {
//                 res.render('error');
//             } else {
//                 console.log(results);
//                 res.render('flights', {results: results, user_name: user_name, user_id:user_id});
//             }
            
//       });
// })


// // new_flights route
// app.get('/flights', (req, res) => {
//     res.render('flights')
// })

// app.post('/flights', (req, res) => {
//     var flight = req.body.bookbtn;
//     var user_name = req.body.user_name;
//     var user_id = req.body.user_id;

//     console.log(flight);
//     const query = "SELECT * FROM `seats` WHERE `flight_id` = '" + flight + "' and `status` = 'available'"
//     connection.query(query, function (error, results, fields) {
//         if (error) {
//             res.render('error')
//         } else {
//             console.log(results)
//             res.render('seats', {results: results, user_name: user_name, flight_id:flight, user_id:user_id})
//         }
        
//     });
// })


// //Routes for seats
// app.post("/seats", (req, res) => {
//     var user_name = req.body.user_name;
//     var user_id = req.body.user_id;
//     var flight_id = req.body.flight_id;
//     const seats = req.body.selectedseat;
    
//     if(seats.length === 1) {
//         console.log(seats);
//         console.log(flight_id);
//         const query = "SELECT fare FROM seats WHERE `seat_no` = '" + seats + "' AND `flight_id`='" + flight_id + "'";
//         connection.query(query, function (error, results, fields) {
//             if (error) throw error;
//             console.log(results[0].fare)
//             var f = [];
//             f.push(results[0].fare)
//             res.render('checkout', {user_id: user_id, user_name: user_name, flight_id: flight_id, seats: seats, fare:f})
//         })
//     }
//     else {
//         var fares = [];
//         const query = "SELECT fare FROM seats WHERE `seat_no` in (" + seats + ") AND `flight_id`='" + flight_id + "'";
//         connection.query(query, function (error, results, fields) {
//         if (error) throw error;
//             const new_fares = results.map(result => {
//                 fares.push(result.fare);
//             })
//             console.log(fares)
//             res.render('checkout', {user_id: user_id, user_name: user_name, flight_id: flight_id, seats: seats, fare: fares})
//         }) 
//     }
// })



// app.post('/checkout', (req, res) => {
//     console.log(req.body)
//     const user_name = req.body.user_name;
//     const passenger_id = req.body.user_id;
//     const flight_id = req.body.flight_id;
//     const seatnumbers = req.body.seatnumber.split(",");
//     const name = req.body.name;
//     const age = req.body.age;
//     const email = req.body.email;
//     const phone = req.body.phone;
//     const payment_type = req.body.payment;

//     console.log(name, age, email, phone, payment_type);

//     if(seatnumbers.length === 1) {
//         connection.query({
//             sql: "INSERT INTO `booking` (passenger_id, flight_id, seat_no, name, age, email, phone, payment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
//             timeout: 40000, // 40s
//             values: [passenger_id, flight_id, seatnumbers, name, age, email, phone, payment_type]
//           }, function (error, results, fields) {
//                 if (error) throw error;
//                 console.log(results);
//                 res.render('success', {user_id: passenger_id, user_name: user_name});
//                 const sq = "UPDATE `seats` SET `status` = 'booked' WHERE seat_no = '" + seatnumbers + "'"
//                 connection.query(sq, function (error, answers, fields) {
//                     if(error) throw error;
//                 });
//           });
//     } else {
//         for (var i = 0; i < seatnumbers.length; i++) {
//             connection.query({
//                 sql: "INSERT INTO `booking` (passenger_id, flight_id, seat_no, name, age, email, phone, payment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
//                 timeout: 40000, // 40s
//                 values: [passenger_id, flight_id, seatnumbers[i], name[i], age[i], email[i], phone[i], payment_type[i]]
//               }, function (error, results, fields) {
//                     if (error) throw error;
//                     console.log(results);
//                     res.render('success', {user_id: passenger_id, user_name: user_name});
//                     const sq = "UPDATE `seats` SET `status` = 'booked' WHERE seat_no = '" + seatnumbers + "'"
//                     connection.query(sq, function (error, answers, fields) {
//                         if(error) throw error;
//                     });
//               });
//         }
//     }
// })


// app.get('/success', (req, res)=> {
//     res.render('success')
// })

// app.get('/bookings', (req, res)=> {
//     var user_id = req.query.uid;
//     var user_name = req.query.user;
//     const query = "SELECT b.booking_id, b.name, b.seat_no, b.name as user_name, b.age, b.email, b.phone, s.seat_type, s.class, s.fare, f.name, f.source, f.destination, f.date, f.dep_time, f.arr_time, b.payment_type FROM booking b, seats s, flights f WHERE b.passenger_id = "+ user_id + " and b.flight_id = f.flight_id and b.seat_no = s.seat_no and b.flight_id = s.flight_id"
//     connection.query(query, function (error, results, fields) {
//         if (error) {
//             res.render('error')
//         } else {
//             console.log(results);
//             res.render('bookings', {user_id:user_id, user_name:user_name, bookings: results})
//         }
//     })
   
// })

// app.post('/bookings', (req, res) => {
//     var booking_id = req.body.cancelbtn;
//     var user_id = req.body.user_id;
//     var user_name = req.body.user_name;
//     console.log(booking_id)

//     const sq = "SELECT seat_no FROM `booking` WHERE `booking_id` = " + booking_id;
//     connection.query(sq, function (error, answers, fields) {
//         if(error) throw error;
//         console.log(answers);
//         const sq2 = "UPDATE `seats` SET `status` = 'available' WHERE seat_no = " + answers[0].seat_no;
//         connection.query(sq2, function (error, answers2, fields) {
//         if(error) throw error;
//         console.log(answers2);
//          });
//     });

//     const query = "DELETE FROM `booking` WHERE `booking_id`= " + booking_id;
//     connection.query(query, function (error, results, fields) {
//         if (error) throw error;
//         console.log(results);
//         res.render('bookings', {user_id:user_id, user_name:user_name, bookings: results});
//     })

// })

// //checkout
// app.get("/checkout", (req, res) => {
//     res.render('checkout')
// })

// //error route

// app.get("/error", (req, res) => {
//     res.render('error')
// })


// // Admin Route
// app.get("/admin_login", (req, res) => {
//     res.render('admin_login')
// })

// app.post("/admin_login", (req, res) => {
//     console.log(req.body)
//     const username = req.body.username;
//     const password = req.body.password;
//     connection.query({
//         sql: 'SELECT password,admin_id,username FROM `admin` WHERE `username` = ?',
//         timeout: 40000, // 40s
//         values: [username]
//       }, function (error, results, fields) {
//             if (!error){
//                 if(password === results[0].password) {
//                     console.log("Login Success!!");
//                     user_id = results[0].user_id;
//                     user_name = results[0].username;
//                     console.log(user_id)
//                     res.render("admin_view", {user_name: user_name, user_id: user_id});
//                 } else {
//                     res.render('error')
//                     console.log("Failure")
//                 }
//             }
//       });
// })


app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`)
  })