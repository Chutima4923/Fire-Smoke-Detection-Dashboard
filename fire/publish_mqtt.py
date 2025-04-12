from paho.mqtt import client as mqtt_client
import json
import time
import base64
import cv2

# MQTT Broker details
broker = "broker.emqx.io"
port = 1883
topic = "KukKukKai/DetectionStatus"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT Broker!")
    else:
        print(f"Failed to connect, return code {rc}")

def connect_mqtt():
    client = mqtt_client.Client()
    client.on_connect = on_connect
    client.connect(broker, port)
    return client

def publish(client, image_path, fire, smoke):
    try:
        with open(image_path, "rb") as image_file:
            encoded_image = base64.b64encode(image_file.read()).decode('utf-8')

        times = time.time()
        message = f"Hello, MQTT via EMQX broker!"
        payload = {
            "TimeStamp": times,
            "message": message,
            "fire": fire,
            "smoke": smoke,
            "picture": encoded_image
        }
        json_payload = json.dumps(payload, ensure_ascii=False)

        result = client.publish(topic, json_payload)
        status = result[0]
        if status == 0:
            print(f"Message sent successfully")
        else:
            print(f"Failed to send message, error code {status}")

    except FileNotFoundError:
        print(f"Error: Image file not found at {image_path}")
    except Exception as e:
        print(f"Error during publishing: {e}")

def run():
    client = connect_mqtt()
    client.loop_start()  # Start the loop in the background

    time.sleep(2) # Give some time for the connection to establish

    fire = True
    smoke = True
    image_path = "C:/Users/admin/Desktop/fire/frame_20250320_005649_00236.jpg"

    for i in range(10):
        print(f"Sending message {i+1} to MQTT...")
        publish(client, image_path, fire, smoke)
        time.sleep(15)

    client.loop_stop()
    client.disconnect()
    print("Done")

if __name__ == '__main__':
    run()