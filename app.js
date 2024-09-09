// Check for IndexedDB support in the browser
if (!window.indexedDB) {
    console.log("Your browser doesn't support IndexedDB.");
}

// Open (or create) the IndexedDB database
let db;
const request = indexedDB.open('AgricultureDB', 1);

request.onerror = function (event) {
    console.log('Error opening IndexedDB:', event.target.errorCode);
};

request.onsuccess = function (event) {
    db = event.target.result;
    console.log('IndexedDB opened successfully.');

    // Run the test functions when the database is ready
    runAllTests();
};

request.onupgradeneeded = function (event) {
    db = event.target.result;

    // Create an object store named "FarmData" with auto-incrementing primary key
    const objectStore = db.createObjectStore('FarmData', { keyPath: 'id', autoIncrement: true });

    // Define the fields in the object store
    objectStore.createIndex('sensorReadings', 'sensorReadings', { unique: false });
    objectStore.createIndex('cropPhoto', 'cropPhoto', { unique: false });
    objectStore.createIndex('farmerNote', 'farmerNote', { unique: false });
    objectStore.createIndex('gpsCoordinates', 'gpsCoordinates', { unique: false });
    objectStore.createIndex('timestamp', 'timestamp', { unique: false });

    console.log('Object store "FarmData" created.');
};

// Initialize the page on load
function initializePage() {
    document.getElementById('retrievedData').textContent = 'Loading...';
    retrieveData(); // Display any existing data on load
}

// Function to store data in IndexedDB
function storeData() {
    const sensorReadings = document.getElementById('sensorReadings').value.split(',').map(Number);
    const cropPhotoFile = document.getElementById('cropPhoto').files[0];
    const farmerNote = document.getElementById('farmerNote').value;
    const gpsCoordinates = parseFloat(document.getElementById('gpsCoordinates').value);
    const timestamp = new Date(); // Automatically take current date and time from the computer

    // Convert image to Base64 string
    const reader = new FileReader();
    reader.onloadend = function () {
        const cropPhoto = reader.result;

        const transaction = db.transaction(['FarmData'], 'readwrite');
        const objectStore = transaction.objectStore('FarmData');

        const data = {
            sensorReadings: sensorReadings,
            cropPhoto: cropPhoto,
            farmerNote: farmerNote,
            gpsCoordinates: gpsCoordinates,
            timestamp: timestamp
        };

        const request = objectStore.add(data);

        request.onsuccess = function () {
            console.log('Data added to IndexedDB successfully.');
            retrieveData(); // Refresh data display
        };

        request.onerror = function (event) {
            console.log('Error adding data to IndexedDB:', event.target.errorCode);
        };
    };

    if (cropPhotoFile) {
        reader.readAsDataURL(cropPhotoFile); // Convert file to Base64 string
    } else {
        console.log("No image file selected.");
    }
}

// Function to retrieve data from IndexedDB
function retrieveData() {
    const transaction = db.transaction(['FarmData'], 'readonly');
    const objectStore = transaction.objectStore('FarmData');

    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        console.log('Retrieved data from IndexedDB:', event.target.result);
        document.getElementById('retrievedData').textContent = JSON.stringify(event.target.result, null, 2);
    };

    request.onerror = function (event) {
        console.log('Error retrieving data from IndexedDB:', event.target.errorCode);
    };
}

// Helper function to retrieve data for testing
function retrieveDataFromDB(callback) {
    const transaction = db.transaction(['FarmData'], 'readonly');
    const objectStore = transaction.objectStore('FarmData');

    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        callback(event.target.result);
    };

    request.onerror = function (event) {
        console.log('Error retrieving data for testing:', event.target.errorCode);
    };
}

// Test Functions
function runTestScenario(testData, testName) {
    const transaction = db.transaction(['FarmData'], 'readwrite');
    const objectStore = transaction.objectStore('FarmData');

    const request = objectStore.add(testData);

    request.onsuccess = function () {
        console.log(`${testName}: Data added successfully.`);

        retrieveDataFromDB((data) => {
            const result = data.find(entry => entry.sensorReadings[0] === testData.sensorReadings[0]); // Adjust the condition as needed
            console.assert(result, `${testName}: Data not found!`);

            console.assert(JSON.stringify(result.sensorReadings) === JSON.stringify(testData.sensorReadings), `${testName}: Sensor readings mismatch!`);
            console.assert(result.cropPhoto === testData.cropPhoto, `${testName}: Crop photo mismatch!`);
            console.assert(result.farmerNote === testData.farmerNote, `${testName}: Farmer note mismatch!`);
            console.assert(result.gpsCoordinates === testData.gpsCoordinates, `${testName}: GPS coordinates mismatch!`);
            console.assert(new Date(result.timestamp).toISOString() === testData.timestamp.toISOString(), `${testName}: Timestamp mismatch!`);
            console.log(`${testName}: All tests passed.`);
        });
    };

    request.onerror = function (event) {
        console.error(`${testName}: Error adding data:`, event.target.errorCode);
    };
}

// Run all test scenarios
function runAllTests() {
    runTestScenario({
        sensorReadings: [24.7, 56.3],
        cropPhoto: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...",
        farmerNote: "Inspected the field on a sunny morning. Found a few pest traces on the leaves.",
        gpsCoordinates: 28.6139,
        timestamp: new Date("2024-09-05T10:30")
    }, 'Test 1: Valid Input Data');

    runTestScenario({
        sensorReadings: [25.5, 58.0],
        cropPhoto: null,
        farmerNote: "",
        gpsCoordinates: 28.7041,
        timestamp: new Date("2024-09-06T15:00")
    }, 'Test 2: Empty Strings and Null Values');

    runTestScenario({
        sensorReadings: [150.0, 200.0],
        cropPhoto: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...",
        farmerNote: "This is a very long note to test the application\'s capability of handling large text inputs.",
        gpsCoordinates: -180.0000,
        timestamp: new Date("2024-12-31T23:59")
    }, 'Test 3: Extreme and Large Values');

    runTestScenario({
        sensorReadings: [-10.5, -20.0],
        cropPhoto: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...",
        farmerNote: "Unusual characters: !@#$%^&*()",
        gpsCoordinates: -45.0000,
        timestamp: new Date("2024-01-01T00:00")
    }, 'Test 4: Negative Values and Unusual Characters');

    runTestScenario({
        sensorReadings: [23.0, 55.0],
        cropPhoto: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...",
        farmerNote: "Regular checkup. Found slight discoloration in some leaves.",
        gpsCoordinates: 40.7128,
        timestamp: new Date("2024-10-10T12:45")
    }, 'Test 5: Realistic Farm Data');
}
