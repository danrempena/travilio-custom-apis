import axios from 'axios'
import helper from './helper'

export const travilioAxiosPublic = axios.create({
    baseURL: process.env.TRAVILIO_TOKEN_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

export const travilioAuthenticate = async () => {
    const { Parameter: { Value: clientId } } = await helper.get_ssm_param('CLIENT_ID')
    const { Parameter: { Value: clientSecret } } = await helper.get_ssm_param('CLIENT_SECRET')
    const { Parameter: { Value: grantType } } = await helper.get_ssm_param('CLIENT_GRANT_TYPE')
    const { Parameter: { Value: userName } } = await helper.get_ssm_param('CLIENT_USER_NAME')
    const { Parameter: { Value: password } } = await helper.get_ssm_param('CLIENT_PASSWORD')
    const { data: { access_token } } = await travilioAxiosPublic.post('/token', {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: grantType,
        username: userName,
        password: password
    })
    return access_token
}
