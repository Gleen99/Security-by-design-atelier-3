document.getElementById('contactForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const formData = new FormData(this);
    const responseData = await sendFormData(formData);
    displayResponse(responseData);
  });

  async function sendFormData(formData) {
    try {
      console.log('Data sent:', formData);
      return { success: true, message: 'Data sent successfully.' };
    } catch (error) {
      console.error('Error sending form data:', error);
      return { success: false, message: 'An error occurred. Please try again later.' };
    }
  }

  function displayResponse(responseData) {
    const responseElement = document.getElementById('response');
    responseElement.textContent = responseData.message;
    if (responseData.success) {
      responseElement.classList.add('success');
    } else {
      responseElement.classList.add('error');
    }
  }