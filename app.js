const express = require('express')
const bodyParser = require('body-parser')
const ejs = require("ejs");
const cors = require("cors");
const app = express()
const port = process.env.PORT || 5000
const spawn = require('child_process').spawn;

const bcrypt = require('bcrypt');
const saltRounds = 10;

app.set('view engine', 'ejs');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json());
app.use(express.static("public"));

// Heroku postgres Connection
const { Client } = require('pg');
// const client = new Client({
//     connectionString: process.env.DATABASE_URL,
//     ssl: {
//       rejectUnauthorized: false
//     }
//   });
  
//   const { Pool } = require('pg');
//   const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: {
//       rejectUnauthorized: false
//     }
//   });

//Localdb
var connectionString = "postgres://postgres:ganesh@localhost:5432/airline";
const client = new Client({
    connectionString: connectionString
});

client.connect()

// Flybot assisstant
const pp = () => {
    const pyprocess = spawn('python', ["flybotold.py"])
    pyprocess.stdout.on('data', data => {
        console.log(data.toString());
    })
    app.post("/stopbot", (req, res) => {
        console.log("The process id was: ", pyprocess.pid);
        process.kill(pyprocess.pid);
        console.log("You have Stopped the bot");
        res.redirect("/");
    })
}

app.get("/flybot", (req, res) => {
    res.render("flybot")
    pp();
})

//* Admin Section
app.get("/admin_login", (req, res) => {
    res.render('admin_login')
})


app.post("/admin_login", (req, res) => {
    console.log(req.body)
    const username = req.body.username;
    const password = req.body.password;
    client.query('SELECT password,admin_id,username FROM airline.admin WHERE username = $1', [username] , function (error, results) {
        if (!error){
            bcrypt.compare(password, results.rows[0].password, function(err, hashResult) {
                if(hashResult == true) {
                    console.log("Login Success!!");
                    user_id = results.rows[0].admin_id;
                    user_name = results.rows[0].username;
                    console.log(user_id)
                    res.render("admin_section", {user_name: user_name, user_id: user_id});
                } else {
                    res.send("<h1>Invalid Username or Password</h1>");
                    console.log("Failure")
                }
            });
        }
    });
})

app.get("/admin_section", (req, res)=>{
    res.render("admin_section");
})

//* Admin Flights 
app.get('/admin_flights', (req, res)=>{
    client.query("SELECT * FROM airline.flights",  function (error, results) {
        if (error) {
            res.render('error');
        } else {
            console.log(results.rows);
            res.render('admin_flights', {results: results.rows});
        }
    });
})

app.post("/admin_flights", (req, res) => {
    var flight_id = []
    flight_id = req.body.selectedflight;
    const op = req.body.op;
    console.log(req.body)

    //* Adding flights
    switch(op) {
        case "add":
            res.render('add_flights')    
            break;

        case "modify":
            console.log("Selected flights are : ",flight_id);
            console.log(typeof(flight_id));
            if (typeof(flight_id) == "string") {
                client.query('SELECT * FROM airline.flights WHERE flight_id = $1', [flight_id], function (error, results) {
                    if (error) {
                        res.render('error')
                        console.log(error)
                    }
                    else {
                        console.log(results.rows)
                        res.render('modify_flights', {flight_id: flight_id, results:results.rows});
                    }
                });
            } else {
                client.query('SELECT * FROM airline.flights WHERE flight_id = ANY ($1)', [flight_id], function (error, results) {
                    if (error) {
                        res.render('error')
                        console.log(error)
                    }
                    else {
                        console.log(results.rows)
                        res.render('modify_flights', {flight_id: flight_id, results:results.rows});
                    }
                });
            }
            break;

        case "delete":
            if (typeof(flight_id) === "string") {
                client.query('DELETE FROM airline.flights WHERE flight_id = $1', [flight_id], function (error, results) {
                    if (error) {
                        res.render('error')
                    }
                    else {
                        client.query("SELECT * FROM airline.flights",  function (error, results1) {
                            if (error) {
                                res.render('error');
                            } else {
                                res.render('admin_flights', {results: results1.rows});
                            }
                        });
                        console.log(`${flight_id} Delted`)
                    }
                });
            } else if (typeof(flight_id) === "object") {
                for(var i = 0; i < flight_id.length; i++) {
                    console.log(i, "iteration")
                    client.query('DELETE FROM airline.flights WHERE flight_id = $1', [parseInt(flight_id[i])], function (error, results) {
                        if (error) {
                            console.log(error);
                            res.render('error');

                        }
                    });
                }
                client.query("SELECT * FROM airline.flights",  function (error, results1) {
                    if (error) {
                        console.log(error);
                        res.render('error');
                    } else {
                        res.render('admin_flights', {results: results1.rows});
                    }
                });
            }
            break;
    }

})


