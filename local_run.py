# local_run.py
from app import app, socketio

# This is the entry point for running the application locally.
# It imports the 'app' and 'socketio' objects from your main app.py file
# and then runs them with debug settings enabled.

if __name__ == '__main__':
    print("==============================================")
    print(">>> STARTING APP IN LOCAL DEVELOPMENT MODE <<<")
    print(">>> DEBUG IS ON - SERVER WILL AUTO-RELOAD  <<<")
    print("==============================================")

    # The 'host="0.0.0.0"' part makes the server accessible
    # from other devices on your local network (e.g., your phone).
    # Use 'localhost' or '127.0.0.1' to keep it just on your computer.
    # The 'allow_unsafe_werkzeug=True' is sometimes needed for newer SocketIO versions
    # to work with Flask's debug reloader.
    socketio.run(app, host="127.0.0.1", port=5000, debug=True, allow_unsafe_werkzeug=True)
