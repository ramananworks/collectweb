// Tally Prime API Client

class TallyPrimeClient {
    constructor() {
        this.baseUrl = 'http://localhost:9000'; // URL of Tally Prime
    }

    async request(method, endpoint, data) {
        const response = await fetch(`${this.baseUrl}/${endpoint}`, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data),
        });
        return response.json();
    }

    async getData() {
        return this.request('POST', 'data', { /* your payload here */ });
    }

    // Add more methods to interact with the Tally Prime API
}

export default TallyPrimeClient;