app.post("/add_flights", (req, res)=>{
    const name = req.body.name;
    const source = req.body.source;
    const destination = req.body.destination;
    const date = req.body.date;
    const duration = req.body.duration;
    const dep_time = req.body.dep_time;
    const arr_time = req.body.arr_time;
    const fare = req.body.fare;

    client.query('INSERT INTO airline.flights (name, source, destination, date, duration, dep_time, arr_time, fare) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [name, source, destination, date, duration, dep_time, arr_time, fare], function (error, results) {
        if (error) {
            res.render('error')
            console.log(error)
        }
        else {
            console.log(results.rows)
            res.render('add_flights')
            console.log("Flight Added Successfully ")
        }
    });
});

app.post("/modify_flights", (req, res) => {
    console.log("Modified body flights", req.body)
    if((typeof(req.body.flight_id) == "string")) {
        var flight_id = []
        flight_id = (req.body.flight_id.split(","));
    } else {
        var flight_id = []
        flight_id = (req.body.flight_id[0].split(","));
    }
    console.log(flight_id)
    const name = req.body.name;
    const source = req.body.source;
    const destination = req.body.destination;

    if((typeof(req.body.flight_id) == "string")) {
        const date = new Date(req.body.date).toISOString();
        var new_date = date.split("T")[0]
    } else {
        var new_date = [];
        for(var i = 0; i < req.body.date.length; i++) {
            var a_date = new Date(req.body.date[i]).toISOString();
            new_date.push(a_date.split("T")[0]);
        }
    }

    console.log(new_date)
    const duration = req.body.duration;
    const dep_time = req.body.dep_time;
    const arr_time = req.body.arr_time;
    const fare = req.body.fare;

    if((typeof(req.body.flight_id) == "string")) {
        client.query('UPDATE airline.flights SET name=$1, source=$2, destination=$3, date=$4, duration=$5, dep_time=$6, arr_time=$7, fare=$8 WHERE flight_id = $9', [name, source, destination, new_date, duration, dep_time, arr_time, fare, parseInt(flight_id)], function (error, results) {
            if (error) {
                res.render('error')
                console.log(error)
            }
            else {
                console.log("Successfully modified")
            }
        });
    } else {
        for(var i = 0; i < flight_id.length; i++) {
            client.query('UPDATE airline.flights SET name=$1, source=$2, destination=$3, date=$4, duration=$5, dep_time=$6, arr_time=$7, fare=$8 WHERE flight_id = $9', [name[i], source[i], destination[i], new_date[i], duration[i], dep_time[i], arr_time[i], fare[i], parseInt(flight_id[i])], function (error, results) {
                if (error) {
                    res.render('error')
                    console.log(error)
                }
                else {
                    console.log("Successfully Modified");
                }
            });
        }
    }
})



//* Admin Seats 
app.get('/admin_seats', (req, res)=>{
    client.query("SELECT * FROM airline.seats ORDER BY flight_id ASC",  function (error, results) {
        if (error) {
            res.render('error');
        } else {
            console.log(results.rows);
            res.render('admin_seats', {results: results.rows});
        }
    });
})

