import axios from 'axios'
import helper from './helper'

export const RSIAccessAxios = axios.create({
  baseURL: process.env.RSI_TOKEN_URL,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})

export const RSIAuthenticate = async () => {
  /*const { Parameter: { Value: clientId } } = await helper.get_ssm_param('CLIENT_ID')
  const { Parameter: { Value: clientSecret } } = await helper.get_ssm_param('CLIENT_SECRET')
  const { Parameter: { Value: grantType } } = await helper.get_ssm_param('CLIENT_GRANT_TYPE')
  const { Parameter: { Value: userName } } = await helper.get_ssm_param('CLIENT_USER_NAME')
  const { Parameter: { Value: password } } = await helper.get_ssm_param('CLIENT_PASSWORD')*/
  const { access_token: accessToken } = await RSIAccessAxios.post('/token', {
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: process.env.CLIENT_GRANT_TYPE,
    username: process.env.CLIENT_USERNAME,
    password: process.env.CLIENT_PASSWORD
  })
  return accessToken
}

RSIAccessAxios.interceptors.request.use(async (opts) => {
  const accessToken = await RSIAuthenticate()
  opts.headers.common['Authorization'] = 'Bearer ' + accessToken
  return opts
}, function (error) {
  return Promise.reject(error)
})

export default RSIAccessAxios
