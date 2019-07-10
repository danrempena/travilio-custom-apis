import axios from 'axios'
import helper from './helper'

export const RSIAccessAxiosPublic = axios.create({
  baseURL: process.env.RSI_TOKEN_URL,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})

export const RSIAuthenticate = async () => {
  const { Parameter: { Value: clientId } } = await helper.get_ssm_param('CLIENT_ID')
  const { Parameter: { Value: clientSecret } } = await helper.get_ssm_param('CLIENT_SECRET')
  const { Parameter: { Value: grantType } } = await helper.get_ssm_param('CLIENT_GRANT_TYPE')
  const { Parameter: { Value: userName } } = await helper.get_ssm_param('CLIENT_USER_NAME')
  const { Parameter: { Value: password } } = await helper.get_ssm_param('CLIENT_PASSWORD')
  const { access_token: accessToken } = await RSIAccessAxiosPublic.post('/token', {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: grantType,
    username: userName,
    password: password
  })
  return accessToken
}

const rsiAxios = axios.create({
  baseURL: process.env.RSI_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

rsiAxios.interceptors.request.use(async (opts) => {
  let existing = true
  let ssmAccessTokenParam
  try {
    ssmAccessTokenParam = await helper.get_ssm_param('RSI_ACCESS_TOKEN')
  } catch (error) {
    existing = error.code.toLowerCase() !== 'parameternotfound'
    if (existing) throw error
  }
  if (existing &&
    ssmAccessTokenParam &&
    ssmAccessTokenParam.hasOwnProperty('Parameter') &&
    ssmAccessTokenParam.Parameter.Value) {
    if (helper.check_jwt_exp(ssmAccessTokenParam.Parameter.Value)) {
      opts.headers.common['Authorization'] = 'Bearer ' + ssmAccessTokenParam.Parameter.Value
      return opts
    }
  }
  const accessToken = await RSIAuthenticate()
  opts.headers.common['Authorization'] = 'Bearer ' + accessToken
  return opts
}, function (error) {
  return Promise.reject(error)
})

export default rsiAxios
