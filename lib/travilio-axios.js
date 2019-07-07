import axios from 'axios'
import {travilioAuthenticate} from '../lib/travilio-token'

const travilioAxios = axios.create({
    baseURL: process.env.TRAVILIO_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization' : 'Bearer ' + travilioAuthenticate
    }
})

export default travilioAxios
