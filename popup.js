// Function to add st, nd, rd, th to floor numbers
function getOrdinal(n) {
    let s = ["th", "st", "nd", "rd"];
    let v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Function to force MM-DD-YYYY format
function formatDate(dateInput) {
    if (!dateInput) return "";
    let d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput; 

    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let dd = String(d.getDate()).padStart(2, '0');
    let yyyy = d.getFullYear();
    
    return `${mm}-${dd}-${yyyy}`;
}

// Function to route exact building dropdown formatting
function getAccessLevelSearch(bldgAbbr, floorDigit, roomSuffixInt) {
    let floorOrdinal = getOrdinal(parseInt(floorDigit));
    let bldgUpper = bldgAbbr.toUpperCase();

    switch(bldgUpper) {
        case "AND": return roomSuffixInt >= 1 && roomSuffixInt <= 38 ? `Anderson Hall ${floorOrdinal} Floor South` : `Anderson Hall ${floorOrdinal} Floor North`;
        case "LETT": return roomSuffixInt >= 25 && roomSuffixInt <= 48 ? `Letts Hall - ${floorOrdinal} Floor South` : `Letts Hall - ${floorOrdinal} Floor North`;
        case "CSSL": return `Cassell Hall ${floorDigit}`;
        case "CENT": return `Centennial Hall ${floorDigit}`;
        case "CLRK": return `Clark Hall ${floorDigit}`;
        case "CNST": return `Constitution ${floorDigit}`;
        case "DBR":  return `Duber ${floorDigit}`;
        case "FDRL": return `Federal ${floorDigit}`;
        case "HUGH": return `Hughes Hall ${floorDigit}`;
        case "LEO":  return `Leonard Hall ${floorDigit}`;
        case "MCD":  return `McDowell Hall ${floorDigit}`;
        default: return `${bldgUpper} ${floorDigit}`; 
    }
}

// NEW: Function to translate "AND" to "Anderson" for the Checkbox label
function getCheckboxBuildingName(abbr) {
    switch(abbr.toUpperCase()) {
        case "AND": return "Anderson";
        case "LETT": return "Letts";
        case "CSSL": return "Cassell";
        case "CENT": return "Centennial";
        case "CLRK": return "Clark";
        case "CNST": return "Constitution";
        case "DBR": return "Duber";
        case "FDRL": return "Federal";
        case "HUGH": return "Hughes";
        case "LEO": return "Leonard";
        case "MCD": return "McDowell";
        default: return abbr;
    }
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

        if (file.name.endsWith('.csv')) {
            const results = Papa.parse(data, { header: true, skipEmptyLines: true });
            parsedRows = results.data;
            processData(parsedRows, confName);
        } else if (file.name.endsWith('.xlsx')) {
            const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
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
        
        let checkIn = formatDate(row['Booking Check In Date']);
        let checkOut = formatDate(row['Booking Check Out Date']);

        if (!first || !isNaN(first)) return;

        const match = roomDesc.match(/([A-Za-z]+)\s*(\d+)/);
        if (match) {
            let bldgAbbr = match[1].toUpperCase();
            let rawRoom = match[2];

            let floorDigit = rawRoom.length > 2 ? rawRoom.substring(0, rawRoom.length - 2) : "1";
            let roomSuffixStr = rawRoom.length > 2 ? rawRoom.substring(rawRoom.length - 2) : rawRoom;
            let roomSuffixInt = parseInt(roomSuffixStr, 10);

            let accessLevelSearch = getAccessLevelSearch(bldgAbbr, floorDigit, roomSuffixInt);
            let checkboxBldgName = getCheckboxBuildingName(bldgAbbr);

            let fullString = `${cardNum}, ${first} ${last}, ${roomDesc}, ${confName}, ${checkIn}-${checkOut}`;

            formattedCards.push({
                full_string: fullString,
                access_level_search: accessLevelSearch,
                // THIS FIXES THE TEXT MISMATCH (e.g., "Anderson 214")
                room_checkbox_label: `${checkboxBldgName} ${rawRoom}`, 
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
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "start_automation",
            cardsList: formattedCards
        });
    });
}
