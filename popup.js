// Hardcoded mappings (Translated from your Python logic)
const buildingMap = {
    "AND": "Anderson Hall", "CSSL": "Cassell Hall", "CENT": "Centennial Hall",
    "CLRK": "Clark Hall", "CNST": "Constitution Hall", "DBR": "Duber Hall",
    "FDRL": "Federal Hall", "HUGH": "Hughes Hall", "LEO": "Leonard Hall",
    "LETT": "Letts Hall", "MCD": "McDowell Hall", "NEB": "Nebraska Hall"
};

function getOrdinal(n) {
    let s = ["th", "st", "nd", "rd"];
    let v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Attach listener to the Start Button
document.getElementById('startBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('fileUpload');
    const confName = document.getElementById('confName').value.trim();
    const statusLabel = document.getElementById('status');

    if (fileInput.files.length === 0) {
        statusLabel.innerText = "Error: Please select a file first.";
        statusLabel.style.color = "red";
        return;
    }

    const file = fileInput.files[0];
    statusLabel.innerText = "Parsing data...";
    statusLabel.style.color = "black";

    const reader = new FileReader();
    
    reader.onload = function(e) {
        const data = e.target.result;
        let parsedRows = [];

        // Determine if CSV or XLSX
        if (file.name.endsWith('.csv')) {
            const results = Papa.parse(data, { header: true, skipEmptyLines: true });
            parsedRows = results.data;
            processData(parsedRows, confName);
        } else if (file.name.endsWith('.xlsx')) {
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheet = workbook.SheetNames[0];
            parsedRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
            processData(parsedRows, confName);
        }
    };

    if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
});

function processData(rows, confName) {
    let formattedCards = [];

    rows.forEach(row => {
        let first = row['Entry Name First'] || "";
        let last = row['Entry Name Last'] || "";
        let roomDesc = row['Entry Summary Room Space Description'] || "";
        let cardNum = row['Entry Guest Card #'] || "";
        let checkIn = row['Booking Check In Date'] || "";
        let checkOut = row['Booking Check Out Date'] || "";

        // Skip empties or numeric-only names
        if (!first || !isNaN(first)) return;

        // Regex to split room string (e.g., "LETT 401-1")
        const match = roomDesc.match(/([A-Za-z]+)\s*(\d+)/);
        if (match) {
            let bldgAbbr = match[1].toUpperCase();
            let rawRoom = match[2];
            let fullBldgName = buildingMap[bldgAbbr] || bldgAbbr;

            // Floor math
            let floorDigit = rawRoom.length > 2 ? rawRoom.substring(0, rawRoom.length - 2) : "1";
            let floorString = getOrdinal(parseInt(floorDigit)) + " Floor";
            let accessLevelSearch = `${fullBldgName} ${floorString}`;

            // Build the final string
            let fullString = `${cardNum}, ${first} ${last}, ${roomDesc}, ${confName}, ${checkIn}-${checkOut}`;

            formattedCards.push({
                full_string: fullString,
                access_level_search: accessLevelSearch,
                room_checkbox_label: `${bldgAbbr} ${rawRoom}`,
                start_date_str: checkIn,
                end_date_str: checkOut
            });
        }
    });

    if (formattedCards.length === 0) {
        document.getElementById('status').innerText = "Error: No valid data found.";
        return;
    }

    document.getElementById('status').innerText = `Success! Loaded ${formattedCards.length} cards.`;
    
    // Send the data directly to the Salto webpage!
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "start_automation",
            cardsList: formattedCards
        });
    });
}