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

// NEW: A custom HTML popup menu injected directly into the page!
function promptUserAction(messageText) {
    return new Promise((resolve) => {
        // Create the dark background overlay
        let overlay = document.createElement('div');
        overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 999999; display: flex; align-items: center; justify-content: center;";

        // Create the white menu box
        let box = document.createElement('div');
        box.style.cssText = "background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; min-width: 400px;";

        // Add the message text
        let msg = document.createElement('div');
        msg.style.cssText = "margin-bottom: 25px; white-space: pre-wrap; font-size: 16px; color: #333; line-height: 1.5;";
        msg.innerText = messageText;

        // Container for the buttons
        let btnContainer = document.createElement('div');
        btnContainer.style.cssText = "display: flex; gap: 15px; justify-content: center;";

        // Style template for buttons
        let baseBtnStyle = "padding: 10px 20px; border: none; border-radius: 5px; font-size: 14px; font-weight: bold; cursor: pointer; color: white;";

        // 1. Encode Button
        let btnEncode = document.createElement('button');
        btnEncode.innerText = "✅ Encode Card";
        btnEncode.style.cssText = baseBtnStyle + " background-color: #4CAF50;";
        btnEncode.onclick = () => { document.body.removeChild(overlay); resolve('encode'); };

        // 2. Skip Button
        let btnSkip = document.createElement('button');
        btnSkip.innerText = "⏭️ Skip Card";
        btnSkip.style.cssText = baseBtnStyle + " background-color: #FF9800;";
        btnSkip.onclick = () => { document.body.removeChild(overlay); resolve('skip'); };

        // 3. Stop Button
        let btnStop = document.createElement('button');
        btnStop.innerText = "🛑 Stop";
        btnStop.style.cssText = baseBtnStyle + " background-color: #F44336;";
        btnStop.onclick = () => { document.body.removeChild(overlay); resolve('stop'); };

        // Put it all together
        btnContainer.appendChild(btnEncode);
        btnContainer.appendChild(btnSkip);
        btnContainer.appendChild(btnStop);
        box.appendChild(msg);
        box.appendChild(btnContainer);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    });
}

async function runSaltoAutomation(cardsList) {
    for (let i = 0; i < cardsList.length; i++) {
        let card = cardsList[i];
        
        // Wait for the user to click one of our custom buttons
        let action = await promptUserAction(`Card ${i + 1} of ${cardsList.length}\n\n PLACE card on encoder for:\n${card.full_string}`);
        
        if (action === 'stop') {
            alert("Automation stopped by user.");
            break; // Exits the entire loop
        } else if (action === 'skip') {
            continue; // Skips the rest of this code and instantly jumps to the next card!
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

        // --- NEW: THE CHECKBOX SWEEPER ---
        // Find every single checkbox that is currently checked, and forcefully turn it off
        let allCheckedBoxes = document.querySelectorAll("input[type='checkbox']:checked");
        for (let oldBox of allCheckedBoxes) {
            oldBox.checked = false;
            oldBox.dispatchEvent(new Event('input', { bubbles: true }));
            oldBox.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Wait a tiny moment for Angular to register the unchecking
        await new Promise(r => setTimeout(r, 300)); 
        // ---------------------------------

        // 4. Click Room Checkbox
        let labels = document.querySelectorAll("label.field__label--radiocheck");
        let foundBox = false;

        for (let label of labels) {
            let labelText = label.textContent.replace(/\s+/g, ' ').trim();
            
            if (labelText === card.room_checkbox_label || labelText.includes(card.room_checkbox_label)) {
                foundBox = true;
                label.scrollIntoView({ behavior: "smooth", block: "center" });
                
                // Strategy A
                label.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                label.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                label.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

                // Strategy B
                let parentLi = label.closest('li');
                if (parentLi) {
                    parentLi.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                    parentLi.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                    parentLi.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                }

                // Strategy C
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

        if (!foundBox) {
            console.error(`❌ CRITICAL ERROR: Could not find any label matching "${card.room_checkbox_label}".`);
        }

        await new Promise(r => setTimeout(r, 1000)); 

        // 5. Submit
        let submitBtn = document.getElementById("submit-button");
        if (submitBtn) {
            submitBtn.click();
        }

        // Wait for the encoder to finish before moving to next card
        await new Promise(r => setTimeout(r, 4500));
    }
    
    alert("Batch Complete!");
}