app.post("/admin_seats", (req, res) => {
    var seat_no = []
    seat_no = req.body.selectedseat;
    const op = req.body.op;
    console.log(req.body)

    //* Adding Seats
    switch(op) {
        case "add":
            res.render('add_seats')    
            break;

        case "modify":
            console.log("Selected flights are : ", seat_no);
            console.log(typeof(seat_no));
            if (typeof(seat_no) == "string") {
                client.query('SELECT * FROM airline.seats WHERE seat_no = $1', [parseInt(seat_no)], function (error, results) {
                    if (error) {
                        res.render('error')
                        console.log(error)
                    }
                    else {
                        console.log(results.rows)
                        res.render('modify_seats', {seat_no: seat_no, results:results.rows});
                    }
                });
            } else {
                client.query('SELECT * FROM airline.seats WHERE seat_no = ANY ($1)', [seat_no], function (error, results) {
                    if (error) {
                        res.render('error')
                        console.log(error)
                    }
                    else {
                        console.log(results.rows)
                        res.render('modify_seats', {seat_no: seat_no, results:results.rows});
                    }
                });
            }
            break;

        case "delete":
            if(seat_no) {
                if (typeof(seat_no) === "string") {
                    client.query('DELETE FROM airline.seats WHERE seat_no = $1', [seat_no], function (error, results) {
                        if (error) {
                            res.render('error')
                        }
                        else {
                            client.query("SELECT * FROM airline.seats",  function (error, results1) {
                                if (error) {
                                    res.render('error');
                                } else {
                                    res.render('admin_seats', {results: results1.rows});
                                }
                            });
                        }
                    });
                } else {
                    for(var i = 0; i < seat_no.length; i++) {
                        client.query('DELETE FROM airline.seats WHERE seat_no = $1', [parseInt(seat_no[i])], function (error, results) {
                            if (error) {
                                console.log(error);
                                res.render('error');
    
                            }
                        });
                    }
                    client.query("SELECT * FROM airline.seats",  function (error, results1) {
                        if (error) {
                            console.log(error);
                            res.render('error');
                        } else {
                            res.render('admin_seats', {results: results1.rows});
                        }
                    });
                }
                break;
            }
    }

})


app.post("/add_seats", (req, res)=>{
    console.log(req.body);
    const seat_no = req.body.seat_no;
    const flight_id = req.body.flight_id;
    const seat_type = req.body.seat_type;
    const seat_class = req.body.class;
    const fare = req.body.fare;
    const status = req.body.status;

    client.query('INSERT INTO airline.seats (seat_no, flight_id, seat_type, class, fare, status) VALUES ($1, $2, $3, $4, $5, $6)', [seat_no, flight_id, seat_type, seat_class, fare, status], function (error, results) {
        if (error) {
            res.render('error')
            console.log(error)
        }
        else {
            console.log(results.rows)
            res.render('add_seats')
            console.log("Seat Added Successfully ")
        }
    });
});

app.post("/modify_seats", (req, res) => {
    console.log("Modified body flights", req.body)
    const seat_no = req.body.seat_no;
    const flight_id = req.body.flight_id;
    const seat_type = req.body.seat_type;
    const seat_class = req.body.class;
    const fare = req.body.fare;
    const status = req.body.status;

    if((typeof(req.body.seat_no) == "string")) {
        client.query('UPDATE airline.seats SET seat_no=$1, flight_id=$2, seat_type=$3, class=$4, fare=$5, status=$6 WHERE seat_no = $7 AND flight_id = $8', [parseInt(seat_no), parseInt(flight_id), seat_type, seat_class, fare, status, parseInt(seat_no), parseInt(flight_id)], function (error, results) {
            if (error) {
                res.render('error')
                console.log(error)
            }
            else {
                console.log("Successfully modified")
            }
        });
    } else {
        for(var i = 0; i < seat_no.length; i++) {
            client.query('UPDATE airline.seats SET seat_no=$1, flight_id=$2, seat_type=$3, class=$4, fare=$5, status=$6 WHERE seat_no = $7 AND flight_id = $8', [parseInt(seat_no[i]), parseInt(flight_id[i]), seat_type[i], seat_class[i], fare[i], status[i], parseInt(seat_no[i]), parseInt(flight_id[i])], function (error, results) {
                if (error) {
                    res.render('error')
                    console.log(error)
                }
                else {
                    console.log("Successfully Modified");
                }
            });
        }
    }
})


//* Bookings Section
app.get("/admin_bookings", (req, res) => {
    client.query("SELECT * FROM airline.booking",  function (error, results) {
        if (error) {
            res.render('error');
        } else {
            console.log(results.rows);
            res.render('admin_bookings', {results: results.rows});
        }
    });
})

app.post("/admin_bookings", (req, res)=>{
    const booking_id = req.body.selectedbooking;
    if (typeof(booking_id) === "string") {
        client.query('DELETE FROM airline.booking WHERE booking_id = $1', [booking_id], function (error, results) {
            if (error) {
                res.render('error')
            }
            else {
                client.query("SELECT * FROM airline.booking",  function (error, results1) {
                    if (error) {
                        res.render('error');
                    } else {
                        res.render('admin_bookings', {results: results1.rows});
                    }
                });
            }
        });
    } else {
        for(var i = 0; i < booking_id.length; i++) {
            client.query('DELETE FROM airline.booking WHERE booking_id = $1', [parseInt(booking_id[i])], function (error, results) {
                if (error) {
                    console.log(error);
                    res.render('error');
                }
            });
        }
        client.query("SELECT * FROM airline.booking",  function (error, results1) {
            if (error) {
                console.log(error);
                res.render('error');
            } else {
                res.render('admin_bookings', {results: results1.rows});
            }
        });
    }
})

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

