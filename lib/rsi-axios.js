import axios from 'axios'
import RSIAccessAxios from '../lib/rsi-access-token'

const rsiAxios = axios.create({
  baseURL: process.env.RSI_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + RSIAccessAxios
  }
})

export default rsiAxios
