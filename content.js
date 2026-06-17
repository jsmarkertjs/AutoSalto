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

        // 3. Dropdown Logic (THE FIX)
        // Select2 frameworks often ignore standard clicks. We must dispatch a 'mousedown' to force it open.
        let dropdown = document.getElementById("select2-visitor-access-level-container");
        
        if (dropdown) {
            dropdown.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            
            // Wait for the opening animation and for the search box to appear in the HTML
            await new Promise(r => setTimeout(r, 600)); 
            
            // Find the exact search box from your screenshot
            let searchBox = document.querySelector("input.select2-search__field");
            if (searchBox) {
                // Type our specific floor search string into it
                searchBox.value = card.access_level_search;
                searchBox.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Wait for Salto to filter the results based on our typing
                await new Promise(r => setTimeout(r, 600)); 
                
                // Now find the visible result and trigger a 'mouseup' to select it
                let options = document.querySelectorAll("li.select2-results__option");
                for (let opt of options) {
                    if (opt.innerText.includes(card.access_level_search)) {
                        opt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                        break;
                    }
                }
            }
        }

        // Wait half a second for the dropdown menu to fully close before moving on
        await new Promise(r => setTimeout(r, 500)); 

        // 4. Click Room Checkbox
        let fields = document.querySelectorAll("field");
        for (let field of fields) {
            if (field.innerText.includes(card.room_checkbox_label)) {
                let checkbox = field.querySelector("input[type='checkbox']");
                if (checkbox && !checkbox.checked) {
                    checkbox.click();
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
                break;
            }
        }

        // 5. Submit
        let submitBtn = document.getElementById("submit-button");
        if (submitBtn) {
            submitBtn.click();
        }

        // Wait 3.5 seconds for the encoder to finish before looping to the next card
        await new Promise(r => setTimeout(r, 3500));
    }
    
    alert("Batch Complete!");
}