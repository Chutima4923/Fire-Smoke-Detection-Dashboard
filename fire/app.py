from flask import Flask, render_template
from flask_socketio import SocketIO
import paho.mqtt.client as mqtt
import json

# =========================
# Flask & Socket.IO Setup
# =========================
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key!'
socketio = SocketIO(app)

# =========================
# MQTT Broker Configuration
# =========================
MQTT_BROKER = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "KukKukKai/DetectionStatus"

# =========================
# MQTT Callback Functions
# =========================
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connected to MQTT Broker!")
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"❌ Failed to connect. Return code: {rc}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode('utf-8'))
        socketio.emit('detection_data', payload)
    except Exception as e:
        print(f"⚠️ Error processing MQTT message: {e}")

# =========================
# MQTT Connection Function
# =========================
def connect_mqtt():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT)
    return client

# =========================
# Flask Routes
# =========================
@app.route('/')
def index():
    return render_template('index.html')

# =========================
# Socket.IO Events
# =========================
@socketio.on('connect')
def on_client_connect():
    print('🔌 Client connected')

@socketio.on('disconnect')
def on_client_disconnect():
    print('🔌 Client disconnected')

# =========================
# Main Entry Point
# =========================
if __name__ == '__main__':
    client = mqtt.Client(protocol=mqtt.MQTTv311)
socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)


