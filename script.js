// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB7UtsRDgcKjo8HQiu0Rg_br4gyncerKIc",
    authDomain: "bmical-9c9c3.firebaseapp.com",
    databaseURL: "https://bmical-9c9c3-default-rtdb.firebaseio.com",
    projectId: "bmical-9c9c3",
    storageBucket: "bmical-9c9c3.appspot.com",
    messagingSenderId: "376780476710",
    appId: "1:376780476710:web:7ee3fb513732f2daa031e7"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();

  // Initialize EmailJS
  document.addEventListener("DOMContentLoaded", function () {
    emailjs.init("FSk3pFHIWdW5JXeYv"); // Make sure your user ID is correct
  });
  

  // Function to move a student to "Now Serving"
  function moveToNowServing(queueId, name, section, email, concern, queueNumber) {
    const queueRef = database.ref(`queue/${queueId}`);
    queueRef.update({ status: "Now Serving" });

    // Send email notification
    sendEmailNotification(name, section, email, concern, queueNumber);
  }

  // Function to remove a student from Pending with confirmation
  function removePending(queueId) {
    if (confirm("Are you sure you want to remove this student from the queue?")) {
      database.ref(`queue/${queueId}`).remove();
    }
  }

  // Function to remove a served student
  function removeServed(queueId) {
    database.ref(`queue/${queueId}`).remove();
  }

  // Function to send email notification to the user
  function sendEmailNotification(name, section, email, concern, queueNumber) {
    const templateParams = {
      to_email: email,
      name: name,
      section: section,
      concern: concern,
      queue_number: queueNumber
    };

    emailjs
      .send("service_e8wb3qq", "template_74od478", templateParams)
      .then(
        (response) => console.log("Email sent successfully!", response.status, response.text),
        (error) => console.error("Failed to send email:", error)
      );
  }

  // Function to render the queue differently for Admin and Monitor
  function renderQueue() {
    const pendingList = document.getElementById("pendingList");
    const nowServingList = document.getElementById("nowServingList");
  
    // Detect page type based on the body ID
    const isAdminPage = document.body.id === "adminPage";
    const isMonitorPage = document.body.id === "monitorPage";
  
    database.ref("queue").on("value", (snapshot) => {
      const queueData = snapshot.val();
  
      pendingList.innerHTML = "";
      nowServingList.innerHTML = "";
  
      if (queueData) {
        Object.entries(queueData).forEach(([id, data]) => {
          const queueItem = document.createElement("div");
          queueItem.className = "queue-item";
  
          if (isAdminPage) {
            // Show full details for Admin
            queueItem.innerHTML = `
              <span>#${data.queueNumber}: ${data.name} (${data.section})</span>
              ${data.status === "Pending"
                ? `<div>
                    <button onclick="moveToNowServing('${id}', '${data.name}', '${data.section}', '${data.email}', '${data.concern}', '${data.queueNumber}')">Serve</button>
                    <button class="remove-btn" onclick="removePending('${id}')">Remove</button>
                  </div>`
                : `<button onclick="removeServed('${id}')">Served</button>`}
            `;
          } else if (isMonitorPage) {
            // Show only queue number for Monitor
            queueItem.innerHTML = `<span class="number">#${data.queueNumber}</span>`;
          }
  
          // Append to the appropriate section
          if (data.status === "Pending") {
            pendingList.appendChild(queueItem);
          } else if (data.status === "Now Serving") {
            nowServingList.appendChild(queueItem);
          }
        });
      }
    });
  }
  
  // Run renderQueue when the page loads
  window.onload = () => {
    renderQueue();
  };

  // Add student to queue
  async function addStudent(event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const section = document.getElementById("section").value;
    const email = document.getElementById("email").value;
    const concern = document.getElementById("concern").value;

    const queueNumber = await getQueueNumber();
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString();
    const formattedTime = currentDate.toLocaleTimeString();

    // Push data to Firebase
    await database.ref("queue").push({
      name,
      section,
      email,
      concern,
      status: "Pending",
      queueNumber
    });

    document.getElementById("studentForm").reset();
    document.getElementById("message").innerText = `Thank you, ${name}! Please look at the monitor for your queue number.`;

    generateReceipt(queueNumber, name, formattedDate, formattedTime);
  }

  async function getQueueNumber() {
    const queueDataRef = database.ref("queueData");
    const snapshot = await queueDataRef.once("value");
    const queueData = snapshot.val();

    const currentDate = new Date().toLocaleDateString();
    let nextQueueNumber = "001";

    if (queueData && queueData.date === currentDate) {
      nextQueueNumber = String(parseInt(queueData.lastQueueNumber, 10) + 1).padStart(3, "0");
    }

    await queueDataRef.set({ date: currentDate, lastQueueNumber: nextQueueNumber });
    return nextQueueNumber;
  }

  function generateReceipt(queueNumber, name, date, time) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#3f72af";
    ctx.lineWidth = 20;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

    ctx.fillStyle = "#3f72af";
    ctx.font = "bold 200px Arial";
    ctx.textAlign = "center";
    ctx.fillText(queueNumber, canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = "bold 60px Arial";
    ctx.fillText(name, canvas.width / 2, canvas.height / 2 + 50);

    ctx.font = "40px Arial";
    ctx.fillText(`${date} - ${time}`, canvas.width / 2, canvas.height / 2 + 150);

    ctx.font = "italic 30px Arial";
    ctx.fillText("Please look at the monitor or check your email for updates.", canvas.width / 2, canvas.height / 2 + 250);

    const link = document.createElement("a");
    link.download = `Receipt_${queueNumber}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // Clear the form fields
  function clearForm() {
    document.getElementById("studentForm").reset();
  }

  // Render the queue on page load
  window.onload = () => {
    renderQueue();
  };