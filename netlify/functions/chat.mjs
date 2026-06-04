// netlify/functions/chat.js
// This runs on Netlify's servers — users never see this file
// Your API key is safe here

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { messages, systemPrompt } = JSON.parse(event.body);

    // Call OpenAI API from server side — key never exposed to users
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // API key stored in Netlify environment variable — never in code
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        max_tokens: 800,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.error.message })
      };
    }

    const reply = data.choices?.[0]?.message?.content || "Samahani, jaribu tena.";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // Allow your app to call this function
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ reply }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
