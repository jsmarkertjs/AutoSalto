// Listen for the payload from the extension popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "start_automation") {
        runSaltoAutomation(request.cardsList);
    }
});

// Helper function to force Angular/React to recognize injected text
function simulateTyping(elementId, value) {
    let el = document.getElementById(elementId);
    if (el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

async function runSaltoAutomation(cardsList) {
    for (let i = 0; i < cardsList.length; i++) {
        let card = cardsList[i];
        
        // This replaces the Tkinter popup! Native browser alerts pause the script perfectly.
        let proceed = confirm(`Card ${i + 1} of ${cardsList.length}\n\n👉 PLACE card on encoder for:\n${card.full_string}\n\nClick OK to encode, or Cancel to stop entirely.`);
        
        if (!proceed) {
            alert("Automation stopped by user.");
            break;
        }

        // 1. Fill Name
        simulateTyping("name", card.full_string);

        // 2. Fill Dates
        simulateTyping("fullpicker-date-activation", card.start_date_str);
        simulateTyping("fullpicker-date-expiration", card.end_date_str);

        // 3. Dropdown Logic
        // Because Select2 dropdowns require a click to open, we simulate it
        let dropdown = document.getElementById("select2-visitor-access-level-container");
        if (dropdown) {
            dropdown.click(); // Open the menu
            
            // Wait 500ms for animation, then find and click the target floor
            await new Promise(r => setTimeout(r, 500)); 
            let options = document.querySelectorAll("li.select2-results__option");
            for (let opt of options) {
                if (opt.innerText.includes(card.access_level_search)) {
                    opt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    break;
                }
            }
            await new Promise(r => setTimeout(r, 500)); // Wait to close
        }

        // 4. Click Room Checkbox
        // We find all field elements, look for the text match, and click the checkbox inside
        let fields = document.querySelectorAll("field");
        for (let field of fields) {
            if (field.innerText.includes(card.room_checkbox_label)) {
                let checkbox = field.querySelector("input[type='checkbox']");
                if (checkbox && !checkbox.checked) {
                    checkbox.click();
                }
                break;
            }
        }

        // 5. Submit
        let submitBtn = document.getElementById("submit-button");
        if (submitBtn) {
            submitBtn.click();
        }

        // Wait a few seconds for the encoder to finish before looping to the next card
        await new Promise(r => setTimeout(r, 3500));
    }
    
    alert("Batch Complete!");
}