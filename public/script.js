document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('email-input');
    const scanButton = document.getElementById('scan-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const scanResults = document.getElementById('scan-results');
    
    scanButton.addEventListener('click', function() {
        // Get and validate email
        const email = emailInput.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            scanResults.innerHTML = '<div class="error-message">Please enter a valid email address</div>';
            scanResults.classList.remove('hidden');
            return;
        }
        
        // Show loading indicator
        scanResults.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        
        // Call our Netlify function
        fetch('/api/hibp-check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
            scanResults.classList.remove('hidden');
            
            // Check if there was an error
            if (data.error) {
                scanResults.innerHTML = `<div class="error-message">${data.error}</div>`;
                return;
            }
            
            // Process results
            if (Array.isArray(data) && data.length === 0) {
                // No breaches found
                scanResults.innerHTML = `
                    <div class="result-good">
                        <h3>Great News!</h3>
                        <p>We couldn't find your email address in any of the data breaches we checked. This is a good sign, but remember to always maintain good security practices.</p>
                    </div>
                    <div class="source-note">
                        Data provided by <a href="https://haveibeenpwned.com" target="_blank">Have I Been Pwned</a>
                    </div>
                `;
            } else {
                // Breaches found
                const breachCount = data.length;
                let resultsHtml = `
                    <div class="result-bad">
                        <h3>Your Email Was Found in ${breachCount} Data ${breachCount === 1 ? 'Breach' : 'Breaches'}</h3>
                        <p>Your email address appears in the following data ${breachCount === 1 ? 'breach' : 'breaches'}. This means your information may be at risk.</p>
                    </div>
                `;
                
                // Display up to 3 breaches
                data.slice(0, 3).forEach(breach => {
                    const breachDate = new Date(breach.BreachDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    let dataClassesHtml = '';
                    if (breach.DataClasses && breach.DataClasses.length) {
                        dataClassesHtml = '<div class="data-classes">';
                        breach.DataClasses.forEach(dataClass => {
                            dataClassesHtml += `<span class="data-class">${dataClass}</span>`;
                        });
                        dataClassesHtml += '</div>';
                    }
                    
                    resultsHtml += `
                        <div class="breach-item">
                            <div class="breach-logo">
                                <img src="${breach.LogoPath}" alt="${breach.Name} logo" onerror="this.src='https://via.placeholder.com/80x60?text=${breach.Name}'">
                            </div>
                            <div class="breach-details">
                                <h4>${breach.Name}</h4>
                                <div class="breach-meta">Breach date: ${breachDate}</div>
                                <p>${breach.Description}</p>
                                <p><strong>Compromised data:</strong></p>
                                ${dataClassesHtml}
                            </div>
                        </div>
                    `;
                });
                
                // Add "What should you do?" section
                resultsHtml += `
                    <div class="what-to-do">
                        <h3>What Should You Do?</h3>
                        <ul>
                            <li>Change your password for the affected services immediately</li>
                            <li>If you used the same password elsewhere, change those too</li>
                            <li>Enable two-factor authentication where available</li>
                            <li>Monitor your accounts for suspicious activity</li>
                        </ul>
                    </div>
                    <div class="source-note">
                        Data provided by <a href="https://haveibeenpwned.com" target="_blank">Have I Been Pwned</a>
                    </div>
                `;
                
                scanResults.innerHTML = resultsHtml;
            }
        })
        .catch(error => {
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
            scanResults.classList.remove('hidden');
            
            // Show error message
            scanResults.innerHTML = `<div class="error-message">Error checking for breaches: ${error.message}</div>`;
            console.error('Error:', error);
        });
    });
    
    // Allow pressing Enter in the input field to trigger the scan
    emailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            scanButton.click();
        }
    });
});