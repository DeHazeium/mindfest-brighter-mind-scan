/*
  MindFest ESP32 servo controller

  Libraries (Arduino Library Manager):
  - Firebase Arduino Client Library for ESP8266 and ESP32 by Mobizt
  - ESP32Servo by Kevin Harrington / John K. Bennett

  Wiring:
  - Servo signal 1 -> GPIO 4 (D4)
  - Servo signal 2 -> GPIO 5 (D5)
  - Use an external 5V supply for the servos and connect its GND to ESP32 GND.
*/

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ESP32Servo.h>

#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define DATABASE_URL "https://mindfest-d9023-default-rtdb.asia-southeast1.firebasedatabase.app"

constexpr int SERVO_D4_PIN = 4;
constexpr int SERVO_D5_PIN = 5;
constexpr int NEUTRAL_ANGLE = 90;

FirebaseData stream;
FirebaseAuth auth;
FirebaseConfig config;
Servo servoD4;
Servo servoD5;

void applyAngle(const String &path, int angle) {
  angle = constrain(angle, 0, 180);
  if (path.indexOf("d4") >= 0) servoD4.write(angle);
  if (path.indexOf("d5") >= 0) servoD5.write(angle);
}

void streamCallback(FirebaseStream data) {
  const String path = data.dataPath();

  if (data.dataTypeEnum() == fb_esp_rtdb_data_type_integer) {
    applyAngle(path, data.intData());
    return;
  }

  if (data.dataTypeEnum() == fb_esp_rtdb_data_type_json) {
    FirebaseJson *json = data.to<FirebaseJson *>();
    FirebaseJsonData value;
    if (json->get(value, "d4/angle") && value.success) servoD4.write(constrain(value.intValue, 0, 180));
    if (json->get(value, "d5/angle") && value.success) servoD5.write(constrain(value.intValue, 0, 180));
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) Serial.println("Firebase stream timed out; reconnecting…");
}

void setup() {
  Serial.begin(115200);
  servoD4.setPeriodHertz(50);
  servoD5.setPeriodHertz(50);
  servoD4.attach(SERVO_D4_PIN, 500, 2400);
  servoD5.attach(SERVO_D5_PIN, 500, 2400);
  servoD4.write(NEUTRAL_ANGLE);
  servoD5.write(NEUTRAL_ANGLE);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print('.');
  }
  Serial.println("\nWi-Fi connected");

  config.database_url = DATABASE_URL;
  // This kiosk uses the public event-only Firebase rules in firebase.rules.json.
  config.signer.test_mode = true;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  if (!Firebase.RTDB.beginStream(&stream, "/mindfest/servos")) {
    Serial.printf("Stream error: %s\n", stream.errorReason().c_str());
  }
  Firebase.RTDB.setStreamCallback(&stream, streamCallback, streamTimeoutCallback);
}

void loop() {
  if (!Firebase.ready()) delay(100);
}
