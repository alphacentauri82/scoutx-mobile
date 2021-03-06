import calendar
import json, ast
import nexmo
import os
import requests
import schedule
# We detect if the user press ctl+c to stop the application
# If this keys are pressed then stop schedule threaded task
import signal
import time
# We will use this to get a unique identifier for the schedule process
import uuid

# For UTC ISOFORMAT CALCULATIONS - Nightscout use another isoformat so we use the next modules to
# convert propertly and get most exact calculations
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request
from flask_cors import CORS
# We are going to use this to create an individual Thread for our Job
from multiprocessing import Process
from os.path import join, dirname
from requests.auth import HTTPBasicAuth

# VONAGE VALUES
NEXMO_API_KEY = os.getenv("NEXMO_API_KEY")
NEXMO_API_SECRET = os.getenv("NEXMO_API_SECRET")
NEXMO_NUMBER = os.getenv("NEXMO_NUMBER")

# Init the flask App
app = Flask(__name__)

# Import Scout models for the app context
with app.app_context():
    import models
    from models import model, scouts, scout, users

# enable cors
cors = CORS(app)
# define secret_key to flask app to manage sessions
app.secret_key = b'_5#y2L"F4Q8z\n\xec]/'

# load environment
envpath = join(dirname(__file__), "./.env")
load_dotenv(envpath)

# Load nexmo client for global usage in server
client = nexmo.Client(
    application_id=os.getenv('NEXMO_APPLICATION_ID'),
    private_key=os.getenv('NEXMO_PRIVATE_KEY').replace('\\n', '\n')
)

active_scouts = []
active_users = []
nightscout_failed_update_wait_mark = {}
# thread global var
thread = None

start_scouts = False


@app.route('/', methods=['GET', 'POST'])
def home():
    return 'Scoutx Webhooks'


# handle the notifications when nightscout api is not sending new entries.
# when this mark is 1 the sms is sent, when the mark is equal to WAIT_AFTER_SMS_MARK the mark is restarted to 1


def handle_nightscout_failed_update(to, api_url, username):
    global client
    global nightscout_failed_update_wait_mark
    if to not in nightscout_failed_update_wait_mark:
        nightscout_failed_update_wait_mark[to] = 1
    else:
        nightscout_failed_update_wait_mark[to] += 1

    if nightscout_failed_update_wait_mark[to] == 1:
        response = requests.post(
            'https://api.nexmo.com/v0.1/messages',
            auth=HTTPBasicAuth(NEXMO_API_KEY, NEXMO_API_SECRET),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            json={
                "from": {
                    "type": "sms",
                    "number": os.getenv("NEXMO_NUMBER"),
                },
                "to": {
                    "type": "sms",
                    "number": to
                },
                "message": {
                    "content": {
                        "type": "text",
                        "text": "Dear {0} the nightscout api is not retrieving updated entries, please check your device or your service to solve any issues".format(
                            username)
                    }
                }
            }
        ).json()
    elif nightscout_failed_update_wait_mark[to] == int(os.getenv("WAIT_AFTER_SMS_MARK")):
        nightscout_failed_update_wait_mark[to] = 0


# handle the number of failed attempts to customer nightscout api. If the number of intents exceeds the
# limit then a sms is sent to the customer
nightscout_failed_pings = {}
last_call = {}


@app.route('/webhooks/inbound-messages', methods=["POST"])
def inbound_sms():
    args = dict(request.form)

    if args.get('status'):
        return args['status']

    sms_request_glucose_level(args, glucose)

    return "Message Received"


@app.route('/webhooks/events', methods=["POST", "GET"])
def events():
    global client
    global active_scouts
    global glucose

    req = request.get_json()
    # Create scouts instance
    nightscouts = scouts()

    if "status" in req:
        if req["status"] == "completed":
            phone = req["to"]
            # The next line is not recomended its functional but use the global active_scouts variable
            # This variable is updated by the daemon process.. that run in another context
            # Not the flask context, for that reason we are going to use firebase to get
            # fresh data
            # uscout = [active_scout for active_scout in active_scouts if active_scout['phone'] == phone]
            uscout = nightscouts.getby_personal_phone(phone)
            if uscout != None:
                entries = requests.get(uscout["nightscout_api"]).json()
                glucose = entries[0]['sgv']

                location = None
                if uscout['coordinates'] != None:
                    location = {"latitude": uscout['coordinates']['latitude'],
                                "longitude": uscout['coordinates']['longitude']}

                sms_glucose_alert(uscout["emergencyNumbers"][0], uscout["username"], glucose, location)
                # print('sms simulation to: {0} {1} {2}'.format(uscout["emerg_contact"], uscout["username"], glucose))
                for phone in uscout["emergencyNumbers"][1:]:
                    # print('sms simulation to: {0} {1} {2}'.format(phone, uscout["username"], glucose))
                    sms_glucose_alert(phone, uscout["username"], glucose, location)
    return "Event Received"


