
// Script to test the /api/chat endpoint and debug connection errors
// Usage: node scripts/test-chat.js

async function testChat() {
    console.log('Testing /api/chat endpoint...');
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: "Hola, ¿estás funcionando?" })
        });

        console.log('Status Code:', response.status);

        const data = await response.json();

        if (data.error) {
            console.log('--- ERROR MESSAGE ---');
            console.log("ERROR:", data.error);
            if (data.fullError) console.log("FULL ERROR:", data.fullError);
            console.log('--- END ERROR ---');
        } else {
            console.log('Success! Reply:', data.reply);
        }

    } catch (error) {
        console.error('❌ Network or Fetch Error:', error.message);
    }
}

testChat();
