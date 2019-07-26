import axios from 'axios'
import qs from 'querystring'

export const RSIAccessAxiosPublic = axios.create({
  baseURL: process.env.RSI_TOKEN_URL,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})

export const RSIAuthenticate = async () => {
  try {
    const result = await RSIAccessAxiosPublic.post('/token', qs.stringify({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: process.env.CLIENT_GRANT_TYPE,
      username: process.env.CLIENT_USERNAME,
      password: process.env.CLIENT_PASSWORD
    }))
    return result.data
  } catch (error) {
    throw error
  }
}

const rsiAxios = axios.create({
  baseURL: process.env.RSI_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

rsiAxios.interceptors.request.use(async (opts) => {
  const { access_token: accessToken } = await RSIAuthenticate()
  opts.headers.common['Authorization'] = 'Bearer ' + accessToken
  return opts
}, function (error) {
  return Promise.reject(error)
})

export default rsiAxios