def sendSMS(number, message):
    return requests.post(
        'https://api.nexmo.com/v0.1/messages',
        auth=HTTPBasicAuth(NEXMO_API_KEY, NEXMO_API_SECRET),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        json={
            "from": {
                "type": "sms",
                "number": NEXMO_NUMBER,
            },
            "to": {
                "type": "sms",
                "number": number
            },
            "message": {
                "content": {
                    "type": "text",
                    "text": message
                }
            }
        }
    ).json()


def handle_nightscout_failed_pings(to, api_url, username):
    global client
    global nightscout_failed_pings
    if to not in nightscout_failed_pings:
        nightscout_failed_pings[to] = 1
    else:
        nightscout_failed_pings[to] += 1
    # print('Intent: {0} for {1}'.format(nightscout_failed_pings[to],to))
    if nightscout_failed_pings[to] == int(os.getenv("NEXMO_FAILED_PING_SMS")):
        message = "Dear {0} the nexmo api url: {1} is not responding, please check the service".format(username,
                                                                                                       api_url)
        response = sendSMS(to, message)

        # Reset the variable
        nightscout_failed_pings[to] = 0

        if "message_uuid" in response:
            return True
    return False


def sms_glucose_alert(to, username, glucose, location=None):
    global client
    # We send our sms using the messages api not the sms api
    message = "Alert {username} Blood Glucose is {glucose}".format(username=username, glucose=glucose)

    if (location):
        message = message + (
            " the last location is https://www.google.com/maps/@{0},{1},18.4z".format(location.latitude,
                                                                                      location.longitude))

    response = sendSMS(to, message)

    if "message_uuid" in response:
        return True
    else:
        return False


def call_glucose_alert(to, glucose):
    if to in last_call:
        if int(time.time() - last_call[to]) < int(os.getenv("WAIT_AFTER_CALL")):
            print("The number {0} was called recently.. Please wait a little longer: {1}".format(
                to, int(time.time() - last_call[to])))
            return False
    # print('Call {0} {1}'.format(to, glucose))
    last_call[to] = time.time()
    message = "Alert Your Blood Glucose is {0}".format(glucose)

    # We make our call using the voice API
    response = client.create_call(
        {
            "to": [{
                "type": "phone",
                "number": to
            }],
            "from": {
                "type": "phone",
                "number": os.getenv('NEXMO_NUMBER')
            },
            "ncco": [
                {
                    "action": "talk",
                    "text": "Alert Your Blood Glucose is {0}".format(glucose)
                }
            ],
            "eventUrl": [
                "{url_root}/webhooks/events".format(
                    url_root=os.getenv("SITE_URL"))
            ]
        }
    )
    if "uuid" in response:
        return True
    else:
        return False


def sms_request_glucose_level(args, glucose):
    global client

    args = ast.literal_eval(json.dumps(args))

    # Parse incoming values
    keyword = args['keyword'][0]
    to = args["msisdn"][0]
    response = None

    if keyword == "NIGHTSCOUT":
        msg = "Hey, the latest blood glucose level entry: {glucose}".format(glucose=glucose)
        response = sendSMS(to, msg)

        if response is not None and "message_uuid" in response:
            return True
    else:
        return False


class ApplicationKilledException(Exception):
    pass


# Signal handler


def signal_handler(signum, frame):
    raise ApplicationKilledException("Killing signal detected")


