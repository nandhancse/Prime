import assert from 'node:assert/strict'
import test from 'node:test'

import { getApiErrors } from './errors.js'


test('API errors stay user-friendly', () => {
  assert.deepEqual(getApiErrors({}, 'Fallback'), {
    form: "Can't connect to PRime. Check your internet connection and try again.",
    retry: true,
  })
  assert.equal(getApiErrors({
    config: { url: 'auth/login/' },
    response: { status: 401, data: { detail: 'technical text' } },
  }, 'Fallback').form, 'Incorrect username or password.')
  assert.equal(getApiErrors({
    config: { url: 'auth/register/' },
    response: { status: 400, data: { username: ['A user with this username already exists.'] } },
  }, 'Fallback').username, 'That username is already taken.')
  assert.equal(getApiErrors({ response: { status: 502 } }, 'Fallback').form,
    "Can't connect to PRime. Check your internet connection and try again.")
})
