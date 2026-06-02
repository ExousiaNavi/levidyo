// usernameValidation.js
export async function usernameValidation(username, setUsername) {
  if (!username) return false;

  try {
    const response = await fetch('/validate-username', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();
    // save it
    await setUsername(result.username)
    return result; // expecting { isValid: true/false }
  } catch (error) {
    console.error('Username validation failed:', error);
    return false;
  }
}