//* User Route
// Login route
app.get("/login", (req, res) => {
    res.render('login')
    var date = new Date(); // Create a Date object to find out what time it is
    console.log(date.getHours())
    var datestring = date.getFullYear()  + "-" + (date.getMonth()+1) + "-" + date.getDate()
    if(date.getHours() >= 0 && date.getMinutes() >= 0){ // Check the time
        query = "UPDATE airline.flights SET date = $1"
        client.query(query, [datestring], function (error, results) {
            if (error) {
                console.log(error);
            };
            console.log("Flights updated")
        })
    }
})


app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    client.query('SELECT password,user_id,username FROM airline.user WHERE email = $1', [username], function (error, results) {
        if (!error){
            bcrypt.compare(password, results.rows[0].password, function(err, hashResult) {
                if(hashResult == true) {
                    console.log("Login Success!!");
                    user_id = results.rows[0].user_id;
                    user_name = results.rows[0].username;
                    console.log(user_id)
                    res.render("search", {user_name: user_name, user_id: user_id}); 
                } else {
                    res.send("<h1>Invalid Username or Password</h1>");
                    console.log("Failure")
                }
            });
        }
    });
})


// signup route
app.get("/signup", (req, res) => {
    res.render('signup')
})

app.post("/signup", (req, res) => {
    const username = req.body.username;
    const plainPassword = req.body.password;
    const email = req.body.email;
    bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
        // Store hash in your password DB.
        client.query('INSERT INTO airline.user (username, password, email) VALUES ($1, $2, $3)', [username, hash, email], function (error, results) {
            if (error) {
                console.log(error);
                res.render('error')
            }
            else {
                res.render('login');
                console.log("SignUp Success")
            }
      });
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

    if(source === destination) {
        res.send("<h1 style='text-align: center; font-size:3rem; margin-top:2rem;'>You have Selected Same source and destination!!!.<br>Please Change it<h1><br><br><h3 style='align-items:center; margin-left:8rem; font-size: 2rem;'>")
    } else {
        console.log(req.body);
        console.log(user_name);
        client.query("SELECT * FROM airline.flights WHERE source = $1 AND destination = $2 AND date = $3", [source, destination, date],  function (error, results) {
            if (results.rows == 0) {
                res.send("<h1 style='text-align: center; font-size:3rem; margin-top:2rem;'>You have selected a Wrong Date!!<h1>")
                res.render('error');
            } else {
                console.log(results.rows);
                res.render('flights', {results: results.rows, user_name: user_name, user_id:user_id});
            }
                
        });
    }
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
    const act_fare = req.body.act_fare;
    console.log("The fare in booking:", act_fare);
    var strsn = (req.body.seatnumber).split(',');
    console.log(strsn);
    if(strsn.length === 1) {
        const sq = "UPDATE airline.seats SET status = 'booked' WHERE seat_no = $1 AND flight_id = $2"
        client.query(sq, [parseInt(strsn[0]), flight_id], function (error, answers) {
            if(error) throw error;
        });

        client.query("INSERT INTO airline.booking (passenger_id, flight_id, seat_no, name, age, email, phone, payment_type, act_fare) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [passenger_id, flight_id, parseInt(strsn[0]), name, age, email, phone, payment_type, act_fare] , function (error, results) {
            if (error) {
                console.log(error);
                res.render('error')
            } else {
                console.log(results.rows);
                res.render('success', {user_id: passenger_id, user_name: user_name});
            }
        });
    } else {
        for (var i = 0; i < strsn.length; i++) {
            const sq2 = "UPDATE airline.seats SET status = 'booked' WHERE seat_no = $1 AND flight_id = $2"
            client.query(sq2, [parseInt(strsn[i]), flight_id], function (error, answers) {
                if(error) {
                    res.render('error');
                }
            });
            client.query("INSERT INTO airline.booking (passenger_id, flight_id, seat_no, name, age, email, phone, payment_type, act_fare) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [passenger_id, flight_id, parseInt(strsn[i]), name[i], age[i], email[i], phone[i], payment_type, parseInt(act_fare[i])] , function (error, results) {
                if (error) {
                    console.log(error);
                    res.render('error')
                }
                console.log(results.rows);
            });
            
        }
        res.render('success', {user_id: passenger_id, user_name: user_name});
    }
});

