// ตั้งค่า MQTT Broker
const brokerUrl = 'ws://broker.emqx.io:8083/mqtt'; // ใช้ WebSocket สำหรับเว็บเบราว์เซอร์
const topic = 'KukKukKai/DetectionStatus';
let client;
let fireDetected = false;
let smokeDetected = false;

// ฟังก์ชันสำหรับแปลง base64 เป็น URL ของรูปภาพ
function base64ToImageUrl(base64String) {
    return `data:image/jpeg;base64,${base64String}`; // หรือ image/png ขึ้นอยู่กับประเภทภาพ
}

// ฟังก์ชันสำหรับจัดรูปแบบ Timestamp
function formatTimestamp(timestampString) {
    try {
        const date = new Date(timestampString);
        const day = date.getDate();
        const month = date.getMonth() + 1; // เดือนเริ่มที่ 0
        const year = date.getFullYear();
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // กรณี 0 โมงให้แสดงเป็น 12

        return `${month}/${day}/${year}, ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return timestampString; // แสดง timestamp เดิมหากมีข้อผิดพลาด
    }
}

// ฟังก์ชันอัปเดต UI
function updateUI(data) {
    const fireStatusElement = document.getElementById('fire-status');
    const smokeStatusElement = document.getElementById('smoke-status');
    const displayedImageElement = document.getElementById('displayed-image');
    const alarmSound = document.getElementById('alarm-sound');
    const connectionStatusElement = document.querySelector('body > p'); // เลือก <p> แรกใต้ <body>

    fireDetected = data.Fire;
    smokeDetected = data.Smoke;

    fireStatusElement.textContent = fireDetected ? 'Fire Detected' : 'No Fire Detected';
    fireStatusElement.className = fireDetected ? 'status-alert' : 'status-ok'; // เพิ่ม class เพื่อเปลี่ยนสี (ถ้ามีใน CSS)

    smokeStatusElement.textContent = smokeDetected ? 'Smoke Detected' : 'No Smoke Detected';
    smokeStatusElement.className = smokeDetected ? 'status-alert' : 'status-ok'; // เพิ่ม class เพื่อเปลี่ยนสี (ถ้ามีใน CSS)

    document.getElementById('timestamp').textContent = formatTimestamp(data.TimeStamp);
    displayedImageElement.src = base64ToImageUrl(data.base64);

    // เล่นเสียงเตือนถ้าตรวจพบ
    if (alarmSound && (fireDetected || smokeDetected)) {
        alarmSound.play().catch(e => console.error("Error playing alarm:", e));
    }
}

// ตั้งค่าข้อความเริ่มต้นเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('smoke-status').textContent = 'Loading...';
    document.getElementById('timestamp').textContent = 'Loading...';
});

// เชื่อมต่อกับ MQTT Broker
function connectMQTT() {
    const connectionStatusElement = document.querySelector('body > p'); // เลือก <p> แรกใต้ <body>
    connectionStatusElement.textContent = 'Connecting...';
    connectionStatusElement.className = 'status-connecting'; // เพิ่ม class สำหรับสถานะ (ถ้ามี CSS)

    client = mqtt.connect(brokerUrl);

    client.on('connect', () => {
        console.log('Connected to MQTT Broker');
        connectionStatusElement.textContent = 'Connected';
        connectionStatusElement.className = 'status-connected'; // เพิ่ม class สำหรับสถานะ (ถ้ามี CSS)
        client.subscribe(topic, (err) => {
            if (!err) {
                console.log(`Subscribed to topic: ${topic}`);
            } else {
                console.error('Error subscribing:', err);
                connectionStatusElement.textContent = 'Subscription Error';
                connectionStatusElement.className = 'status-error'; // เพิ่ม class สำหรับสถานะ (ถ้ามี CSS)
            }
        });
    });

    client.on('message', (topic, message) => {
        try {
            const payloadString = message.toString();
            const data = JSON.parse(payloadString);
            console.log('Received message:', data);
            updateUI(data);
        } catch (error) {
            console.error('Error processing MQTT message:', error);
        }
    });

    client.on('error', (err) => {
        console.error('MQTT Error:', err);
        connectionStatusElement.textContent = 'MQTT Error';
        connectionStatusElement.className = 'status-error'; // เพิ่ม class สำหรับสถานะ (ถ้ามี CSS)
    });

    client.on('disconnect', () => {
        console.log('Disconnected from MQTT Broker');
        connectionStatusElement.textContent = 'Disconnected';
        connectionStatusElement.className = 'status-disconnected'; // เพิ่ม class สำหรับสถานะ (ถ้ามี CSS)
        // คุณอาจต้องการให้มีการ reconnect อัตโนมัติที่นี่
        // setTimeout(connectMQTT, 5000); // ลอง reconnect ทุก 5 วินาที
    });
}

// เริ่มการเชื่อมต่อ MQTT เมื่อหน้าเว็บโหลด
window.onload = connectMQTT;
document.addEventListener('DOMContentLoaded', function() {
    const imageUpload = document.getElementById('image-upload');
    const uploadedImage = document.getElementById('uploaded-image');
    const uploadedImageLabel = document.getElementById('uploaded-image-label');
    const uploadButton = document.getElementById('upload-button');
    const uploadStatus = document.getElementById('upload-status');
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

    let selectedFile;

    imageUpload.addEventListener('change', function(event) {
        selectedFile = event.target.files[0];

        if (selectedFile) {
            if (!allowedTypes.includes(selectedFile.type)) {
                uploadStatus.textContent = 'กรุณาเลือกไฟล์ภาพ (JPEG, PNG, GIF) เท่านั้น';
                uploadStatus.style.color = 'red';
                uploadButton.disabled = true;
                uploadedImage.style.display = 'none';
                uploadedImageLabel.style.display = 'none';
                uploadedImage.src = "#";
                return;
            }

            if (selectedFile.size > maxFileSize) {
                uploadStatus.textContent = 'ขนาดไฟล์ภาพต้องไม่เกิน 5MB';
                uploadStatus.style.color = 'red';
                uploadButton.disabled = true;
                uploadedImage.style.display = 'none';
                uploadedImageLabel.style.display = 'none';
                uploadedImage.src = "#";
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                uploadedImage.src = e.target.result;
                uploadedImage.style.display = 'block';
                uploadedImageLabel.style.display = 'block';
                uploadStatus.textContent = '';
                uploadButton.disabled = false;
            }
            reader.readAsDataURL(selectedFile);
        } else {
            uploadedImage.style.display = 'none';
            uploadedImageLabel.style.display = 'none';
            uploadedImage.src = "#";
            uploadButton.disabled = true;
            uploadStatus.textContent = '';
        }
    });

    uploadButton.addEventListener('click', function() {
        if (selectedFile) {
            uploadStatus.textContent = 'กำลังอัปโหลด...';
            uploadStatus.style.color = 'orange';
            uploadButton.disabled = true;

            // *** ส่วนของการส่งภาพไปยัง Server (ใช้ Fetch API) ***
            const uploadEndpoint = '/upload-image'; // ตัวอย่าง URL สำหรับ Server
            const formData = new FormData();
            formData.append('image', selectedFile);

            fetch(uploadEndpoint, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                uploadStatus.textContent = 'อัปโหลดสำเร็จ!';
                uploadStatus.style.color = 'green';
                // ทำอย่างอื่นหลังอัปโหลดสำเร็จ (ถ้ามี)
            })
            .catch(error => {
                console.error('Error uploading image:', error);
                uploadStatus.textContent = 'เกิดข้อผิดพลาดในการอัปโหลด';
                uploadStatus.style.color = 'red';
                uploadButton.disabled = false;
            });

            // *** ตัวอย่างการส่งไปยัง MQTT Broker (Uncomment และปรับปรุงถ้าต้องการ) ***
            // const reader = new FileReader();
            // reader.onloadend = function() {
            //     const base64Image = reader.result.split(',')[1]; // ดึงส่วน base64
            //     const message = JSON.stringify({
            //         uploadedImage: base64Image,
            //         filename: selectedFile.name,
            //         timestamp: new Date().toISOString()
            //     });
            //     client.publish('sensor/uploaded-image', message, { qos: 0, retain: false });
            //     uploadStatus.textContent = 'ส่งภาพไปยัง MQTT แล้ว!';
            //     uploadStatus.style.color = 'green';
            //     uploadButton.disabled = false;
            // };
            // reader.readAsDataURL(selectedFile);

        } else {
            uploadStatus.textContent = 'กรุณาเลือกไฟล์ภาพก่อนทำการอัปโหลด';
            uploadStatus.style.color = 'red';
        }
    });
});