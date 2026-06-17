// Listen for the payload from the extension popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "start_automation") {
        runSaltoAutomation(request.cardsList);
    }
});

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

        // 3. Dropdown Logic
        let dropdown = document.getElementById("select2-visitor-access-level-container");
        
        if (dropdown) {
            dropdown.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            await new Promise(r => setTimeout(r, 600)); 
            
            let searchBox = document.querySelector("input.select2-search__field");
            if (searchBox) {
                searchBox.value = card.access_level_search;
                searchBox.dispatchEvent(new Event('input', { bubbles: true }));
                
                await new Promise(r => setTimeout(r, 600)); 
                
                let enterDown = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', keyCode: 13 });
                let enterUp = new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter', keyCode: 13 });
                
                searchBox.dispatchEvent(enterDown);
                searchBox.dispatchEvent(enterUp);

                // WAIT 2 FULL SECONDS for the Optional Facilities to load!
                await new Promise(r => setTimeout(r, 2000)); 
                
                let options = document.querySelectorAll("li.select2-results__option");
                for (let opt of options) {
                    if (opt.innerText.includes(card.access_level_search)) {
                        opt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                        break;
                    }
                }
            }
        }

        // Wait another moment to ensure the UI is fully settled
        await new Promise(r => setTimeout(r, 1000)); 

        // 4. Click Room Checkbox (THE ANGULAR FIX)
        let labels = document.querySelectorAll("label.field__label--radiocheck");
        
        for (let label of labels) {
            // Using textContent to avoid any invisible HTML formatting getting in the way
            if (label.textContent.includes(card.room_checkbox_label)) {
                
                // Read the secret ID link
                let checkboxId = label.getAttribute("for");
                let checkbox = document.getElementById(checkboxId);
                
                if (checkbox) {
                    // Scroll it into the center of the screen so Angular doesn't block off-screen clicks
                    checkbox.scrollIntoView({ behavior: "smooth", block: "center" });
                    
                    if (!checkbox.checked) {
                        checkbox.click();
                        // Force Angular's ng-model to recognize the change
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else {
                    // Fallback just in case
                    label.scrollIntoView({ behavior: "smooth", block: "center" });
                    label.click();
                }
                break;
            }
        }

        // Wait 1 second before submitting to let Angular catch up
        await new Promise(r => setTimeout(r, 1000)); 

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