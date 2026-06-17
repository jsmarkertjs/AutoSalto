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

        await new Promise(r => setTimeout(r, 1000)); 

        // 4. Click Room Checkbox (FULL HUMAN SIMULATION)
        let labels = document.querySelectorAll("label.field__label--radiocheck");
        let foundBox = false;

        for (let label of labels) {
            // Clean up any hidden spaces or line breaks in the HTML text
            let labelText = label.textContent.replace(/\s+/g, ' ').trim();
            
            if (labelText === card.room_checkbox_label || labelText.includes(card.room_checkbox_label)) {
                foundBox = true;
                
                // Scroll to center
                label.scrollIntoView({ behavior: "smooth", block: "center" });
                
                // Strategy A: Click the label like a human mouse
                label.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                label.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                label.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

                // Strategy B: Click the parent <li> which holds the Angular ng-click event
                let parentLi = label.closest('li');
                if (parentLi) {
                    parentLi.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                    parentLi.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                    parentLi.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                }

                // Strategy C: Brute-force the hidden input
                let checkboxId = label.getAttribute("for");
                if (checkboxId) {
                    let checkbox = document.getElementById(checkboxId);
                    if (checkbox && !checkbox.checked) {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('input', { bubbles: true }));
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                break;
            }
        }

        // Debugging trap: If it failed to find the text, it will print an error to the F12 Console
        if (!foundBox) {
            console.error(`❌ CRITICAL ERROR: Could not find any label matching "${card.room_checkbox_label}". The text on the screen does not match what the script is looking for!`);
        }

        // Wait 1 second before submitting
        await new Promise(r => setTimeout(r, 1000)); 

        // 5. Submit
        let submitBtn = document.getElementById("submit-button");
        if (submitBtn) {
            submitBtn.click();
        }

        // Wait for the encoder to finish before moving to next card
        await new Promise(r => setTimeout(r, 3500));
    }
    
    alert("Batch Complete!");
}