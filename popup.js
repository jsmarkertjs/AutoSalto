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
    if (isNaN(d.getTime())) return dateInput; // Fallback to original if parsing fails

    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let dd = String(d.getDate()).padStart(2, '0');
    let yyyy = d.getFullYear();
    
    return `${mm}-${dd}-${yyyy}`;
}

// Function to route exact building formatting
function getAccessLevelSearch(bldgAbbr, floorDigit, roomSuffixInt) {
    let floorOrdinal = getOrdinal(parseInt(floorDigit));
    let bldgUpper = bldgAbbr.toUpperCase();

    switch(bldgUpper) {
        case "AND":
            if (roomSuffixInt >= 21 && roomSuffixInt <= 58) {
                return `Anderson Hall ${floorOrdinal} Floor North`;
            } else {
                return `Anderson Hall ${floorOrdinal} Floor South`;
            }
        case "LETT":
            if (roomSuffixInt >= 25 && roomSuffixInt <= 48) {
                return `Letts Hall - ${floorOrdinal} Floor South`;
            } else {
                return `Letts Hall - ${floorOrdinal} Floor North`;
            }
        case "CSSL": return `Cassell Hall ${floorDigit}`;
        case "CENT": return `Centennial Hall ${floorDigit}`;
        case "CLRK": return `Clark Hall ${floorDigit}`;
        case "CNST": return `Constitution ${floorDigit}`;
        case "DBR":  return `Duber ${floorDigit}`;
        case "FDRL": return `Federal ${floorDigit}`;
        case "HUGH": return `Hughes Hall ${floorDigit}`;
        case "LEO":  return `Leonard Hall ${floorDigit}`;
        case "MCD":  return `McDowell Hall ${floorDigit}`;
        default:
            return `${bldgUpper} ${floorDigit}`; // Fallback if building isn't mapped
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

        // Determine if CSV or XLSX
        if (file.name.endsWith('.csv')) {
            const results = Papa.parse(data, { header: true, skipEmptyLines: true });
            parsedRows = results.data;
            processData(parsedRows, confName);
        } else if (file.name.endsWith('.xlsx')) {
            // Added cellDates: true so Excel reads dates correctly instead of as serial numbers
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
        
        // Format Dates to MM-DD-YYYY immediately 
        let checkIn = formatDate(row['Booking Check In Date']);
        let checkOut = formatDate(row['Booking Check Out Date']);

        // Skip empties or numeric-only names
        if (!first || !isNaN(first)) return;

        // Regex to split room string (e.g., "LETT 401-1")
        const match = roomDesc.match(/([A-Za-z]+)\s*(\d+)/);
        if (match) {
            let bldgAbbr = match[1].toUpperCase();
            let rawRoom = match[2];

            // Math to split the floor from the room suffix (e.g. 421 -> Floor 4, Room 21)
            let floorDigit = rawRoom.length > 2 ? rawRoom.substring(0, rawRoom.length - 2) : "1";
            let roomSuffixStr = rawRoom.length > 2 ? rawRoom.substring(rawRoom.length - 2) : rawRoom;
            let roomSuffixInt = parseInt(roomSuffixStr, 10);

            // Get the exact dropdown string using our new router
            let accessLevelSearch = getAccessLevelSearch(bldgAbbr, floorDigit, roomSuffixInt);

            // Build the final physical label string
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