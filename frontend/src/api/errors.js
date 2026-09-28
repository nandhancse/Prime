export function getApiErrors(error, fallbackMessage) {
  if (!error.response) {
    return {
      form: "Can't connect to PRime. Check your internet connection and try again.",
      retry: true,
    }
  }

  const requestUrl = error.config?.url || ''

  if (error.response.status === 401 && requestUrl.includes('auth/login/')) {
    return { form: 'Incorrect username or password.' }
  }

  if (error.response.status === 404) {
    return { form: "Can't connect to PRime. Check your internet connection and try again.", retry: true }
  }

  if (error.response.status >= 500) {
    return { form: "Can't connect to PRime. Check your internet connection and try again.", retry: true }
  }

  const responseData = error.response?.data

  if (!responseData || typeof responseData !== 'object') {
    return { form: fallbackMessage }
  }

  const errors = {}

  Object.entries(responseData).forEach(([field, value]) => {
    const message = Array.isArray(value) ? value.join(' ') : String(value)

    if (field === 'username' && /already exists/i.test(message)) {
      errors.username = 'That username is already taken.'
      return
    }

    if (field === 'detail' || field === 'message' || field === 'non_field_errors') {
      errors.form = message
    } else {
      errors[field] = message
    }
  })

  if (Object.keys(errors).length === 0) {
    errors.form = fallbackMessage
  }

  return errors
}