// app.post('/checkout', (req, res) => {
//     const user_name = req.body.user_name;
//     const passenger_id = req.body.user_id;
//     const flight_id = req.body.flight_id;
    
//     const name = req.body.name;
//     const age = req.body.age;
//     const email = req.body.email;
//     const phone = req.body.phone;
//     const payment_type = req.body.payment;

//     var strsn = (req.body.seatnumber).split(',');
//     console.log(strsn);
//     if(strsn.length === 1) {
//         const sq = "UPDATE airline.seats SET status = 'booked' WHERE seat_no = $1 AND flight_id = $2"
//         client.query(sq, [parseInt(strsn[0]), flight_id], function (error, answers) {
//             if(error) throw error;
//         });

//         client.query("INSERT INTO airline.booking (passenger_id, flight_id, seat_no, name, age, email, phone, payment_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [passenger_id, flight_id, parseInt(strsn[0]), name, age, email, phone, payment_type] , function (error, results) {
//             if (error) {
//                 console.log(error);
//                 res.render('error')
//             } else {
//                 console.log(results.rows);
//                 res.render('success', {user_id: passenger_id, user_name: user_name});
//             }
//         });
//     } else {
//         for (var i = 0; i < strsn.length; i++) {
//             const sq2 = "UPDATE airline.seats SET status = 'booked' WHERE seat_no = $1 AND flight_id = $2"
//             client.query(sq2, [parseInt(strsn[i]), flight_id], function (error, answers) {
//                 if(error) {
//                     res.render('error');
//                 }
//             });
//             client.query("INSERT INTO airline.booking (passenger_id, flight_id, seat_no, name, age, email, phone, payment_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [passenger_id, flight_id, parseInt(strsn[i]), name[i], age[i], email[i], phone[i], payment_type] , function (error, results) {
//                 if (error) {
//                     console.log(error);
//                     res.render('error')
//                 }
//                 console.log(results.rows);
//             });
            
//         }
//         res.render('success', {user_id: passenger_id, user_name: user_name});
//     }
// });


app.get('/success', (req, res)=> {
    res.render('success')
})

app.get('/bookings', (req, res)=> {
    var user_id = req.query.uid;
    var user_name = req.query.user;
    const query = "SELECT b.booking_id, b.name, b.seat_no, b.name as user_name, b.age, b.email, b.phone, b.disc_fare,s.seat_type, s.class, s.fare, f.name, f.source, f.destination, f.date, f.dep_time, f.arr_time, b.payment_type FROM airline.booking b, airline.seats s, airline.flights f WHERE b.passenger_id = $1 AND b.flight_id = f.flight_id and b.seat_no = s.seat_no and b.flight_id = s.flight_id"
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

    const sq = "SELECT seat_no, flight_id FROM airline.booking WHERE booking_id = $1"
    client.query(sq, [booking_id], function (error, answers) {
        if(error) throw error;
        console.log(answers.rows);
        const sq2 = "UPDATE airline.seats SET status = 'available' WHERE seat_no = $1 AND flight_id = $2"
        client.query(sq2, [answers.rows[0].seat_no, answers.rows[0].flight_id],function (error, answers2) {
        if(error) throw error;
        console.log(answers2.rows);
         });
    });

    const query = "DELETE FROM airline.booking WHERE booking_id = $1"
    client.query(query, [booking_id],function (error, results) {
        if (error) throw error;
        console.log(results.rows);
        var url = "/bookings?uid="+user_id+"&user=" + user_name
        res.redirect(url)
        //res.render('bookings', {user_id:user_id, user_name:user_name, bookings: results.rows});
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

//about route
app.get("/about", (req, res) => {
    res.render('about')
})

//Contact route
app.get("/contact", (req, res) => {
    res.render('contact')
})

// Event loop --> Set timeout <-- Web API

// setInterval(function(){ // Set interval for checking
//     var date = new Date(); // Create a Date object to find out what time it is
//     console.log(date.getHours())
//     var datestring = date.getFullYear()  + "-" + (date.getMonth()+1) + "-" + date.getDate()
//     if(date.getHours() >= 0 && date.getMinutes() >= 0){ // Check the time
//         query = "UPDATE airline.flights SET date = $1"
//         client.query(query, [datestring], function (error, results) {
//             if (error) throw error;
//             console.log("Flights updated")
//         })
//     }
// }, 43200000);

app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`)
  })