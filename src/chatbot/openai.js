export const getOpenAIResponse = async (messages) => {
  const API_KEY = import.meta.env.VITE_AI_API_KEY || import.meta.env.REACT_APP_AI_API_KEY;
  if (!API_KEY) {
    return { error: 'No API key found in environment variables.' };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages
      })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { error: error.message };
  }
}; 