def refresh_scouts(id):
    global active_scouts
    global start_scouts
    global active_users
    # Import Scout models for thread
    import models
    from models import model, scouts, scout, users

    try:
        nightscouts = scouts()
        appusers = users()
        active_scouts = nightscouts.get_all()
        active_users = appusers.get_all()

        print("Refresh Scouts Job " + id + "")
        if start_scouts == False:
            start_scouts = True
    except:
        print("Error when refresh scouts")


# This job is executed certain periods of time to get the last nightscout entry
# If the glucose is not between the range then make a call to the personal phone notifiying the level
# If the call is not answered then events url is going to serve a NCCO sending SMS to the emergency number
# And if applicable any extra contacts


def job(id):
    # Calling nemo global client variable
    global client
    global active_scouts
    global users
    global nightscout_failed_pings
    global nightscout_failed_update_wait_mark
    global start_scouts

    print("Alerts Job " + id + "")
    if active_scouts != None:
        print("HERE")
        if start_scouts == False:
            refresh_scouts('Starting_Scouts')
        for active_scout in active_scouts:
            print("Nightscout API:", active_scout["nightScoutURL"])
            try:
                entries = requests.get(active_scout["nightScoutURL"]).json()
                glucose = entries[0]['sgv']
                # No failed connection, so initialise the failed pings to zero for the active user
                nightscout_failed_pings[active_scout["phoneNumber"]] = 0
                # Check if the last NIGHTSCOUT entry doesn't exceed the NIGHTSCOUT NOT_UPDATE SECONDS limit.
                # In other words, this code verifies if nightscout entries get updates
                current_isoformat_datetime = datetime.utcnow().isoformat()
                nightscout_datetime = entries[0]['dateString']
                # Little trick to make UTC isodate from nodejs moment library compatible with python isoformat
                nightscout_isoformat_datetime = nightscout_datetime.replace("Z", "+00:00")
                # Difference in seconds between current time and last nightscout entry
                time_difference = calendar.timegm(
                    datetime.fromisoformat(current_isoformat_datetime).utctimetuple() \
                    ) - calendar.timegm(datetime.fromisoformat(nightscout_isoformat_datetime).utctimetuple())

                print("TIME_DIFF:", time_difference, " ", os.getenv("NIGHTSCOUT_NOT_UPDATE_SECONDS"))

                if time_difference > int(os.getenv("NIGHTSCOUT_NOT_UPDATE_SECONDS")):
                    raise Exception("entry_update")
                else:
                    nightscout_failed_update_wait_mark[active_scout["phoneNumber"]] = 0

                user_info = next(item for item in active_users if item["id"] == active_scout["id"])

                # We add a dynamic attribute called glucose to pass glucose info to events url
                # print(active_users[active_scout['id']])
                if active_scout["minBG"] <= glucose <= active_scout["maxBG"]:
                    print("{0} is inside the range {1},{2} for {3}".format(
                        glucose, active_scout["minBG"], active_scout["maxBG"], user_info["displayName"]))
                else:
                    print("Executing emergency call and loading sms NCCO if needed")
                    call_glucose_alert(active_scout["phoneNumber"], glucose)
            except KeyError:
                print("Key error")
            except Exception as instance:
                if instance.args[0] == 'entry_update':
                    handle_nightscout_failed_update(
                        active_scout["phoneNumber"], active_scout["nightScoutURL"], user_info["displayName"])
                    print(
                        "No updated entries for user, executing the failed update handler for user " + user_info[
                            "displayName"])
                else:
                    handle_nightscout_failed_pings(
                        active_scout["phoneNumber"], active_scout["nightScoutURL"], user_info["displayName"])
                    print("Server could not establish connection with " +
                          active_scout["nightScoutURL"])


# Manage individual schedule Thread Loop
def run_schedule():
    global thread
    while True:
        try:
            schedule.run_pending()
            time.sleep(1)
        except ApplicationKilledException:
            print("Signal Detected: Killing Nightscout-Nexmo App.")
            # clean the schedule
            schedule.clear()
            return "Thread Killed"


if __name__ == "notifier":
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    # run job at second 30 of each minute
    schedule.every().minute.at(':30').do(job, str(uuid.uuid4()))
    # update scouts each our at minute 00
    schedule.every().hour.at(':00').do(refresh_scouts, str(uuid.uuid4()))
    thread = Process(target=run_schedule)
    thread.start()
    print("Nightscout-Nexmo Thread starts")
