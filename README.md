# MindFest — Brighter Mind Scan

An iPad-first, three-second fingerprint experience for Counselling Month. The page creates a positive wellbeing moment and sends a short servo celebration to an ESP32 through Firebase Realtime Database.

## Experience

1. Touch and hold the fingerprint for three seconds.
2. The scan animates through Presence, Calm, and Connection.
3. A glowing fingerprint and positive reflection appear.
4. Firebase sets D4 to 135° and D5 to 45°, then returns both to 90° after 2.5 seconds.

This is a playful event experience, not a mental-health assessment or diagnostic tool.

## Firebase paths

- `/mindfest/servos/d4/angle`
- `/mindfest/servos/d5/angle`
- `/mindfest/command`
- `/mindfest/scans/{scanId}`

The included `firebase.rules.json` allows public event access. For an attended kiosk, restrict the database after the event or add Firebase App Check before using this pattern in a permanent public installation.

## ESP32

Open `esp32/mindfest_servo.ino`, add the venue Wi-Fi credentials, and upload it to the ESP32. Install the Firebase Client and ESP32Servo libraries first. Power the servos from a suitable external 5V supply and join its ground to ESP32 ground.

## Local preview

Serve the folder with any static web server. The app uses Firebase's browser modules directly and needs internet access.

## GitHub Pages

In the repository settings, choose **Pages → Deploy from a branch → main / root**. The app is buildless and deploys directly.
