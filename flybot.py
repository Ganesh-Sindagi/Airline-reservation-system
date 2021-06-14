import os
import selenium
from selenium import webdriver
import time
from PIL import Image
import io
import requests
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import ElementClickInterceptedException
from selenium.webdriver.common.keys import Keys

import pyttsx3
import datetime
import speech_recognition as sr

engine = pyttsx3.init('sapi5')
voices = engine.getProperty('voices')
engine.setProperty('voice', voices[0].id)

def speak(audio):
    engine.say(audio)
    engine.runAndWait()

def wish_me():
    hour = int(datetime.datetime.now().hour)
    
    speak("Hey Ganesh")
    
    if hour>=0 and hour<12:
        speak("Good Morning!")
    if hour>=12 and hour<18:
        speak("Good Afternoon!")
    elif hour>18 and hour<0:
        speak("Good Evening!")    
    
    speak("I am your assistant for flight booking on flyeasy. Developed by Ganesh Sindagi")    

def take_command():
    #It takes microphone input from the user and returns string output
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening...")
        r.pause_threshold = 0.5
        audio = r.listen(source)
        
    try:
        print("Recognizing...")
        query = r.recognize_google(audio, language='en-in')
        print(f"User said: {query}\n")
    
    except Exception as e:
        print(e)
        speak("Sorry I dint get that...Say again please...")
        take_command()
        return "None"
    
    return query

wish_me()
speak("Which is your source")
source_c = take_command()
speak("Which is your destination")
destination_c = take_command()
speak("When?")
date_c = take_command()
speak("Your prefernce for the flight?")
flight_c = take_command()
speak("Your seat prefernce")
seat_c = take_command()
speak("I got it!!")
speak("I will try to book a seat on behalf of you!")


#Install Driver
driver = webdriver.Chrome(ChromeDriverManager().install())
driver.maximize_window()

# driver = webdriver.Firefox()
# driver.maximize_window()


#Specify Search URL 
search_url= r"localhost:5000" 
driver.get(search_url)
time.sleep(2)
driver.get("localhost:5000/login")

# Entering the deatils in the login_page 
time.sleep(2)
user = driver.find_element_by_name("username")
user.send_keys("ganesh@gmail.com")
time.sleep(1)
pswd = driver.find_element_by_name("password")
pswd.send_keys("@Ganesh7")
time.sleep(2)
login_btn = driver.find_element_by_name("user_login")
login_btn.send_keys(Keys.RETURN)
time.sleep(3)

# Filling the details in Search Page
source = driver.find_element_by_name("source")
source.send_keys(source_c)
time.sleep(1)

destination = driver.find_element_by_name("destination")
destination.send_keys(destination_c)
time.sleep(1)

date = driver.find_element_by_name("date")
date.send_keys(Keys.TAB)
date.send_keys("05")
date.send_keys(Keys.TAB)
date.send_keys("02")
date.send_keys(Keys.TAB)
date.send_keys("2021")
date.send_keys(Keys.TAB)

time.sleep(3)

search_btn = driver.find_element_by_class_name("search-btn")
search_btn.click()
time.sleep(2)

# Flights Page values
all_flights = driver.find_elements_by_name("bookbtn")
flight_ids = []
for flight in all_flights:
    flight_ids.append(flight.get_attribute("value"))

# Flights Name values
flight_names = driver.find_elements_by_id("flightname")
flight_ns = []
for flight_n in flight_names:
    flight_ns.append((flight_n.get_attribute("value")).lower())

# Making a dictionary of names and values
flight_dict = dict(zip(flight_ns, flight_ids))
print(flight_dict)

driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
time.sleep(2)

selected_flight = driver.find_element_by_id(flight_dict[flight_c.lower()])
selected_flight.click()
time.sleep(3)

# Seats section
# Selection of seats
avail_seats = driver.find_elements_by_name("selectedseat")
seats = []
for seat in avail_seats:
    seats.append(seat.get_attribute("value"))

# Selection of seat types
avail_types = driver.find_elements_by_id("type")
seat_types = []
for types in avail_types:
    seat_types.append((types.get_attribute("value")).lower())

# Making a dictionary of seat types and seat numbers
seat_dict = dict(zip(seat_types, seats))
print(seat_dict)

driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
time.sleep(2)

check_seat = driver.find_element_by_id(seat_dict[seat_c.lower()])
check_seat.click()

time.sleep(2)
# Click the Book button
b_b = driver.find_element_by_name("bookbtn")
b_b.click()

# Checkout Page
time.sleep(1)
c_name = driver.find_element_by_id("name")
c_name.send_keys("Ganesh")
time.sleep(2)

c_age = driver.find_element_by_name("age")
c_age.send_keys("20")
time.sleep(1)

c_email = driver.find_element_by_name("email")
c_email.send_keys("ganeshsindagi7@gmail.com")
time.sleep(1)

c_phone = driver.find_element_by_name("phone")
c_phone.send_keys("9663094626")
time.sleep(1)

c_payment = driver.find_element_by_name("payment")
c_payment.send_keys("Debit Card")
time.sleep(3)

b_btn = driver.find_element_by_name("bookbtn")
b_btn.click()
time.sleep(4)

# Showing the Bookings
bookings = driver.find_element_by_id("bookings")
bookings.click()

print("Your seat has been successfully Booked!!")

speak("Hey Ganesh your booking has been successfully confirmed.")
speak("Bye bye!")

time.sleep(4)
driver.close()
