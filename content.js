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

// A custom HTML popup menu injected directly into the page!
function promptUserAction(messageText) {
    return new Promise((resolve) => {
        let overlay = document.createElement('div');
        overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 999999; display: flex; align-items: center; justify-content: center;";

        let box = document.createElement('div');
        box.style.cssText = "background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; min-width: 400px;";

        let msg = document.createElement('div');
        msg.style.cssText = "margin-bottom: 25px; white-space: pre-wrap; font-size: 16px; color: #333; line-height: 1.5;";
        msg.innerText = messageText;

        let btnContainer = document.createElement('div');
        btnContainer.style.cssText = "display: flex; gap: 15px; justify-content: center;";

        let baseBtnStyle = "padding: 10px 20px; border: none; border-radius: 5px; font-size: 14px; font-weight: bold; cursor: pointer; color: white;";

        let btnEncode = document.createElement('button');
        btnEncode.innerText = "✅ Encode Card";
        btnEncode.style.cssText = baseBtnStyle + " background-color: #4CAF50;";
        btnEncode.onclick = () => { document.body.removeChild(overlay); resolve('encode'); };

        let btnSkip = document.createElement('button');
        btnSkip.innerText = "⏭️ Skip Card";
        btnSkip.style.cssText = baseBtnStyle + " background-color: #FF9800;";
        btnSkip.onclick = () => { document.body.removeChild(overlay); resolve('skip'); };

        let btnStop = document.createElement('button');
        btnStop.innerText = "🛑 Stop";
        btnStop.style.cssText = baseBtnStyle + " background-color: #F44336;";
        btnStop.onclick = () => { document.body.removeChild(overlay); resolve('stop'); };

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
        
        let action = await promptUserAction(`Card ${i + 1} of ${cardsList.length}\n\n👉 PLACE card on encoder for:\n${card.full_string}`);
        
        if (action === 'stop') {
            alert("Automation stopped by user.");
            break; 
        } else if (action === 'skip') {
            continue; 
        }

        // 1. Fill Name
        simulateTyping("name", card.full_string);

        // 2. Fill Dates
        simulateTyping("fullpicker-date-activation", card.start_date_str);
        simulateTyping("fullpicker-date-expiration", card.end_date_str);

        // --- 2.5 THE CHECKBOX SWEEPER (ANGULAR SAFE FIX) ---
        // We must uncheck the previous card's room BEFORE we change the dropdown!
        let allCheckedBoxes = document.querySelectorAll("input[type='checkbox']:checked");
        for (let oldBox of allCheckedBoxes) {
            let boxId = oldBox.getAttribute("id");
            if (boxId) {
                let labelToUncheck = document.querySelector(`label[for='${boxId}']`);
                if (labelToUncheck) {
                    labelToUncheck.scrollIntoView({ behavior: "smooth", block: "center" });
                    
                    // Use the human click simulation so Angular knows to drop it from memory
                    labelToUncheck.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                    labelToUncheck.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                    labelToUncheck.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                }
            }
        }
        // Give Angular half a second to process the unchecking
        await new Promise(r => setTimeout(r, 500)); 
        // ---------------------------------------------------

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

        // 4. Click Room Checkbox
        let labels = document.querySelectorAll("label.field__label--radiocheck");
        let foundBox = false;

        for (let label of labels) {
            let labelText = label.textContent.replace(/\s+/g, ' ').trim();
            
            if (labelText === card.room_checkbox_label || labelText.includes(card.room_checkbox_label)) {
                foundBox = true;
                label.scrollIntoView({ behavior: "smooth", block: "center" });
                
                label.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                label.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                label.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

                let parentLi = label.closest('li');
                if (parentLi) {
                    parentLi.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                    parentLi.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                    parentLi.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                }

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

        // 6. THE SMART WAITER
        let maxWaitTime = 20000; 
        let pollInterval = 500;  
        let timeWaited = 0;
        let successFound = false;

        while (timeWaited < maxWaitTime) {
            let buttons = document.querySelectorAll("button.button-primary");
            
            for (let btn of buttons) {
                if (btn.textContent.trim() === "OK" || btn.innerText.includes("OK")) {
                    btn.click(); 
                    successFound = true;
                    break;
                }
            }
            
            if (successFound) {
                await new Promise(r => setTimeout(r, 500));
                break; 
            }

            await new Promise(r => setTimeout(r, pollInterval));
            timeWaited += pollInterval;
        }

        if (!successFound) {
            console.warn("⚠️ Timed out waiting for the 'Operation completed successfully' popup. Moving to the next card anyway.");
        }
    }
    
    alert("Batch Complete!");
}